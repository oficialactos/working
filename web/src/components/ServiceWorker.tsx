'use client';

import { useEffect, useState } from 'react';
import { Notification } from '@/components/ui/Notification';

export function ServiceWorker() {
  const [showUpdateNotif, setShowUpdateNotif] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;

        next.addEventListener('statechange', () => {
          if (next.state === 'activated' && navigator.serviceWorker.controller) {
            if (process.env.NODE_ENV !== 'development') {
              // Show notification instead of instant reload
              setShowUpdateNotif(true);
              
              // Reload after 3 seconds so user can see the message
              setTimeout(() => {
                window.location.reload();
              }, 4000);
            }
          }
        });
      });
    });
  }, []);

  return (
    <Notification 
      show={showUpdateNotif}
      type="success"
      title="Atualização Disponível"
      message="Uma nova versão do sistema foi instalada. O app será reiniciado em instantes para aplicar as mudanças."
      onClose={() => setShowUpdateNotif(false)}
      duration={0} // Keep visible until reload
    />
  );
}
