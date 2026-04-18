import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';
import { env } from '@/config/env';
import { ClientWeb3Provider } from '@/providers/ClientWeb3Provider';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
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
  // next/font variables on <html> so :root tokens in globals.css (e.g. --font-sans) resolve.
  const fontVariables = `${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`;

  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ClientWeb3Provider
          walletConnectProjectId={env.walletConnectProjectId}
          appName={env.appName}
          chainProfile={env.chainProfile}
        >
          {children}
        </ClientWeb3Provider>
        <footer className="site-footer">
          <span>✦ Aura &mdash; Powered by MiniPay &amp; Celo</span>
          <span>&copy; 2026 All rights reserved</span>
        </footer>
      </body>
    </html>
  );
}
