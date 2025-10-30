import React, { useState, useEffect } from 'react';

interface ProcessingIndicatorProps {
  messages: string[];
}

const ProcessingIndicator: React.FC<ProcessingIndicatorProps> = ({ messages }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prevIndex) => (prevIndex + 1) % messages.length);
    }, 3000); // Change message every 3 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <>
      <div className="flex items-center justify-center space-x-1.5 h-10">
        <div className="w-1.5 h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce-bar" style={{ animationDelay: '0s' }}></div>
        <div className="w-1.5 h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce-bar" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-1.5 h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce-bar" style={{ animationDelay: '0.2s' }}></div>
        <div className="w-1.5 h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce-bar" style={{ animationDelay: '0.3s' }}></div>
        <div className="w-1.5 h-full bg-indigo-500 dark:bg-indigo-400 rounded-full animate-bounce-bar" style={{ animationDelay: '0.4s' }}></div>
      </div>
      <div className="mt-5 h-6 flex items-center">
        <p key={currentMessageIndex} className="text-base sm:text-lg text-slate-700 dark:text-gray-300 animate-fade-in">
            {messages[currentMessageIndex]}
        </p>
      </div>
    </>
  );
};

export default ProcessingIndicator;
