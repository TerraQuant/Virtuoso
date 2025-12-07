import ExpoModulesCore
import AVFoundation

public class PcmStreamingModule: Module {
    private var audioEngine: AVAudioEngine?
    private var inputNode: AVAudioInputNode?
    private var sampleRate: Double = 44100
    private var bufferSize: UInt32 = 2048
    private var isRunning = false

    // YIN parameters
    private let yinThreshold: Float = 0.15
    private let minFreq: Float = 60.0
    private let maxFreq: Float = 1500.0

    // Onset detection parameters
    private var lastRms: Float = 0.0
    private let onsetThreshold: Float = 0.10
    private var lastOnsetTime: UInt64 = 0
    private let onsetDebounceMs: UInt64 = 120

    // Note names for MIDI conversion
    private let noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

    public func definition() -> ModuleDefinition {
        Name("PcmStreaming")

        Events("PCM_DATA", "NOTE_EVENT", "ONSET_EVENT")

        AsyncFunction("start") { (options: [String: Any]) in
            try self.startCapture(options: options)
        }

        AsyncFunction("stop") {
            self.stopCapture()
        }

        Function("setIntervalMs") { (ms: Int) in
            // Interval adjustment is handled by buffer size
            // This is a no-op for now but could adjust processing frequency
        }
    }

    private func startCapture(options: [String: Any]) throws {
        guard !isRunning else { return }

        // Parse options
        if let sr = options["sampleRate"] as? Double {
            sampleRate = sr
        }
        if let bs = options["bufferSize"] as? Int {
            bufferSize = UInt32(bs)
        }

        // Configure audio session for low latency
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setPreferredSampleRate(sampleRate)
        try audioSession.setPreferredIOBufferDuration(Double(bufferSize) / sampleRate)
        try audioSession.setActive(true)

        // Initialize audio engine
        audioEngine = AVAudioEngine()
        guard let engine = audioEngine else {
            throw NSError(domain: "PcmStreaming", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to create audio engine"])
        }

        inputNode = engine.inputNode
        guard let input = inputNode else {
            throw NSError(domain: "PcmStreaming", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to get input node"])
        }

        let format = input.outputFormat(forBus: 0)
        let actualSampleRate = format.sampleRate
        self.sampleRate = actualSampleRate

        // Install tap for audio processing
        input.installTap(onBus: 0, bufferSize: bufferSize, format: format) { [weak self] (buffer, time) in
            self?.processAudioBuffer(buffer: buffer, time: time)
        }

        try engine.start()
        isRunning = true
    }

    private func stopCapture() {
        guard isRunning else { return }

        inputNode?.removeTap(onBus: 0)
        audioEngine?.stop()

        do {
            try AVAudioSession.sharedInstance().setActive(false)
        } catch {
            // Ignore deactivation errors
        }

        audioEngine = nil
        inputNode = nil
        isRunning = false
    }

    private func processAudioBuffer(buffer: AVAudioPCMBuffer, time: AVAudioTime) {
        guard let floatData = buffer.floatChannelData else { return }

        let frameLength = Int(buffer.frameLength)
        let samples = Array(UnsafeBufferPointer(start: floatData[0], count: frameLength))

        // Emit PCM data (downsample if needed for JS performance)
        let downsampleFactor = max(1, frameLength / 1024)
        var downsampledSamples: [Float] = []
        for i in stride(from: 0, to: frameLength, by: downsampleFactor) {
            downsampledSamples.append(samples[i])
        }

        sendEvent("PCM_DATA", [
            "samples": downsampledSamples.map { Double($0) },
            "sampleRate": Int(sampleRate) / downsampleFactor
        ])

        // Perform YIN pitch detection
        if let pitchResult = detectPitchYIN(samples: samples, sampleRate: Float(sampleRate)) {
            let midi = frequencyToMidi(freq: pitchResult.frequency)
            let expectedFreq = midiToFrequency(midi: midi)
            let centsOff = 1200.0 * log2(Double(pitchResult.frequency) / Double(expectedFreq))

            sendEvent("NOTE_EVENT", [
                "midi": midi,
                "freq": Double(pitchResult.frequency),
                "centsOff": centsOff
            ])
        }

        // Perform onset detection
        detectOnset(samples: samples)
    }

    // MARK: - YIN Pitch Detection

    private struct PitchResult {
        let frequency: Float
        let confidence: Float
    }

    private func detectPitchYIN(samples: [Float], sampleRate: Float) -> PitchResult? {
        let bufferSize = samples.count
        let halfBuffer = bufferSize / 2

        // Calculate RMS to check for silence
        var rms: Float = 0
        for sample in samples {
            rms += sample * sample
        }
        rms = sqrt(rms / Float(bufferSize))
        if rms < 0.01 { return nil }

        // YIN step 1 & 2: Difference function
        var yinBuffer = [Float](repeating: 0, count: halfBuffer)

        for tau in 0..<halfBuffer {
            var sum: Float = 0
            for i in 0..<halfBuffer {
                let delta = samples[i] - samples[i + tau]
                sum += delta * delta
            }
            yinBuffer[tau] = sum
        }

        // YIN step 3: Cumulative mean normalized difference
        yinBuffer[0] = 1.0
        var runningSum: Float = 0
        for tau in 1..<halfBuffer {
            runningSum += yinBuffer[tau]
            if runningSum > 0 {
                yinBuffer[tau] *= Float(tau) / runningSum
            }
        }

        // YIN step 4: Absolute threshold
        let minPeriod = Int(sampleRate / maxFreq)
        let maxPeriod = min(halfBuffer - 1, Int(sampleRate / minFreq))

        var bestTau = -1
        for tau in minPeriod..<maxPeriod {
            if yinBuffer[tau] < yinThreshold {
                // Found a dip below threshold
                while tau + 1 < halfBuffer && yinBuffer[tau + 1] < yinBuffer[tau] {
                    bestTau = tau + 1
                }
                if bestTau == -1 { bestTau = tau }
                break
            }
        }

        if bestTau == -1 {
            // No pitch found below threshold, find minimum
            var minVal: Float = Float.greatestFiniteMagnitude
            for tau in minPeriod..<maxPeriod {
                if yinBuffer[tau] < minVal {
                    minVal = yinBuffer[tau]
                    bestTau = tau
                }
            }
            // Only return if confidence is reasonable
            if minVal > 0.5 { return nil }
        }

        guard bestTau > 0 else { return nil }

        // YIN step 5: Parabolic interpolation
        let betterTau: Float
        if bestTau > 0 && bestTau < halfBuffer - 1 {
            let s0 = yinBuffer[bestTau - 1]
            let s1 = yinBuffer[bestTau]
            let s2 = yinBuffer[bestTau + 1]
            let adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0))
            if adjustment.isFinite {
                betterTau = Float(bestTau) + adjustment
            } else {
                betterTau = Float(bestTau)
            }
        } else {
            betterTau = Float(bestTau)
        }

        let frequency = sampleRate / betterTau
        let confidence = 1.0 - yinBuffer[bestTau]

        // Validate frequency range
        guard frequency >= minFreq && frequency <= maxFreq else { return nil }

        return PitchResult(frequency: frequency, confidence: confidence)
    }

