import type { Metadata } from 'next';
import { Providers } from './providers';
import './styles.css';

export const metadata: Metadata = {
  title: 'Rice Mill ERP',
  description: 'Rice mill operations, inventory, and management',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
