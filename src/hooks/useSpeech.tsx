
import { useState, useCallback } from 'react';

interface UseSpeechReturn {
  speak: (text: string, language?: string) => void;
  speaking: boolean;
  supported: boolean;
  cancel: () => void;
}

export const useSpeech = (): UseSpeechReturn => {
  const [speaking, setSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const supported = true; // Always true since we're using backend TTS

  const cancel = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    setSpeaking(false);
  }, [currentAudio]);

  const speak = useCallback(async (text: string, language: string = 'en') => {
    try {
      // Cancel any ongoing speech
      cancel();
      setSpeaking(true);

      const response = await fetch('http://localhost:5000/api/speak', {  // Updated URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, language }),
      });

      if (!response.ok) throw new Error('Speech synthesis failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };

      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
      };

      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error('Speech error:', error);
      setSpeaking(false);
    }
  }, [cancel]);

  return { speak, speaking, supported, cancel };
};
