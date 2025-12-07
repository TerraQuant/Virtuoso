package expo.modules.pcmstreaming

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.SystemClock
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.concurrent.thread
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.pow
import kotlin.math.round
import kotlin.math.sqrt

class PcmStreamingModule : Module() {
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingThread: Thread? = null

    private var sampleRate = 44100
    private var bufferSize = 2048

    // YIN parameters
    private val yinThreshold = 0.15f
    private val minFreq = 60.0f
    private val maxFreq = 1500.0f

    // Onset detection parameters
    private var lastRms = 0.0f
    private val onsetThreshold = 0.10f
    private var lastOnsetTime = 0L
    private val onsetDebounceMs = 120L

    override fun definition() = ModuleDefinition {
        Name("PcmStreaming")

        Events("PCM_DATA", "NOTE_EVENT", "ONSET_EVENT")

        AsyncFunction("start") { options: Map<String, Any?>, promise: Promise ->
            try {
                startCapture(options)
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("START_ERROR", e.message, e)
            }
        }

        AsyncFunction("stop") { promise: Promise ->
            try {
                stopCapture()
                promise.resolve(null)
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", e.message, e)
            }
        }

        Function("setIntervalMs") { _: Int ->
            // No-op for now - could adjust processing frequency
        }
    }

    private fun startCapture(options: Map<String, Any?>) {
        if (isRecording) return

        val context = appContext.reactContext ?: throw Exception("Context not available")

        // Check permission
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO)
            != PackageManager.PERMISSION_GRANTED) {
            throw Exception("RECORD_AUDIO permission not granted")
        }

        // Parse options
        (options["sampleRate"] as? Number)?.let { sampleRate = it.toInt() }
        (options["bufferSize"] as? Number)?.let { bufferSize = it.toInt() }

        // Calculate minimum buffer size
        val minBufferSize = AudioRecord.getMinBufferSize(
            sampleRate,
            AudioFormat.CHANNEL_IN_MONO,
            AudioFormat.ENCODING_PCM_FLOAT
        )

        if (minBufferSize == AudioRecord.ERROR_BAD_VALUE || minBufferSize == AudioRecord.ERROR) {
            throw Exception("Unable to get min buffer size")
        }

        val actualBufferSize = maxOf(bufferSize * 4, minBufferSize * 2)

        // Create AudioRecord with low-latency settings
        val audioSource = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            MediaRecorder.AudioSource.UNPROCESSED
        } else {
            MediaRecorder.AudioSource.VOICE_RECOGNITION
        }

        val builder = AudioRecord.Builder()
            .setAudioSource(audioSource)
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
                    .build()
            )
            .setBufferSizeInBytes(actualBufferSize)

        // Set low-latency performance mode if available
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder.setPerformanceMode(AudioRecord.PERFORMANCE_MODE_LOW_LATENCY)
        }

        audioRecord = builder.build()

        if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
            audioRecord?.release()
            audioRecord = null
            throw Exception("AudioRecord initialization failed")
        }

        isRecording = true
        audioRecord?.startRecording()

        // Start recording thread
        recordingThread = thread(start = true) {
            val buffer = FloatArray(bufferSize)

            while (isRecording) {
                val readResult = audioRecord?.read(buffer, 0, bufferSize, AudioRecord.READ_BLOCKING) ?: -1

                if (readResult > 0) {
                    processAudioBuffer(buffer.copyOf(readResult))
                } else if (readResult < 0) {
                    break
                }
            }
        }
    }

    private fun stopCapture() {
        isRecording = false

        recordingThread?.join(500)
        recordingThread = null

        audioRecord?.stop()
        audioRecord?.release()
        audioRecord = null
    }

    private fun processAudioBuffer(samples: FloatArray) {
        // Downsample for JS (keep native processing at full rate)
        val downsampleFactor = maxOf(1, samples.size / 1024)
        val downsampled = mutableListOf<Double>()
        for (i in samples.indices step downsampleFactor) {
            downsampled.add(samples[i].toDouble())
        }

        // Emit PCM data
        sendEvent("PCM_DATA", mapOf(
            "samples" to downsampled,
            "sampleRate" to (sampleRate / downsampleFactor)
        ))

        // Perform YIN pitch detection
        detectPitchYIN(samples)?.let { result ->
            val midi = frequencyToMidi(result.frequency)
            val expectedFreq = midiToFrequency(midi)
            val centsOff = 1200.0 * ln(result.frequency / expectedFreq) / ln(2.0)

            sendEvent("NOTE_EVENT", mapOf(
                "midi" to midi,
                "freq" to result.frequency.toDouble(),
                "centsOff" to centsOff
            ))
        }

        // Perform onset detection
        detectOnset(samples)
    }

    // YIN Pitch Detection
    private data class PitchResult(val frequency: Float, val confidence: Float)

    private fun detectPitchYIN(samples: FloatArray): PitchResult? {
        val bufferSize = samples.size
        val halfBuffer = bufferSize / 2

        // Calculate RMS to check for silence
        var rms = 0.0f
        for (sample in samples) {
            rms += sample * sample
        }
        rms = sqrt(rms / bufferSize)
        if (rms < 0.01f) return null

        // YIN step 1 & 2: Difference function
        val yinBuffer = FloatArray(halfBuffer)

        for (tau in 0 until halfBuffer) {
            var sum = 0.0f
            for (i in 0 until halfBuffer) {
                val delta = samples[i] - samples[i + tau]
                sum += delta * delta
            }
            yinBuffer[tau] = sum
        }

        // YIN step 3: Cumulative mean normalized difference
        yinBuffer[0] = 1.0f
        var runningSum = 0.0f
        for (tau in 1 until halfBuffer) {
            runningSum += yinBuffer[tau]
            if (runningSum > 0) {
                yinBuffer[tau] = yinBuffer[tau] * tau / runningSum
            }
        }

        // YIN step 4: Absolute threshold
        val minPeriod = (sampleRate / maxFreq).toInt()
        val maxPeriod = minOf(halfBuffer - 1, (sampleRate / minFreq).toInt())

        var bestTau = -1
        for (tau in minPeriod until maxPeriod) {
            if (yinBuffer[tau] < yinThreshold) {
                var t = tau
                while (t + 1 < halfBuffer && yinBuffer[t + 1] < yinBuffer[t]) {
                    t++
                }
                bestTau = if (bestTau == -1) tau else t
                break
            }
        }

        if (bestTau == -1) {
            // No pitch found below threshold, find minimum
            var minVal = Float.MAX_VALUE
            for (tau in minPeriod until maxPeriod) {
                if (yinBuffer[tau] < minVal) {
                    minVal = yinBuffer[tau]
                    bestTau = tau
                }
            }
            if (minVal > 0.5f) return null
        }

        if (bestTau <= 0) return null

        // YIN step 5: Parabolic interpolation
        val betterTau: Float = if (bestTau > 0 && bestTau < halfBuffer - 1) {
            val s0 = yinBuffer[bestTau - 1]
            val s1 = yinBuffer[bestTau]
            val s2 = yinBuffer[bestTau + 1]
            val adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0))
            if (adjustment.isFinite()) {
                bestTau + adjustment
            } else {
                bestTau.toFloat()
            }
        } else {
            bestTau.toFloat()
        }

        val frequency = sampleRate / betterTau

        // Validate frequency range
        if (frequency < minFreq || frequency > maxFreq) return null

        val confidence = 1.0f - yinBuffer[bestTau]
        return PitchResult(frequency, confidence)
    }

    // Onset Detection
    private fun detectOnset(samples: FloatArray) {
        // Calculate RMS energy
        var rms = 0.0f
        for (sample in samples) {
            rms += sample * sample
        }
        rms = sqrt(rms / samples.size)

        // Detect onset based on energy increase
        val energyDelta = rms - lastRms
        val now = SystemClock.elapsedRealtime()

        if (energyDelta > onsetThreshold && (now - lastOnsetTime) > onsetDebounceMs) {
            lastOnsetTime = now

            sendEvent("ONSET_EVENT", mapOf(
                "ts" to now.toInt()
            ))
        }

        lastRms = rms
    }

    // MIDI Utilities
    private fun frequencyToMidi(freq: Float): Int {
        return round(69 + 12 * ln(freq / 440.0f) / ln(2.0f)).toInt()
    }

    private fun midiToFrequency(midi: Int): Float {
        return 440.0f * 2.0f.pow((midi - 69) / 12.0f)
    }
}
