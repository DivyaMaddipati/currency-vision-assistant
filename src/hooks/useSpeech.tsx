
import { useState, useCallback, useRef } from 'react';

interface UseSpeechReturn {
  speak: (text: string, language?: string) => void;
  speaking: boolean;
  supported: boolean;
  cancel: () => void;
}

interface SpeechQueueItem {
  text: string;
  language: string;
}

export const useSpeech = (): UseSpeechReturn => {
  const [speaking, setSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const speechQueue = useRef<SpeechQueueItem[]>([]);
  const processingQueue = useRef(false);
  const supported = true; // Always true since we're using backend TTS

  const cancel = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    // Clear the queue when canceling
    speechQueue.current = [];
    processingQueue.current = false;
    setSpeaking(false);
  }, [currentAudio]);

  // Process the next item in the speech queue
  const processNextInQueue = useCallback(async () => {
    if (speechQueue.current.length === 0) {
      processingQueue.current = false;
      setSpeaking(false);
      return;
    }

    processingQueue.current = true;
    setSpeaking(true);

    const nextItem = speechQueue.current.shift();
    if (!nextItem) return;

    try {
      const response = await fetch('http://localhost:5000/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: nextItem.text, 
          language: nextItem.language 
        }),
      });

      if (!response.ok) throw new Error('Speech synthesis failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        // Process the next item in the queue after this one finishes
        setTimeout(() => processNextInQueue(), 300); // Small delay between announcements
      };

      audio.onerror = () => {
        console.error('Audio playback error');
        URL.revokeObjectURL(audioUrl);
        setCurrentAudio(null);
        // Continue with the next item even if there's an error
        setTimeout(() => processNextInQueue(), 300);
      };

      setCurrentAudio(audio);
      await audio.play();
    } catch (error) {
      console.error('Speech error:', error);
      // Continue with the next item even if there's an error
      setTimeout(() => processNextInQueue(), 300);
    }
  }, []);

  const speak = useCallback(async (text: string, language: string = 'en') => {
    if (!text) return;
    
    console.log(`Adding to speech queue: "${text}" in ${language}`);
    
    // Add the item to the queue
    speechQueue.current.push({ text, language });
    
    // If not already processing the queue, start processing
    if (!processingQueue.current) {
      processNextInQueue();
    }
  }, [processNextInQueue]);

  return { speak, speaking, supported, cancel };
};
