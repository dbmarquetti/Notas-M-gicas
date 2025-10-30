import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer className="w-full mt-auto py-6">
            <div className="container mx-auto px-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Construído com React, Tailwind CSS e Gemini API.
                </p>
            </div>
        </footer>
    );
};
