import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

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
    if (event.error !== 'aborted') {
      setError(event.message || 'Dictation isn’t available right now.');
    }
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
