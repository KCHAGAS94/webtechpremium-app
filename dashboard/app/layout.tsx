'use client';

import { ReactNode } from 'react';
import type { Metadata } from 'next';
import './globals.css';
import { ConfirmDialogProvider } from '@/components/confirm-dialog';

export const metadata: Metadata = {
  title: 'WebTech Premium',
  description: 'Reprodutor IPTV rápido, confiável e multiplataforma',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
      </body>
    </html>
  );
}
