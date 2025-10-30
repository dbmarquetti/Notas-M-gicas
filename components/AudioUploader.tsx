import React, { useState, useEffect } from 'react';
// FIX: Per coding guidelines, the app must assume the API key is present.
// `hasApiKey` is no longer available, and UI checks for it have been removed.
import { analyzeAudioAndTranscript } from '../services/geminiService';
import type { FullAnalysis, TranscriptEntry, HistoryItem } from '../types';
import MeetingNotes from './MeetingNotes';
import { UploadIcon, DownloadIcon, MarkdownIcon, FileAudioIcon } from './icons';
import { useLocalStorage } from '../hooks/useLocalStorage';
import HistoryList from './HistoryList';
import ProcessingIndicator from './ProcessingIndicator';
import ToggleSwitch from './ToggleSwitch';

const AudioUploader: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<FullAnalysis | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('analysisHistory', []);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isDeepAnalysis, setIsDeepAnalysis] = useState(false);
  // FIX: Removed state for API key availability, as guidelines require us to assume it's always present.

  // FIX: Removed effect to check for API key.

  useEffect(() => {
    // Cleanup function to revoke object URL and prevent memory leaks
    return () => {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    // FIX: Removed API key check to align with guidelines. The app should proceed as if the key is always valid.

    if (!file.type.startsWith('audio/')) {
      setError('Por favor, selecione um arquivo de áudio válido.');
      setFileName(null);
      return;
    }

    if (audioURL) {
        URL.revokeObjectURL(audioURL);
    }
    setAudioURL(URL.createObjectURL(file));

    setError(null);
    setFileName(file.name);
    setIsProcessing(true);
    setAnalysisResult(null);

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.split(',')[1];
        
        if (!base64Data) {
            throw new Error("Não foi possível ler o arquivo de áudio.");
        }

        const result = await analyzeAudioAndTranscript({
          mimeType: file.type,
          data: base64Data,
        }, isDeepAnalysis);
        
        setAnalysisResult(result);
        const newHistoryItem: HistoryItem = {
          id: Date.now(),
          title: file.name,
          date: new Date().toISOString(),
          analysis: result,
          source: 'upload',
        };
        setHistory(prev => [newHistoryItem, ...prev]);

      } catch (e: any) {
        console.error("Error processing audio file:", e);
        setError(e.message || 'Ocorreu um erro ao processar o arquivo. Tente novamente.');
        setAnalysisResult(null);
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
        console.error("FileReader error", reader.error);
        setError("Não foi possível ler o arquivo. Tente novamente.");
        setIsProcessing(false);
    };
    reader.readAsDataURL(file);
  }
  
  const handleReset = () => {
    setAnalysisResult(null);
    setFileName(null);
    setError(null);
    setAudioURL(null);
    const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

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
Notas Mágicas - Análise do Arquivo: ${fileName}
===================================================
Data: ${new Date().toLocaleDateString('pt-BR')}

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
    link.download = `notas-magicas-${fileName?.split('.')[0] || 'analise'}-${date}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadMarkdown = () => {
    if (!analysisResult) return;
    const groupedTranscript = groupTranscript(analysisResult.transcript);
    const fileContent = `
# Notas Mágicas - Análise do Arquivo: ${fileName}

**Data:** ${new Date().toLocaleDateString('pt-BR')}

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
    link.download = `notas-magicas-${fileName?.split('.')[0] || 'analise'}-${date}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, entering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(entering);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e, false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };
  
  const handleSelectHistory = (id: number) => {
    const item = history.find(h => h.id === id);
    if (item) {
      setAnalysisResult(item.analysis);
      setFileName(item.title);
      setError(null);
      setAudioURL(null); // Original audio file not available from history
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    handleReset();
  };

  const renderMainContent = () => {
    if(isProcessing){
        const processingMessages = [
          `Analisando "${fileName}"...`,
          "Transcrevendo o áudio, aguarde um momento...",
          "Extraindo os insights mais importantes...",
          "Compilando o resumo e a transcrição...",
          "O resultado estará pronto em breve!"
        ];
        return (
            <div className="flex flex-col items-center justify-center w-full min-h-[20rem] p-6 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
                <ProcessingIndicator messages={processingMessages} />
            </div>
        );
    }

    if(analysisResult) {
        return (
            <div>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-slate-800 dark:text-gray-200">Resultados para <span className="font-bold text-indigo-600 dark:text-indigo-400">{fileName}</span></h2>
                    <div className="flex items-center gap-2 flex-wrap">
                        {audioURL && fileName && (
                          <a
                            href={audioURL}
                            download={fileName}
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
                        <button onClick={handleReset} className="text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-gray-200 font-medium px-4 py-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500 dark:focus-visible:ring-offset-slate-900">
                            Analisar outro
                        </button>
                    </div>
                </div>
                <MeetingNotes analysis={analysisResult} />
            </div>
        );
    }

    return (
        <div className="w-full p-6 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700">
            <ToggleSwitch
                id="deep-analysis-upload"
                checked={isDeepAnalysis}
                onChange={setIsDeepAnalysis}
                label="Análise Profunda"
                description="Usa um modelo de IA mais avançado para insights detalhados. O processamento pode ser mais lento."
            />
            <div className="mt-6">
                <label
                    htmlFor="audio-upload"
                    onDragEnter={(e) => handleDragEvents(e, true)}
                    onDragLeave={(e) => handleDragEvents(e, false)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    isDragging 
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                    }`}
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                        <UploadIcon className="w-10 h-10 mb-4 text-slate-400 dark:text-slate-500" />
                        
                        <p className="mb-2 text-slate-600 dark:text-slate-400"><span className="font-semibold text-indigo-600 dark:text-indigo-400">Clique para enviar</span> ou arraste e solte</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">Qualquer formato de áudio (MP3, WAV, M4A, etc.)</p>
                        
                    </div>
                    
                    <input id="audio-upload" type="file" className="hidden" accept="audio/*" onChange={handleFileChange} />
                </label>
                {error && <p className="mt-4 text-center text-red-500 dark:text-red-400">{error}</p>}
            </div>
        </div>
    );

  };

  return (
    <div className="w-full max-w-5xl mx-auto">
        {renderMainContent()}
        <HistoryList
            history={history}
            onSelectItem={handleSelectHistory}
            onClearHistory={handleClearHistory}
        />
    </div>
  );
};

export default AudioUploader;