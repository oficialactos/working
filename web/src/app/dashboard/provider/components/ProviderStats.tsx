'use client';

import { Briefcase, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const ProviderStats = () => {
  const [stats, setStats] = useState({ completedServices: 0, rating: 0, visibility: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const user = session.user;

      // Fetch rating from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('rating_avg')
        .eq('id', user.id)
        .single();

      // Fetch completed services count
      const { count: completedCount } = await supabase
        .from('proposals')
        .select('id, service_requests!inner(status)', { count: 'exact', head: true })
        .eq('provider_id', user.id)
        .eq('status', 'accepted')
        .eq('service_requests.status', 'completed');

      // Fetch active proposals count as "visibility" proxy or just show active proposals
      const { count: proposalCount } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', user.id)
        .eq('status', 'pending');

      setStats({
        completedServices: completedCount || 0,
        rating: profile?.rating_avg || 5.0,
        visibility: proposalCount || 0
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const displayStats = [
    {
      label: 'Serviços realizados',
      value: loading ? '...' : stats.completedServices.toString().padStart(2, '0'),
      icon: Briefcase,
      active: true,
    },
    {
      label: 'Propostas Ativas',
      value: loading ? '...' : stats.visibility.toString().padStart(2, '0'),
      icon: TrendingUp,
      active: false,
      badge: 'Atividade',
    },
    {
      label: 'Avaliação média',
      value: loading ? '...' : stats.rating.toFixed(1),
      icon: Award,
      active: false,
      badge: 'Top 5%',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {displayStats.map((stat, i) => (
        <div
          key={i}
          className={cn(
            'group relative flex flex-col gap-5 p-5 rounded-[22px] border transition-all duration-300 overflow-hidden',
            'hover:-translate-y-1',
            loading && 'animate-pulse',
            stat.active
              ? 'bg-[#B8924A]/[0.08] border-[#B8924A]/25 hover:border-[#B8924A]/40 hover:shadow-[0_0_40px_rgba(184,146,74,0.12)]'
              : 'bg-card border-border hover:border-accent/20',
          )}
        >
          {stat.active && (
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#B8924A]/40 to-transparent" />
          )}

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110',
                stat.active
                  ? 'bg-[#B8924A]/15 border-[#B8924A]/25 text-[#B8924A]'
                  : 'bg-muted border-border text-muted-foreground',
              )}>
                <stat.icon size={15} strokeWidth={2.5} />
              </div>
              <p className={cn('text-[10px] font-black uppercase tracking-widest leading-none', stat.active ? 'text-[#B8924A]/70' : 'text-muted-foreground')}>
                {stat.label}
              </p>
            </div>
            <p className={cn('text-2xl font-black tracking-tighter text-foreground whitespace-nowrap')}>
              {stat.value}
            </p>
          </div>

          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/[0.015] group-hover:scale-150 transition-transform duration-700" />
        </div>
      ))}
    </div>
  );
};
