import { useState, useCallback } from 'react';

interface UseSpeechReturn {
  speak: (text: string) => void;
  speaking: boolean;
  supported: boolean;
  cancel: () => void;
}

export const useSpeech = (): UseSpeechReturn => {
  const [speaking, setSpeaking] = useState(false);
  const supported = 'speechSynthesis' in window;
  
  const speak = useCallback((text: string) => {
    if (!supported) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  }, [supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, speaking, supported, cancel };
};