import React, { useState, useEffect, useCallback } from 'react';
import LiveRecorder from './components/LiveRecorder';
import AudioUploader from './components/AudioUploader';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

type View = 'live' | 'upload';
type Theme = 'light' | 'dark';

const FONT_SIZE_STEP = 1;
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 20;

const App: React.FC = () => {
  const [view, setView] = useState<View>('live');
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme as Theme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [fontSize, setFontSize] = useState<number>(() => {
    const savedSize = localStorage.getItem('fontSize');
    return savedSize ? parseInt(savedSize, 10) : 16; // Default 16px
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.fontSize = `${fontSize}px`;
    localStorage.setItem('fontSize', fontSize.toString());
  }, [fontSize]);


  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontSize(prevSize => Math.min(prevSize + FONT_SIZE_STEP, MAX_FONT_SIZE));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontSize(prevSize => Math.max(prevSize - FONT_SIZE_STEP, MIN_FONT_SIZE));
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-gray-200 font-sans flex flex-col transition-colors duration-300">
      <Header 
        theme={theme}
        toggleTheme={toggleTheme}
        increaseFontSize={increaseFontSize}
        decreaseFontSize={decreaseFontSize}
      />
      <main className="flex-grow container mx-auto px-4 py-8 flex flex-col items-center">
        <div className="w-full max-w-5xl">
          <div className="flex justify-center mb-8 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg shadow-inner">
            <button
              onClick={() => setView('live')}
              className={`w-1/2 py-2.5 px-4 rounded-md text-sm sm:text-base font-semibold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900 ${
                view === 'live' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Gravação ao Vivo
            </button>
            <button
              onClick={() => setView('upload')}
              className={`w-1/2 py-2.5 px-4 rounded-md text-sm sm:text-base font-semibold transition-all duration-300 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 dark:focus-visible:ring-offset-slate-900 ${
                view === 'upload' ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-md' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-300/50 dark:hover:bg-slate-700/50'
              }`}
            >
              Enviar Arquivo
            </button>
          </div>
          
          <div className="transition-opacity duration-500">
            {view === 'live' ? <LiveRecorder /> : <AudioUploader />}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;