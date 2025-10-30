import React from 'react';
import { SunIcon, MoonIcon, PlusIcon, MinusIcon } from './icons';

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m11-1a2 2 0 00-2-2h-1a2 2 0 00-2 2v1a2 2 0 002 2h1a2 2 0 002-2v-1zM14 5a2 2 0 00-2-2h-1a2 2 0 00-2 2v1a2 2 0 002 2h1a2 2 0 002-2V5z" />
    </svg>
);

interface HeaderProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, toggleTheme, increaseFontSize, decreaseFontSize }) => {
    return (
        <header className="sticky top-0 z-10 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-md w-full transition-colors duration-300">
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                         <SparklesIcon />
                        <div className="ml-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Notas Mágicas
                            </h1>
                            <p className="hidden sm:block text-sm text-indigo-600 dark:text-indigo-300">
                                Suas reuniões, resumidas e organizadas por IA.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
                             <button 
                                onClick={decreaseFontSize}
                                aria-label="Diminuir tamanho da fonte"
                                className="p-1.5 rounded-md text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <MinusIcon className="w-5 h-5" />
                            </button>
                             <button 
                                onClick={increaseFontSize}
                                aria-label="Aumentar tamanho da fonte"
                                className="p-1.5 rounded-md text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                            >
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={toggleTheme}
                            aria-label={`Mudar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
                            className="p-2.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-gray-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                            {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}
