'use client';
import { Users, ArrowRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

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
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setRequests(data);
      }
      setLoading(false);
    };

    fetchRecent();
  }, []);



  return (
    <div className="space-y-3">
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
          
          // Dynamic status based on proposals
          const displayStatus = (req.status === 'open' && proposalCount > 0) ? 'in_progress' : req.status;

          return (
            <div
              key={req.id}
              className="group flex flex-col lg:flex-row lg:items-center rounded-[24px] border border-border bg-card overflow-hidden hover:border-accent/20 transition-all duration-300"
            >
              <div className="flex-1 p-4 lg:p-5">
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
              </div>

              <div className="px-4 py-2.5 lg:px-6 border-t lg:border-t-0 lg:border-l border-border flex items-center justify-end lg:min-w-[160px] bg-muted/5 lg:bg-transparent">
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
