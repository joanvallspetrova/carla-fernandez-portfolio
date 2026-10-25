import React from 'react';
import { getPortfolioData } from '@/lib/storage';
import PortfolioView from '@/components/PortfolioView';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const data = await getPortfolioData();
  return <PortfolioView initialData={data} />;
}
