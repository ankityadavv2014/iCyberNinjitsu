import { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover focus:ring-2 focus:ring-primary focus:ring-offset-2',
  secondary:
    'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
};

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  ...props
}: {
  children: ReactNode;
  variant?: Variant;
  type?: ButtonHTMLAttributes<HTMLButtonElement>['type'];
  disabled?: boolean;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'>) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition duration-150 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
