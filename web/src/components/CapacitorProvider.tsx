'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const DASHBOARD_ROOT = '/dashboard';

export function CapacitorProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNative) return;

    let StatusBar: any;
    let App: any;

    const init = async () => {
      try {
        ({ StatusBar } = await import('@capacitor/status-bar'));
        ({ App } = await import('@capacitor/app'));

        // Overlay the status bar so our dark background shows behind it.
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: 'DARK' });
        await StatusBar.setBackgroundColor({ color: '#07090E' });
      } catch {
        // Non-native environment — ignore.
      }

      if (!App) return;

      // Android back button: go back in history, or exit if at a root route.
      App.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        const isRootDashboard =
          pathname === DASHBOARD_ROOT ||
          pathname === `${DASHBOARD_ROOT}/client` ||
          pathname === `${DASHBOARD_ROOT}/provider`;

        if (canGoBack && !isRootDashboard) {
          router.back();
        } else {
          App.exitApp();
        }
      });
    };

    init();

    return () => {
      if (App) App.removeAllListeners();
    };
  }, [pathname, router]);

  return <>{children}</>;
}
