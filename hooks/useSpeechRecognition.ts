
import { useState, useRef, useEffect, useCallback } from 'react';

// FIX: Add types for the Web Speech API to resolve TypeScript errors.
// 1. Define `SpeechRecognitionInstance` to create a type for recognition objects,
//    avoiding a name collision with the `SpeechRecognition` variable below.
// 2. Cast `window` to `any` to access `SpeechRecognition` and `webkitSpeechRecognition`,
//    which are not standard properties in TypeScript's default `Window` type.
interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalTranscriptRef = useRef<string>('');

  // A ref is used to track the listening state inside callbacks (like onend)
  // to avoid issues with stale state from closures.
  const isListeningRef = useRef(false);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);


  useEffect(() => {
    if (!SpeechRecognition) {
      setError('A API de Reconhecimento de Fala não é suportada neste navegador.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcriptChunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += transcriptChunk + ' ';
        } else {
          interimTranscript += transcriptChunk;
        }
      }
      setTranscript(finalTranscriptRef.current + interimTranscript);
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      let errorMessage = 'Ocorreu um erro no reconhecimento de fala.';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          errorMessage = 'Permissão para o microfone negada. Por favor, habilite o acesso nas configurações do seu navegador.';
      } else if (event.error === 'no-speech') {
          errorMessage = 'Nenhuma fala foi detectada.';
      } else if (event.error === 'network') {
          errorMessage = 'Erro de rede. Verifique sua conexão com a internet e tente novamente.';
      }
      setError(errorMessage);
      setIsListening(false);
    };

    recognition.onend = () => {
        // Use the ref to get the latest listening state.
        // If we are still supposed to be listening, restart the recognition.
        // This handles cases where recognition stops due to silence.
        if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (err) {
              console.error("Error restarting recognition", err);
            }
        }
    };
    
    return () => {
      // Cleanup: stop recognition when the component unmounts.
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array means this effect runs only once on mount.

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      finalTranscriptRef.current = '';
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting recognition", err);
        setError("Não foi possível iniciar o reconhecimento de fala.");
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    hasRecognitionSupport: !!SpeechRecognition,
    setError,
  };
};
