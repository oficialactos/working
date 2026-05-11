'use client';

import { useEffect, useState } from 'react';
import { Notification } from '@/components/ui/Notification';

export function ServiceWorker() {
  const [showUpdateNotif, setShowUpdateNotif] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        console.log('SW registrado com sucesso');

        // Check for updates when the window is focused
        window.addEventListener('focus', () => {
          reg.update();
        });

        reg.addEventListener('updatefound', () => {
          const next = reg.installing;
          if (!next) return;

          next.addEventListener('statechange', () => {
            // Trigger notification when the new SW is activated
            if (next.state === 'activated' && navigator.serviceWorker.controller) {
              console.log('Nova versão detectada e ativada!');
              setShowUpdateNotif(true);
              
              // Auto reload after 5 seconds
              setTimeout(() => {
                window.location.reload();
              }, 5000);
            }
          });
        });
      } catch (err) {
        console.error('Erro ao registrar SW:', err);
      }
    };

    registerSW();
  }, []);

  return (
    <Notification 
      show={showUpdateNotif}
      type="success"
      title="Sistema Atualizado"
      message="Uma nova versão foi instalada com sucesso. O app será reiniciado em 5 segundos para aplicar as melhorias."
      onClose={() => setShowUpdateNotif(false)}
      duration={0}
    />
  );
}
