import type { Metadata, Viewport } from 'next';
import { Inter, Orbitron } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const tech = Orbitron({
  subsets: ['latin'],
  variable: '--font-tech',
  weight: ['400', '500', '600', '700'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://icyberninjitsu.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'iCyberNinjitsu — Social operations from signal to story',
    template: '%s | iCyberNinjitsu',
  },
  description: 'From signal to story, from draft to every channel. Discover trends, generate governed content, and publish across platforms. Social operations for cybersecurity and beyond.',
  keywords: ['social media operations', 'content moderation', 'social media governance', 'AI content', 'multi-channel publishing', 'trend discovery', 'cybersecurity content', 'social media automation'],
  authors: [{ name: 'iCyberNinjitsu' }],
  creator: 'iCyberNinjitsu',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'iCyberNinjitsu',
    title: 'iCyberNinjitsu — Social operations from signal to story',
    description: 'From signal to story, from draft to every channel. Discover trends, generate governed content, and publish across platforms.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'iCyberNinjitsu — Social operations from signal to story',
    description: 'From signal to story, from draft to every channel. Discover trends, generate governed content, and publish across platforms.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'iCyberNinjitsu',
  applicationCategory: 'BusinessApplication',
  description: 'From signal to story, from draft to every channel. Social operations platform for governed, multi-channel content.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`antialiased ${inter.variable} ${tech.variable}`}>
      <body className={`min-h-screen m-0 font-sans text-gray-900 bg-gray-50 ${inter.className}`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
