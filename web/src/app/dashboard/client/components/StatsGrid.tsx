'use client';

import { Clock, CheckCircle2, XCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const stats = [
  {
    label: 'Pedidos Ativos',
    value: '03',
    icon: Clock,
    color: 'text-[#B8924A]',
    bg: 'bg-[#B8924A]/10 border-[#B8924A]/20',
    trend: '+1 hoje',
    glow: true,
  },
  {
    label: 'Concluídos',
    value: '12',
    icon: CheckCircle2,
    color: 'text-green-400',
    bg: 'bg-green-500/10 border-green-500/20',
    trend: 'Histórico Total',
    glow: false,
  },
  {
    label: 'Cancelados',
    value: '02',
    icon: XCircle,
    color: 'text-muted-foreground',
    bg: 'bg-muted border-border',
    trend: 'Mês Atual',
    glow: false,
  },
];

export const StatsGrid = ({ initialStats, loading }: { initialStats?: { active: number, completed: number, cancelled: number }, loading?: boolean }) => {
  const displayStats = [
    {
      label: 'Pedidos Ativos',
      value: loading ? '...' : (initialStats?.active || 0).toString().padStart(2, '0'),
      icon: Clock,
      color: 'text-[#B8924A]',
      bg: 'bg-[#B8924A]/10 border-[#B8924A]/20',
      trend: 'Em andamento',
      glow: true,
    },
    {
      label: 'Concluídos',
      value: loading ? '...' : (initialStats?.completed || 0).toString().padStart(2, '0'),
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
      trend: 'Histórico Total',
      glow: false,
    },
    {
      label: 'Cancelados',
      value: loading ? '...' : (initialStats?.cancelled || 0).toString().padStart(2, '0'),
      icon: XCircle,
      color: 'text-muted-foreground',
      bg: 'bg-muted border-border',
      trend: 'Mês Atual',
      glow: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {displayStats.map((stat, i) => (
        <div
          key={i}
          className={cn(
            'group relative overflow-hidden p-7 rounded-[24px] border border-border bg-card transition-all duration-300',
            'hover:border-accent/20 hover:-translate-y-0.5',
            stat.glow && 'hover:shadow-[0_0_30px_rgba(184,146,74,0.08)] hover:border-[#B8924A]/20',
            loading && 'animate-pulse'
          )}
        >
          {stat.glow && (
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#B8924A]/25 to-transparent" />
          )}

          <div className="flex items-start justify-between">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em]">{stat.label}</p>
              <h3 className="text-4xl font-black tracking-tighter text-foreground">{stat.value}</h3>
              <div className="flex items-center gap-2 text-[10px] font-black px-3 py-1.5 rounded-full bg-muted/50 border border-border w-fit text-muted-foreground uppercase tracking-wider">
                <Sparkles size={9} className={stat.glow ? 'text-[#B8924A]' : 'text-muted-foreground/50'} />
                {stat.trend}
              </div>
            </div>

            <div className={cn('w-12 h-12 rounded-2xl border flex items-center justify-center transition-all duration-300 group-hover:scale-110', stat.bg, stat.color)}>
              <stat.icon size={22} strokeWidth={2} />
            </div>
          </div>

          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/[0.015] group-hover:scale-150 transition-transform duration-700" />
        </div>
      ))}
    </div>
  );
};
