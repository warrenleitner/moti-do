'use client';

import React, { ReactNode } from 'react';
import Layout from './Layout';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <Layout>
      {children}
    </Layout>
  );
} 