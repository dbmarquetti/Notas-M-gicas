import React from 'react';
import type { FullAnalysis, TranscriptEntry } from '../types';

interface MeetingNotesProps {
  analysis: FullAnalysis;
}

const MeetingNotes: React.FC<MeetingNotesProps> = ({ analysis }) => {
  const { summary, transcript } = analysis;

  // Group consecutive transcript entries from the same speaker
  const groupTranscript = (entries: TranscriptEntry[]): TranscriptEntry[] => {
    if (!entries || entries.length === 0) {
      return [];
    }

    const grouped: TranscriptEntry[] = [];
    let currentGroup: TranscriptEntry | null = null;

    for (const entry of entries) {
      if (currentGroup && currentGroup.speaker === entry.speaker) {
        // Append text to the current group
        currentGroup.text += `\n${entry.text}`;
      } else {
        // Push the previous group if it exists
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        // Start a new group by creating a copy of the entry
        currentGroup = { ...entry };
      }
    }

    // Push the last group
    if (currentGroup) {
      grouped.push(currentGroup);
    }

    return grouped;
  };

  const groupedTranscript = groupTranscript(transcript);

  return (
    <div className="space-y-8 mt-6 w-full animate-fade-in">
      {/* Summary Section */}
      <section className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-5">Resumo da Reunião</h2>
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-3 border-b border-slate-200 dark:border-slate-600 pb-2">Pontos Chave</h3>
            <ul className="list-disc list-inside space-y-3 text-slate-600 dark:text-gray-300">
              {summary.key_points.map((point, index) => (
                <li key={index} className="leading-relaxed">
                  {point.point}
                  <span className="ml-2 text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full align-middle">
                    {point.timestamp}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-200 mb-3 border-b border-slate-200 dark:border-slate-600 pb-2">Ações e Responsáveis</h3>
            <ul className="space-y-4 text-slate-600 dark:text-gray-300">
              {summary.action_items.map((item, index) => (
                <li key={index} className="flex flex-col">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-slate-700 dark:text-gray-100 flex-grow">{item.action}</span>
                    <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full flex-shrink-0">
                        {item.timestamp}
                    </span>
                  </div>
                  <span className="text-sm text-indigo-500 dark:text-indigo-300 mt-1">Responsável: {item.responsible}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Transcript Section */}
      <section className="bg-white dark:bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-5">Transcrição Completa</h2>
        <div className="max-h-[400px] overflow-y-auto space-y-5 pr-3 -mr-3">
          {groupedTranscript.map((entry, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                    <p className="font-bold text-slate-800 dark:text-gray-200">{entry.speaker}</p>
                    <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full">
                        {entry.timestamp}
                    </span>
                </div>
                <p className="text-slate-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MeetingNotes;
