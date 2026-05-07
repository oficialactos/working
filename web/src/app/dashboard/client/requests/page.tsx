'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ArrowRight, MessageSquare, PlusCircle,
  Clock, CheckCircle2, Zap, Filter, Search, ChevronRight,
  MoreVertical, Pencil, Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
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

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export default function RequestsPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
      setLoading(false);
    };

    fetchRequests();
  }, []);

  // Pre-process requests to dynamically determine status based on proposals
  const processedRequests = requests.map(r => {
    const proposalCount = r.proposals?.[0]?.count || 0;
    // If it's open but has proposals, it's effectively "in_progress" (negotiating)
    if (r.status === 'open' && proposalCount > 0) {
      return { ...r, status: 'in_progress' };
    }
    return r;
  });

  const filtered = processedRequests.filter(r => {
    const matchFilter = activeFilter === 'Todos' || r.status === activeFilter;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
                        r.category.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    Todos:          processedRequests.length,
    open:           processedRequests.filter(r => r.status === 'open').length,
    in_progress:    processedRequests.filter(r => r.status === 'in_progress').length,
    completed:      processedRequests.filter(r => r.status === 'completed').length,
  };


  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    
    const id = confirmDeleteId;
    setDeletingId(id);
    
    // Soft Delete: Atualiza o campo deleted_at ao invés de remover a linha
    const { error } = await supabase
      .from('service_requests')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) {
      setRequests(prev => prev.filter(r => r.id !== id));
      setConfirmDeleteId(null);
    } else {
      alert('Erro ao excluir pedido');
    }
    setDeletingId(null);
    setMenuOpenId(null);
  };

  return (
    <div className="space-y-10 pb-20 max-w-5xl mx-auto">
      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        isLoading={!!deletingId}
        variant="danger"
        title="Excluir Pedido?"
        description="O pedido será removido da sua visualização, mas o histórico de mensagens e dados será mantido para sua segurança."
        confirmLabel="Sim, Excluir"
        cancelLabel="Manter Pedido"
      />
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
        <div className="relative">
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
          {/* scroll hint — mobile only */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-14 bg-gradient-to-l from-card via-card/80 to-transparent rounded-r-2xl flex items-center justify-end pr-2.5 sm:hidden">
            <div className="flex items-center gap-0.5 text-muted-foreground/60">
              <ChevronRight size={13} />
              <ChevronRight size={13} className="-ml-2.5 opacity-50" />
            </div>
          </div>
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
                const isMenuOpen = menuOpenId === req.id;

                return (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "group relative flex flex-col lg:flex-row lg:items-center rounded-[24px] border border-border bg-card hover:border-[#B8924A]/25 hover:bg-[#B8924A]/[0.02] transition-all duration-300",
                      isMenuOpen ? "z-50" : "z-0"
                    )}
                  >
                    <div className="flex-1 p-4 lg:p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'inline-flex items-center rounded border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider',
                            cfg.variant === 'gold'    ? 'bg-[#B8924A]/10 text-[#B8924A] border-[#B8924A]/20' :
                            cfg.variant === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          )}>
                            {cfg.label}
                          </span>
                          <span className="text-[8px] font-black text-muted-foreground/70 uppercase tracking-widest leading-none">
                            {timeAgo}
                          </span>
                        </div>
                        
                        <h4 className="text-base font-black tracking-tight text-foreground group-hover:text-[#B8924A] transition-colors leading-tight truncate">
                          {req.title}
                        </h4>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest pt-0.5">
                          <span className="flex items-center rounded-sm">
                            {req.category}
                          </span>
                          <span className="flex items-center gap-1.5 rounded-sm">
                            <Users size={10} strokeWidth={2.5} className="text-[#B8924A]" />
                            {proposalCount} {proposalCount === 1 ? 'Proposta' : 'Propostas'}
                          </span>
                        </div>
                      </div>

                      {/* Options Menu Button */}
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(isMenuOpen ? null : req.id)}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-lg border transition-all",
                            isMenuOpen 
                              ? "bg-[#B8924A]/10 border-[#B8924A]/30 text-[#B8924A]" 
                              : "bg-muted/20 border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                          )}
                        >
                          <MoreVertical size={16} />
                        </button>

                        <AnimatePresence>
                          {isMenuOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                              >
                                <button
                                  onClick={() => router.push(`/dashboard/client/request/${req.id}`)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-all border-b border-border/10"
                                >
                                  <Pencil size={14} className="text-[#B8924A]" /> Editar Pedido
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(req.id)}
                                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-all"
                                >
                                  <Trash2 size={14} /> {deletingId === req.id ? 'Excluindo...' : 'Excluir'}
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 lg:px-6 border-t lg:border-t-0 lg:border-l border-border flex items-center justify-end lg:min-w-[160px] bg-muted/5 lg:bg-transparent rounded-b-[24px] lg:rounded-b-none lg:rounded-r-[24px]">
                      <Button
                        href={`/dashboard/client/request/${req.id}`}
                        variant="glow"
                        className="font-black h-9 px-4 rounded-md flex items-center gap-2 group/btn text-[10px] uppercase tracking-widest"
                      >
                        Detalhes
                        <ArrowRight size={14} strokeWidth={2.5} className="group-hover/btn:translate-x-1 transition-transform" />
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
