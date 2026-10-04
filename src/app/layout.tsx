import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  title: 'Myanmar AI Social Commerce Hub | FB & TikTok Inbox',
  description: 'Low-cost unified chat centralization for Facebook Messenger and TikTok Shop in Myanmar.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="my">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Myanmar:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
