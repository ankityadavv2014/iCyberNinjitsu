import { ReactNode } from 'react';

export function Table({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-gray-200 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-gray-50">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>;
}

export function TableRow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <tr className={className}>{children}</tr>;
}

export function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3 text-gray-900 ${className}`}>{children}</td>;
}
