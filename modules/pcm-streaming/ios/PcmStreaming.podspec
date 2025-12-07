Pod::Spec.new do |s|
  s.name           = 'PcmStreaming'
  s.version        = '1.0.0'
  s.summary        = 'Low-latency PCM audio streaming with YIN pitch detection'
  s.description    = 'Native audio capture module for Virtuoso piano tutor app'
  s.author         = 'Virtuoso'
  s.homepage       = 'https://github.com/virtuoso/pcm-streaming'
  s.platform       = :ios, '13.4'
  s.source         = { :git => 'https://github.com/virtuoso/pcm-streaming.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
