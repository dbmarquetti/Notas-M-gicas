
import React, { useState } from 'react';
import type { HistoryItem } from '../types';
import { HistoryIcon, TrashIcon, MicrophoneIcon, UploadIcon } from './icons';

interface HistoryListProps {
  history: HistoryItem[];
  onSelectItem: (id: number) => void;
  onClearHistory: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ history, onSelectItem, onClearHistory }) => {
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  if (history.length === 0) {
    return null;
  }

  const handleConfirmClear = () => {
    onClearHistory();
    setIsConfirmModalOpen(false);
  };

  return (
    <>
      <section className="mt-12 w-full animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
              <HistoryIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-200">
                  Histórico de Análise
              </h2>
          </div>
          <button
              onClick={() => setIsConfirmModalOpen(true)}
              className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-100 dark:hover:bg-red-900/30"
              aria-label="Limpar histórico"
          >
              <TrashIcon className="w-4 h-4" />
              Limpar
          </button>
        </div>
        <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
          <ul className="divide-y divide-slate-200 dark:divide-slate-700">
            {history.slice().reverse().map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onSelectItem(item.id)}
                  className="w-full text-left p-3 flex justify-between items-center rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {item.source === 'live' ? (
                        <MicrophoneIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    ) : (
                        <UploadIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                    )}
                    <div className="overflow-hidden">
                      <p className="font-semibold text-indigo-700 dark:text-indigo-300 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Analisado em: {new Date(item.date).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-gray-300 ml-4 flex-shrink-0">
                      Visualizar
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsConfirmModalOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">Confirmar Limpeza</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
              Tem certeza de que deseja apagar todo o histórico de análises? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-500"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HistoryList;
