import { InputHTMLAttributes } from 'react';

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      {...props}
    />
  );
}
