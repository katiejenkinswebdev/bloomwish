import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

/** Actionable copy per speech error code — codes come from the platform's
 * speech engine (Web Speech API in browsers, native recognizers on device). */
function dictationErrorMessage(code: string, message?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return Platform.OS === 'web'
        ? 'The browser blocked the microphone or speech service. Click the mic/lock icon in the address bar to allow it, and check System Settings → Privacy & Security → Microphone for your browser.'
        : 'Microphone or speech access is blocked. You can enable it in Settings.';
    case 'network':
      return 'The speech service couldn’t be reached — it needs an internet connection. Try again in a moment, or just type.';
    case 'audio-capture':
      return 'No working microphone was found. Check your input device, or just type.';
    case 'language-not-supported':
      return 'This language isn’t supported for dictation here. Typing works everywhere.';
    case 'no-speech':
      return 'Didn’t catch anything — try speaking a little sooner after tapping the mic.';
    default:
      return message || `Dictation hit a snag (${code}). Typing always works.`;
  }
}

export interface DictationState {
  isListening: boolean;
  /** Live transcript, including interim (not-yet-final) words. */
  transcript: string;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * On-device dictation. Audio never leaves the device — only the transcript
 * is kept, and only in memory until the caller consumes it.
 */
export function useDictation(onFinalTranscript: (text: string) => void): DictationState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  // The latest final transcript, delivered on `end` so a single stop yields
  // exactly one append even when multiple result events fire.
  const finalRef = useRef('');

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    setTranscript(text);
    if (event.isFinal) {
      finalRef.current = text;
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
    const finalText = finalRef.current.trim();
    if (finalText) {
      onFinalTranscript(finalText);
    }
    finalRef.current = '';
    setTranscript('');
  });

  useSpeechRecognitionEvent('error', (event) => {
    setIsListening(false);
    if (event.error === 'aborted') return;
    console.warn('[dictation] error event:', event.error, event.message);
    setError(dictationErrorMessage(event.error, event.message));
  });

  const start = useCallback(async () => {
    setError(null);
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setError(
        Platform.OS === 'web'
          ? 'This browser can’t dictate — open the preview in Google Chrome, or just type.'
          : 'Speech recognition isn’t available on this device.'
      );
      return;
    }
    const permissions = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permissions.granted) {
      setError('Microphone access is needed to dictate. You can enable it in Settings.');
      return;
    }
    setTranscript('');
    finalRef.current = '';
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      // Native: keep audio on-device; only transcripts are used. On web the
      // browser's own speech service handles audio, so the flag doesn't apply.
      requiresOnDeviceRecognition: Platform.OS !== 'web',
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { isListening, transcript, error, start, stop };
}
