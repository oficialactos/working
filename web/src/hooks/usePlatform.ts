'use client';

import { useState, useEffect } from 'react';

type Platform = 'ios' | 'android' | 'web';

export interface PlatformInfo {
  isNative: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isWeb: boolean;
  platform: Platform;
}

export function usePlatform(): PlatformInfo {
  const [info, setInfo] = useState<PlatformInfo>({
    isNative: false,
    isIOS: false,
    isAndroid: false,
    isWeb: true,
    platform: 'web',
  });

  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (!cap?.isNative) return;

    const platform = cap.getPlatform() as Platform;
    setInfo({
      isNative: true,
      isIOS: platform === 'ios',
      isAndroid: platform === 'android',
      isWeb: false,
      platform,
    });
  }, []);

  return info;
}
