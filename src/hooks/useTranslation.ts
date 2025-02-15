
import { useState, useCallback } from 'react';
import { pipeline } from '@huggingface/transformers';

let translator: any = null;

export const useTranslation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeTranslator = async () => {
    if (!translator) {
      try {
        setIsLoading(true);
        translator = await pipeline(
          'translation',
          'facebook/mbart-large-50-many-to-many-mmt'
        );
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load translator:', err);
        setError('Failed to load translator');
        setIsLoading(false);
      }
    }
  };

  const translate = useCallback(async (text: string, targetLang: string) => {
    if (!translator) {
      await initializeTranslator();
    }

    if (!translator) {
      return text; // fallback to original text if translation fails
    }

    try {
      let tgt_lang;
      switch (targetLang) {
        case 'te':
          tgt_lang = 'te_IN'; // Telugu
          break;
        case 'hi':
          tgt_lang = 'hi_IN'; // Hindi
          break;
        default:
          tgt_lang = 'en_XX'; // English
      }

      const result = await translator(text, {
        src_lang: 'en_XX',
        tgt_lang: tgt_lang
      });

      console.log('Translation result:', result);
      return result[0].translation_text;
    } catch (err) {
      console.error('Translation error:', err);
      setError('Translation failed');
      return text; // fallback to original text
    }
  }, []);

  return { translate, isLoading, error };
};
