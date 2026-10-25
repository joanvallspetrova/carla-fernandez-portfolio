import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#FFFFFF',
};

export const metadata: Metadata = {
  title: 'CARLA FERNÁNDEZ OLIVA | Model Portfolio & Digitals — Barcelona',
  description:
    'Official model portfolio and natural digitals of Carla Fernández Oliva. Based in Barcelona. Commercial, Editorial & Runway.',
  metadataBase: new URL('https://portfolio.carlafernandezoliva.com'),
  openGraph: {
    title: 'CARLA FERNÁNDEZ OLIVA — Model Portfolio',
    description: 'Height 160 cm · 84-62-90 · Barcelona · Portfolio, Digitals & Comp Card',
    url: 'https://portfolio.carlafernandezoliva.com',
    siteName: 'Carla Fernández Oliva',
    images: [
      {
        url: '/photos/book-01-beauty-closeup.jpg',
        width: 1134,
        height: 1700,
        alt: 'Carla Fernández Oliva',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
      <body className="font-sans bg-white text-[#111111] antialiased selection:bg-[#111111] selection:text-white">
        {children}
      </body>
    </html>
  );
}
