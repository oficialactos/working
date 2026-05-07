'use client';
import { Users, ArrowRight, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const statusStyles: Record<string, string> = {
  'completed':      'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  'in_progress':   'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'open':         'bg-[#B8924A]/10 text-[#B8924A] border-[#B8924A]/20',
};

const statusLabels: Record<string, string> = {
  'completed': 'Concluído',
  'in_progress': 'Em andamento',
  'open': 'Aberto',
};

export const RequestsList = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecent = async () => {
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
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setRequests(data);
      }
      setLoading(false);
    };

    fetchRecent();
  }, []);

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
    <div className="space-y-3">
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

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-[24px] border border-border" />
          ))}
        </div>
      ) : requests.length > 0 ? (
        requests.map((req) => {
          const timeAgo = formatDistanceToNow(new Date(req.created_at), { locale: ptBR, addSuffix: true });
          const proposalCount = req.proposals?.[0]?.count || 0;
          const displayStatus = (req.status === 'open' && proposalCount > 0) ? 'in_progress' : req.status;
          const isMenuOpen = menuOpenId === req.id;

          return (
            <div
              key={req.id}
              className={cn(
                "group relative flex flex-col lg:flex-row lg:items-center rounded-[24px] border border-border bg-card hover:border-[#B8924A]/25 hover:bg-[#B8924A]/[0.02] transition-all duration-300",
                isMenuOpen ? "z-50" : "z-0"
              )}
            >
              <div className="flex-1 p-4 lg:p-5 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('inline-flex items-center rounded border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider', statusStyles[displayStatus] || statusStyles['open'])}>
                      {statusLabels[displayStatus] || 'Aberto'}
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
            </div>
          );
        })
      ) : (
        <div className="text-center py-12">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
            Nenhum pedido recente encontrado.
          </p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="pt-6 text-center">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
            Você chegou ao fim dos seus pedidos recentes.
          </p>
        </div>
      )}
    </div>
  );
};
