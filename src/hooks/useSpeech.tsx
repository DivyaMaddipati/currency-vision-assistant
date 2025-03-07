
import { useState, useCallback, useRef } from 'react';

interface UseSpeechReturn {
  speak: (text: string, language?: string) => void;
  speaking: boolean;
  supported: boolean;
  cancel: () => void;
}

interface QueueItem {
  text: string;
  language: string;
}

export const useSpeech = (): UseSpeechReturn => {
  const [speaking, setSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const supported = true; // Always true since we're using backend TTS
  const speechQueue = useRef<QueueItem[]>([]);
  const processingQueue = useRef(false);

  const processQueue = useCallback(async () => {
    if (processingQueue.current || speechQueue.current.length === 0) return;
    
    processingQueue.current = true;
    const { text, language } = speechQueue.current[0];
    
    try {
      setSpeaking(true);

      const response = await fetch('http://localhost:5000/api/speak', {
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

      setCurrentAudio(audio);

      await new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          resolve(null);
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          resolve(null);
        };
        
        audio.play().catch(error => {
          console.error('Audio playback error:', error);
          resolve(null);
        });
      });

    } catch (error) {
      console.error('Speech error:', error);
    } finally {
      setSpeaking(false);
      setCurrentAudio(null);
      speechQueue.current.shift(); // Remove the processed item
      processingQueue.current = false;
      
      // Process next item if any
      if (speechQueue.current.length > 0) {
        setTimeout(() => processQueue(), 300); // Small delay between speeches
      }
    }
  }, []);

  const speak = useCallback(async (text: string, language: string = 'en') => {
    if (!text.trim()) return;
    
    // Add to queue
    speechQueue.current.push({ text, language });
    
    // Process queue if not already processing
    if (!processingQueue.current) {
      processQueue();
    }
  }, [processQueue]);

  const cancel = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
    }
    // Clear the queue
    speechQueue.current = [];
    processingQueue.current = false;
    setSpeaking(false);
  }, [currentAudio]);

  return { speak, speaking, supported, cancel };
};
