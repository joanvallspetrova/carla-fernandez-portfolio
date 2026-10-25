import React from 'react';
import { getPortfolioData } from '@/lib/storage';
import PortalView from '@/components/PortalView';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Portal de Gestión | Carla Fernández Oliva',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PortalPage() {
  const data = await getPortfolioData();
  return <PortalView initialData={data} />;
}
