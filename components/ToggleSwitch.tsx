import React from 'react';

interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, label, description }) => {
  return (
    <div className="flex items-center justify-between p-3 bg-slate-100/50 dark:bg-slate-900/50 rounded-lg">
      <div className="flex-grow pr-4">
        <label htmlFor={id} className="font-semibold text-slate-800 dark:text-gray-200 cursor-pointer">
          {label}
        </label>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      <div className="flex-shrink-0">
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`${
            checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
          } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800`}
        >
          <span
            aria-hidden="true"
            className={`${
              checked ? 'translate-x-5' : 'translate-x-0'
            } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
          />
        </button>
      </div>
    </div>
  );
};

export default ToggleSwitch;
