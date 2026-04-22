'use client';

import { DollarSign, TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export const ProviderStats = () => {
  const [stats, setStats] = useState({ earnings: 0, rating: 0, visibility: 0 });
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

      // Fetch earnings from payments
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('provider_id', user.id)
        .eq('status', 'released');

      const totalEarnings = payments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // Fetch active proposals count as "visibility" proxy or just show active proposals
      const { count: proposalCount } = await supabase
        .from('proposals')
        .select('*', { count: 'exact', head: true })
        .eq('provider_id', user.id)
        .eq('status', 'pending');

      setStats({
        earnings: totalEarnings,
        rating: profile?.rating_avg || 5.0,
        visibility: proposalCount || 0
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  const displayStats = [
    {
      label: 'Ganhos (Pago Direto)',
      value: loading ? '...' : `R$ ${stats.earnings.toLocaleString('pt-BR')}`,
      icon: DollarSign,
      active: true,
      trend: '+0% hoje',
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
            'group relative flex flex-col gap-8 p-7 rounded-[24px] border transition-all duration-300 overflow-hidden',
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

          <div className="flex items-start justify-between">
            <div className={cn(
              'w-12 h-12 rounded-2xl border flex items-center justify-center transition-transform group-hover:scale-110',
              stat.active
                ? 'bg-[#B8924A]/15 border-[#B8924A]/25 text-[#B8924A]'
                : 'bg-muted border-border text-muted-foreground',
            )}>
              <stat.icon size={20} strokeWidth={2} />
            </div>

            {stat.active && stat.trend && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
                <TrendingUp size={10} />
                {stat.trend}
              </div>
            )}
            {!stat.active && stat.badge && (
              <div className="px-2.5 py-1 rounded-full bg-[#B8924A]/10 border border-[#B8924A]/20 text-[#B8924A] font-black text-[9px] uppercase tracking-wider">
                {stat.badge}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <p className={cn('text-[10px] font-black uppercase tracking-widest', stat.active ? 'text-[#B8924A]/70' : 'text-muted-foreground')}>
              {stat.label}
            </p>
            <p className={cn('text-4xl font-black tracking-tighter', stat.active ? 'text-foreground' : 'text-foreground')}>
              {stat.value}
            </p>
          </div>

          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/[0.015] group-hover:scale-150 transition-transform duration-700" />
        </div>
      ))}
    </div>
  );
};