    // MARK: - Onset Detection

    private func detectOnset(samples: [Float]) {
        // Calculate RMS energy
        var rms: Float = 0
        for sample in samples {
            rms += sample * sample
        }
        rms = sqrt(rms / Float(samples.count))

        // Detect onset based on energy increase
        let energyDelta = rms - lastRms
        let now = mach_absolute_time()

        // Convert to milliseconds for debounce comparison
        var timebaseInfo = mach_timebase_info_data_t()
        mach_timebase_info(&timebaseInfo)
        let elapsedNanos = (now - lastOnsetTime) * UInt64(timebaseInfo.numer) / UInt64(timebaseInfo.denom)
        let elapsedMs = elapsedNanos / 1_000_000

        if energyDelta > onsetThreshold && elapsedMs > onsetDebounceMs {
            lastOnsetTime = now

            // Get timestamp in milliseconds since some reference
            let timestamp = Double(now) * Double(timebaseInfo.numer) / Double(timebaseInfo.denom) / 1_000_000.0

            sendEvent("ONSET_EVENT", [
                "ts": Int(timestamp)
            ])
        }

        lastRms = rms
    }

    // MARK: - MIDI Utilities

    private func frequencyToMidi(freq: Float) -> Int {
        return Int(round(69 + 12 * log2(freq / 440.0)))
    }

    private func midiToFrequency(midi: Int) -> Float {
        return 440.0 * pow(2.0, Float(midi - 69) / 12.0)
    }
}
