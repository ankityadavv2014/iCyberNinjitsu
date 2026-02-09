import { LabelHTMLAttributes, ReactNode } from 'react';

export function Label({
  children,
  className = '',
  ...props
}: { children: ReactNode } & LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`block text-sm font-medium text-gray-700 mb-1 ${className}`}
      {...props}
    >
      {children}
    </label>
  );
}
