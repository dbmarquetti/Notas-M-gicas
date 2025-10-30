import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
// FIX: Per coding guidelines, the app must assume the API key is present.
// `hasApiKey` is no longer available, and UI checks for it have been removed.
import { analyzeAudioAndTranscript } from '../services/geminiService';
import type { FullAnalysis, TranscriptEntry, HistoryItem } from '../types';
import MeetingNotes from './MeetingNotes';
import { MicrophoneIcon, StopIcon, DownloadIcon, MarkdownIcon, FileAudioIcon, SettingsIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import HistoryList from './HistoryList';
import ProcessingIndicator from './ProcessingIndicator';
import ToggleSwitch from './ToggleSwitch';


const processingMessages = [
  "Analisando a gravação...",
  "Transcrevendo o áudio com Gemini...",
  "Identificando os pontos-chave da conversa...",
  "Mapeando ações e itens de acompanhamento...",
  "Quase pronto, a mágica está acontecendo!"
];

const LiveRecorder: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysis | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('analysisHistory', []);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    hasRecognitionSupport,
    setError,
  } = useSpeechRecognition();
  
  useEffect(() => {
    if (isListening) {
      setElapsedTime(0);
      intervalRef.current = window.setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isListening]);

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
            const base64String = (reader.result as string)?.split(',')[1];
            if (base64String) {
                resolve(base64String);
            } else {
                reject(new Error("Falha ao converter o áudio para o formato base64."));
            }
        };
        reader.onerror = (error) => reject(error);
    });
  };

  const processRecordedAudio = async (audioBlob: Blob) => {
    if (audioBlob.size === 0) {
        setError("A gravação de áudio está vazia. Nenhuma análise foi realizada.");
        return;
    }
    
    setIsProcessing(true);
    setError(null);
    try {
        const base64Data = await blobToBase64(audioBlob);
        const result = await analyzeAudioAndTranscript(
            { mimeType: audioBlob.type, data: base64Data },
            isDeepAnalysis
        );

        const newHistoryItem: HistoryItem = {
          id: Date.now(),
          title: `Gravação de ${new Date().toLocaleString('pt-BR')}`,
          date: new Date().toISOString(),
          analysis: result,
          source: 'live',
        };
        setHistory(prev => [newHistoryItem, ...prev]);
        setAnalysisResult(result);
    } catch (e: any) {
        console.error("Error analyzing live audio:", e);
        setError(e.message || "Ocorreu um erro ao analisar a gravação.");
        setAnalysisResult(null);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleStart = async () => {
    setAnalysisResult(null);
    setAudioURL(null);
    setError(null);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Use a common MIME type that is widely supported
        const options = { mimeType: 'audio/webm;codecs=opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.log(`${options.mimeType} is not Supported`);
            // Fallback to default
            mediaRecorderRef.current = new MediaRecorder(stream);
        } else {
            mediaRecorderRef.current = new MediaRecorder(stream, options);
        }
        
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: options.mimeType });
            const url = URL.createObjectURL(audioBlob);
            setAudioURL(url);
            stream.getTracks().forEach(track => track.stop()); // Release microphone
            processRecordedAudio(audioBlob);
        };

        mediaRecorderRef.current.start();
        startListening();
    } catch (err) {
        console.error("Error accessing microphone:", err);
        setError("Não foi possível acessar o microfone. Verifique as permissões do navegador.");
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
    }
    stopListening();
  };
  
  const groupTranscript = (entries: TranscriptEntry[]): TranscriptEntry[] => {
    if (!entries || entries.length === 0) return [];
    const grouped: TranscriptEntry[] = [];
    let currentGroup: TranscriptEntry | null = null;
    for (const entry of entries) {
      if (currentGroup && currentGroup.speaker === entry.speaker) {
        currentGroup.text += `\n${entry.text}`;
      } else {
        if (currentGroup) grouped.push(currentGroup);
        currentGroup = { ...entry };
      }
    }
    if (currentGroup) grouped.push(currentGroup);
    return grouped;
  };

  const handleDownload = () => {
    if (!analysisResult) return;
    const groupedTranscript = groupTranscript(analysisResult.transcript);
    const fileContent = `
Notas Mágicas - Análise da Gravação
====================================
Data: ${new Date().toLocaleString('pt-BR')}

--- RESUMO ---

**Pontos Chave:**
${analysisResult.summary.key_points.map(p => `- ${p}`).join('\n')}

**Ações e Responsáveis:**
${analysisResult.summary.action_items.map(i => `- ${i.action} (Responsável: ${i.responsible})`).join('\n')}

--- TRANSCRIÇÃO COMPLETA ---

${groupedTranscript.map(entry => `[${entry.timestamp}] ${entry.speaker}:\n${entry.text}`).join('\n\n')}
    `.trim();

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `notas-magicas-live-${date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadMarkdown = () => {
    if (!analysisResult) return;
    const groupedTranscript = groupTranscript(analysisResult.transcript);
    const fileContent = `
# Notas Mágicas - Análise da Gravação

**Data:** ${new Date().toLocaleString('pt-BR')}

---

## Resumo

### Pontos Chave:
${analysisResult.summary.key_points.map(p => `- ${p}`).join('\n')}

### Ações e Responsáveis:
${analysisResult.summary.action_items.map(i => `- **${i.action}** (Responsável: ${i.responsible})`).join('\n')}

---

## Transcrição Completa

${groupedTranscript.map(entry => `**[${entry.timestamp}] ${entry.speaker}:**\n> ${entry.text.split('\n').join('\n> ')}`).join('\n\n')}
    `.trim();

    const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().slice(0, 10);
    link.download = `notas-magicas-live-${date}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSelectHistory = (id: number) => {
    const item = history.find(h => h.id === id);
    if (item) {
      setAnalysisResult(item.analysis);
      setAudioURL(null); // Audio not available from history
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  const renderContent = () => {
    if (isProcessing) {
      return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-white dark:bg-slate-800/50 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-full min-h-[200px]">
          <ProcessingIndicator messages={processingMessages} />
        </div>
      );
    }
    if (analysisResult) {
      return (
        <div>
            <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                <h2 className="text-xl font-semibold text-slate-800 dark:text-gray-200">Resultados da Análise</h2>
                <div className="flex items-center gap-2 flex-wrap">
                    {audioURL && (
                      <a 
                        href={audioURL}
                        download={`gravacao-live-${new Date().toISOString().slice(0,10)}.webm`}
                        className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 dark:focus-visible:ring-offset-slate-900"
                      >
                        <FileAudioIcon className="w-4 h-4" />
                        Salvar Áudio
                      </a>
                    )}
                    <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 text-sm bg-slate-600 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-900"
                    >
                        <DownloadIcon className="w-4 h-4" />
                        Salvar como TXT
                    </button>
                    <button 
                        onClick={handleDownloadMarkdown}
                        className="flex items-center gap-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900"
                    >
                        <MarkdownIcon className="w-4 h-4" />
                        Exportar como Markdown
                    </button>
                </div>
            </div>
            <MeetingNotes analysis={analysisResult} />
        </div>
      );
    }
    if (isListening || transcript) {
        return (
            <div className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 w-full min-h-[200px]">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-2">Transcrição em Tempo Real (Prévia)</h3>
                <p className="text-slate-600 dark:text-gray-300 whitespace-pre-wrap">{transcript || "Ouvindo..."}</p>
            </div>
        );
    }
    return (
        <div className="text-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/20">
            <MicrophoneIcon className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-gray-200">Pronto para começar?</h2>
            <p className="text-slate-500 dark:text-gray-400 mt-2">Clique no botão abaixo para transcrever e analisar sua reunião ao vivo.</p>
        </div>
    );
  };
  
  if (!hasRecognitionSupport) {
      return (
          <div className="text-center p-8 bg-yellow-100 dark:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200">Navegador não suportado</h2>
              <p className="text-yellow-700 dark:text-yellow-300 mt-2">Seu navegador não suporta a API de Reconhecimento de Fala. Por favor, tente usar o Google Chrome ou outro navegador compatível.</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col items-center w-full">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full flex flex-col items-center border border-slate-200 dark:border-slate-700">
            <div className="w-full max-w-sm mb-6">
                <ToggleSwitch
                    id="deep-analysis-live"
                    checked={isDeepAnalysis}
                    onChange={setIsDeepAnalysis}
                    label="Análise Profunda"
                    description="Usa um modelo de IA mais avançado para insights detalhados. O processamento pode ser mais lento."
                />
            </div>
            <button
                onClick={isListening ? handleStop : handleStart}
                disabled={isProcessing}
                className={`relative flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full text-white font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed ${
                isListening 
                    ? 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500' 
                    : 'bg-indigo-600 hover:bg-indigo-700 focus-visible:ring-indigo-500'
                }`}
                aria-label={isListening ? 'Parar gravação' : 'Iniciar gravação'}
            >
                {isListening && <span className="absolute h-full w-full rounded-full bg-red-600 animate-ping opacity-75"></span>}
                {isListening ? <StopIcon className="w-8 h-8" /> : <MicrophoneIcon className="w-8 h-8" />}
            </button>
            <p className="mt-4 text-slate-600 dark:text-gray-300 text-lg font-medium">
                {isListening ? <span className="font-mono">{formatTime(elapsedTime)}</span> : (isProcessing ? 'Processando...' : 'Clique para iniciar')}
            </p>
            {error && <p className="mt-2 text-red-500 dark:text-red-400">{error}</p>}
        </div>
        <div className="w-full mt-8">
            {renderContent()}
        </div>
        <HistoryList 
            history={history}
            onSelectItem={handleSelectHistory}
            onClearHistory={handleClearHistory}
        />
    </div>
  );
};

export default LiveRecorder;