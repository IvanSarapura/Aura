import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientWeb3Provider } from "@/providers/ClientWeb3Provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Web3 App",
  description: "Web3 boilerplate con Next.js, RainbowKit y Wagmi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ClientWeb3Provider>{children}</ClientWeb3Provider>
      </body>
    </html>
  );
}
