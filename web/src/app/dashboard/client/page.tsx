'use client';
import * as React from 'react';
import { Plus, Package, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StatsGrid } from './components/StatsGrid';
import { RequestsList } from './components/RequestsList';
import { supabase } from '@/lib/supabase';

export default function ClientDashboard() {
  const [userName, setUserName] = React.useState('...');
  const [stats, setStats] = React.useState({ active: 0, completed: 0, cancelled: 0 });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const user = session.user;
      setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Usuário');

      const { data: requests } = await supabase
        .from('service_requests')
        .select('status')
        .eq('client_id', user.id);

      if (requests) {
        setStats({
          active: requests.filter(r => r.status === 'open' || r.status === 'in_progress').length,
          completed: requests.filter(r => r.status === 'completed').length,
          cancelled: requests.filter(r => r.status === 'cancelled').length
        });
      }
      setLoading(false);
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-16">

      {/* page header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[28px] border border-border bg-card relative overflow-hidden">
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#B8924A]/20 to-transparent" />

        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8924A] shadow-[0_0_6px_#B8924A]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8924A]">Espaço do Cliente</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Olá, {userName}!</h1>
          <p className="text-muted-foreground font-bold text-sm">
            {stats.active > 0 
              ? `Você tem ${stats.active} ${stats.active === 1 ? 'serviço' : 'serviços'} ativos. Como podemos ajudar hoje?`
              : 'Tudo tranquilo por aqui. Deseja contratar algo novo?'}
          </p>
        </div>
      </header>

      {/* stats */}
      <section>
        <h3 className="text-lg font-black text-foreground mb-5 px-1">Visão Geral de Pedidos</h3>
        <StatsGrid initialStats={stats} loading={loading} />
      </section>

      {/* requests */}
      <section className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-1 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#B8924A]/10 border border-[#B8924A]/20 p-2.5 rounded-xl text-[#B8924A]">
              <Package size={18} />
            </div>
            <h3 className="text-lg font-black text-foreground">Pedidos Recentes</h3>
          </div>
          <Button
            href="/dashboard/client/new"
            variant="glow"
            className="font-black px-6 rounded-xl text-[10px] sm:text-xs uppercase tracking-widest w-full sm:w-auto"
          >
            <Plus size={16} /> Novo Pedido
          </Button>
        </div>
        <RequestsList />
      </section>
    </div>
  );
}
