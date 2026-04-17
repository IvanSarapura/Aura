import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { env } from '@/config/env';
import { ClientWeb3Provider } from '@/providers/ClientWeb3Provider';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const APP_NAME = 'Aura';
const APP_DESCRIPTION =
  "Send USDm with confidence. Verify any wallet's reputation before you pay.";
const APP_URL = 'https://aura.celo.app';

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: APP_NAME,
  },
  twitter: {
    card: 'summary',
    title: APP_NAME,
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0d0d12',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ClientWeb3Provider
          walletConnectProjectId={env.walletConnectProjectId}
          appName={env.appName}
          chainProfile={env.chainProfile}
        >
          {children}
        </ClientWeb3Provider>
      </body>
    </html>
  );
}
