'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

const ClientMapView = dynamic(
  () => import('./components/ClientMapView').then((mod) => mod.ClientMapView),
  { 
    ssr: false,
    loading: () => <div className="w-full h-full bg-muted animate-pulse" />
  }
);

export default function ClientDashboard() {
  return (
    <div className="flex flex-col h-screen overflow-hidden pb-20">
      <div className="flex-1 overflow-hidden">
        <ClientMapView />
      </div>
    </div>
  );
}
