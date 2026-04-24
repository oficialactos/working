'use client';

import { useEffect } from 'react';

export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.register('/sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        if (!next) return;

        next.addEventListener('statechange', () => {
          if (next.state === 'activated' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    });
  }, []);

  return null;
}
