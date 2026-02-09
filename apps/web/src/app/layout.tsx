import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Astra',
  description: 'LinkedIn Social Media Automation',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`antialiased ${inter.variable}`}>
      <body className={`min-h-screen m-0 font-sans text-gray-900 bg-gray-50 ${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
