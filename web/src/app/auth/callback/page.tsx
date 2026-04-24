'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const role = session.user.user_metadata?.role;
        router.replace(role === 'provider' ? '/dashboard/provider' : '/dashboard/client');
      } else {
        router.replace('/auth');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#B8924A] border-t-transparent" />
    </div>
  );
}
