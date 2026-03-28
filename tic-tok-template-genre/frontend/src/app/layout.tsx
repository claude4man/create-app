import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TikTok Template Generator',
  description: 'AI-powered TikTok template generator',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
