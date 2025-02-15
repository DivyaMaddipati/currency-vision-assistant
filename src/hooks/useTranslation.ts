
import { useState, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';

let translator: any = null;

export const useTranslation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeTranslator = async () => {
    if (!translator) {
      try {
        translator = await pipeline(
          'translation',
          'facebook/mbart-large-50-many-to-many-mmt'
        );
      } catch (err) {
        console.error('Failed to load translator:', err);
        setError('Failed to load translator');
      }
    }
  };

  const translate = useCallback(async (text: string, targetLang: string) => {
    if (!translator) {
      setIsLoading(true);
      await initializeTranslator();
      setIsLoading(false);
    }

    if (!translator) {
      return text; // fallback to original text if translation fails
    }

    try {
      const result = await translator(text, {
        src_lang: 'en_XX',
        tgt_lang: targetLang === 'te' ? 'te_IN' : 'en_XX'
      });
      return result[0].translation_text;
    } catch (err) {
      console.error('Translation error:', err);
      return text; // fallback to original text
    }
  }, []);

  return { translate, isLoading, error };
};
