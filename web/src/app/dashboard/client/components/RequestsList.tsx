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

          return (
            <div
              key={req.id}
              className="group flex flex-col lg:flex-row lg:items-center rounded-[24px] border border-border bg-card overflow-hidden hover:border-accent/20 transition-all duration-300"
            >
              <div className="flex-1 p-7 lg:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-col items-start gap-2 mb-1">
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider', statusStyles[req.status] || statusStyles['open'])}>
                        {statusLabels[req.status] || 'Aberto'}
                      </span>
                      <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.15em]">{timeAgo}</span>
                    </div>
                    <h4 className="text-xl font-black tracking-tight text-foreground group-hover:text-[#B8924A] transition-colors leading-tight">
                      {req.title}
                    </h4>
                  </div>

                </div>

                <div className="flex flex-wrap gap-3 text-[11px] font-black">
                  <div className="flex items-center gap-2 bg-muted/50 border border-border px-3.5 py-2 rounded-xl text-muted-foreground uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B8924A]" />
                    {req.category}
                  </div>
                  <div className="flex items-center gap-2 bg-muted/50 border border-border px-3.5 py-2 rounded-xl text-[#B8924A] uppercase tracking-widest">
                    <Users size={12} strokeWidth={2.5} />
                    {proposalCount} {proposalCount === 1 ? 'Proposta' : 'Propostas'}
                  </div>
                </div>
              </div>

              <div className="px-7 py-5 lg:p-8 border-t lg:border-t-0 lg:border-l border-border flex items-center justify-between lg:justify-center lg:min-w-[200px]">
                <span className="lg:hidden text-[10px] font-black text-muted-foreground uppercase tracking-widest">Gestão</span>
                <Button
                  href={`/dashboard/client/request/${req.id}`}
                  variant="glow"
                  className="font-black py-2 px-6 rounded-2xl flex items-center gap-2 group/btn"
                >
                  Ver projeto
                  <ArrowRight size={16} strokeWidth={2.5} className="group-hover/btn:translate-x-1 transition-transform" />
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
