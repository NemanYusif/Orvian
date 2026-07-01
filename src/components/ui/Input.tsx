import React from 'react';

interface InputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  id?: string;
  className?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

export default function Input({
  label,
  error,
  icon,
  className = '',
  id,
  type = 'text',
  required = false,
  placeholder = '',
  value,
  onChange,
  disabled = false,
  ...props
}: InputProps) {
  return (
    <div className="space-y-1 w-full">
      {label && id && (
        <label htmlFor={id} className="block text-[10px] font-bold text-slate-450 dark:text-zinc-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={id}
          type={type}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          className={`w-full px-4 py-2.5 text-xs border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-855 dark:text-zinc-150 rounded-lg focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            icon ? 'pl-10' : ''
          } ${error ? 'border-red-500 focus:ring-red-500' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}
