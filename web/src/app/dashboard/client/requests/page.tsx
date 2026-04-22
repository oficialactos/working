'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ArrowRight, MessageSquare, PlusCircle,
  Clock, CheckCircle2, Zap, Filter, Search
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect } from 'react';

const statusConfig: Record<string, { label: string; variant: 'gold' | 'success' | 'primary'; dot: string }> = {
  'open':        { label: 'Aberto',        variant: 'gold',    dot: 'bg-[#B8924A]' },
  'in_progress': { label: 'Em andamento',  variant: 'primary', dot: 'bg-blue-400' },
  'completed':   { label: 'Concluído',     variant: 'success', dot: 'bg-green-400' },
  'cancelled':   { label: 'Cancelado',     variant: 'gold',    dot: 'bg-red-400' },
};

const filters = ['Todos', 'open', 'in_progress', 'completed'];

export default function RequestsPage() {
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          proposals:proposals(count)
        `)
        .eq('client_id', session.user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
      setLoading(false);
    };

    fetchRequests();
  }, []);

  const filtered = requests.filter(r => {
    const matchFilter = activeFilter === 'Todos' || r.status === activeFilter;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
                        r.category.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    Todos:          requests.length,
    open:           requests.filter(r => r.status === 'open').length,
    in_progress:    requests.filter(r => r.status === 'in_progress').length,
    completed:      requests.filter(r => r.status === 'completed').length,
  };

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground/50">Área do Cliente</p>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Meus Pedidos</h1>
          <p className="text-muted-foreground font-bold text-sm">{requests.length} pedidos no total</p>
        </div>
        <Button href="/dashboard/client/new" variant="glow" className="hidden sm:flex rounded-2xl px-6 h-12 font-black text-xs uppercase tracking-widest items-center gap-2 shrink-0">
          <PlusCircle size={16} /> Novo Pedido
        </Button>
      </header>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-2xl p-1.5 overflow-x-auto no-scrollbar">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-3 py-2 md:px-4 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap',
                activeFilter === f
                  ? 'bg-[#B8924A] text-white shadow-[0_4px_12px_rgba(184,146,74,0.3)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/80'
              )}
            >
              {f === 'Todos' ? f : (statusConfig[f]?.label || f)}
              <span className={cn(
                'text-[8px] md:text-[9px] px-1.5 py-0.5 rounded-md font-black',
                activeFilter === f ? 'bg-white/20 text-white' : 'bg-muted/80 text-muted-foreground'
              )}>
                {counts[f as keyof typeof counts] || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="flex-1 relative min-w-[200px]">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar pedidos..."
            className="w-full h-full min-h-[48px] pl-10 pr-4 bg-muted/40 border border-border rounded-2xl text-sm font-bold text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-[#B8924A]/40 focus:ring-1 focus:ring-[#B8924A]/30 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-[24px] border border-border" />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-24 space-y-4"
              >
                <div className="w-16 h-16 bg-muted border border-border rounded-3xl flex items-center justify-center mx-auto text-muted-foreground/30">
                  <Filter size={28} />
                </div>
                <p className="text-muted-foreground font-black text-sm uppercase tracking-widest">Nenhum pedido encontrado</p>
                <Link href="/dashboard/client/new" className="inline-flex items-center gap-2 text-[#B8924A] text-xs font-black uppercase tracking-widest hover:text-[#d4af71] transition-colors">
                  <PlusCircle size={14} /> Criar novo pedido
                </Link>
              </motion.div>
            ) : (
              filtered.map((req, i) => {
                const cfg = statusConfig[req.status] || statusConfig['open'];
                const timeAgo = formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: ptBR });
                const proposalCount = req.proposals?.[0]?.count || 0;

                return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.05 }}
                    className="group flex flex-col lg:flex-row lg:items-center rounded-[24px] border border-border bg-card overflow-hidden hover:border-[#B8924A]/25 hover:bg-[#B8924A]/[0.02] transition-all duration-300"
                  >
                    <div className="flex-1 p-7 lg:p-8">
                      <div className="flex items-start justify-between mb-5">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2.5">
                            <span className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
                              cfg.variant === 'gold'    ? 'bg-[#B8924A]/10 text-[#B8924A] border-[#B8924A]/20' :
                              cfg.variant === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            )}>
                              <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                              {cfg.label}
                            </span>
                            <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">{timeAgo}</span>
                          </div>
                          <h4 className="text-xl font-black tracking-tight text-foreground group-hover:text-[#B8924A] transition-colors">
                            {req.title}
                          </h4>
                        </div>
                        <div className="p-2.5 bg-muted border border-border rounded-2xl text-muted-foreground/40 group-hover:bg-[#B8924A]/10 group-hover:border-[#B8924A]/20 group-hover:text-[#B8924A] transition-all">
                          <MessageSquare size={18} />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3 text-[11px] font-black">
                        <div className="flex items-center gap-2 bg-muted border border-border px-3.5 py-2 rounded-xl text-muted-foreground uppercase tracking-widest">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B8924A]" />
                          {req.category}
                        </div>
                        <div className="flex items-center gap-2 bg-muted border border-border px-3.5 py-2 rounded-xl text-[#B8924A] uppercase tracking-widest">
                          <Users size={12} strokeWidth={2.5} />
                          {proposalCount} {proposalCount === 1 ? 'Proposta' : 'Propostas'}
                        </div>
                      </div>
                    </div>

                    <div className="px-7 py-5 lg:p-8 border-t lg:border-t-0 lg:border-l border-border flex items-center justify-between lg:justify-center lg:min-w-[200px]">
                      <span className="lg:hidden text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">Gestão</span>
                      <Button
                        href={`/dashboard/client/request/${req.id}`}
                        variant="glow"
                        className="font-black py-2 px-6 rounded-2xl flex items-center gap-2 group/btn"
                      >
                        Ver detalhes
                        <ArrowRight size={16} strokeWidth={2.5} className="group-hover/btn:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
