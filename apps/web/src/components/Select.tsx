import { SelectHTMLAttributes } from 'react';

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary min-w-[160px] ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}
