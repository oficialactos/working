'use client';

import { Compass, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ProviderStats } from './components/ProviderStats';
import { LeadsFeed } from './components/LeadsFeed';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProviderDashboard() {
  const [userName, setUserName] = useState('...');
  const [opportunityCount, setOpportunityCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setUserName(session.user.user_metadata?.full_name?.split(' ')[0] || 'Profissional');

      const { count } = await supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      
      setOpportunityCount(count || 0);
      setLoading(false);
    };

    fetchDashboard();
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-16">

      {/* page header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[28px] border border-border bg-card relative overflow-hidden">
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#B8924A]/20 to-transparent" />

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8924A] shadow-[0_0_6px_#B8924A]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8924A]">Painel Operacional</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Olá, {userName}!</h1>
          <p className="text-muted-foreground font-bold text-sm">
            {opportunityCount > 0 
              ? `Boas-vindas ao seu centro de comando, hoje você tem ${opportunityCount} novas oportunidades.`
              : 'Nenhuma nova oportunidade por enquanto. Continue de olho!'}
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-500/[0.07] border border-green-500/20">
          <div className="relative w-2.5 h-2.5">
            <span className="absolute inset-0 rounded-full bg-green-500" />
            <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-50" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Sua conta está</p>
            <p className="text-sm font-black text-green-400">Ativa e Online</p>
          </div>
        </div>
      </header>

      {/* stats */}
      <section>
        <h3 className="text-lg font-black text-foreground mb-5 px-1">Métricas de Performance</h3>
        <ProviderStats />
      </section>

      {/* leads feed */}
      <section className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-1 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#B8924A]/10 border border-[#B8924A]/20 p-2.5 rounded-xl text-[#B8924A]">
              <Compass size={18} />
            </div>
            <h3 className="text-lg font-black text-foreground">Oportunidades Próximas</h3>
          </div>
          <Link
            href="/dashboard/provider/feed"
            className="flex items-center justify-center sm:justify-end gap-1.5 font-black text-[11px] text-[#B8924A] hover:text-[#d4af71] transition-colors uppercase tracking-widest bg-[#B8924A]/5 sm:bg-transparent py-3 sm:py-0 rounded-xl"
          >
            Ver todas <ChevronRight size={14} />
          </Link>
        </div>
        <LeadsFeed />
      </section>
    </div>
  );
}
