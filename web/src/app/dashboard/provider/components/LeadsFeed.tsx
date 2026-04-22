'use client';

import { MapPin, DollarSign, Clock, Zap, Droplets, Palette, ArrowRight, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function CategoryIcon({ category }: { category: string }) {
  if (category === 'Pintura') return <Palette size={22} />;
  if (category === 'Eletricista') return <Zap size={22} />;
  if (category === 'Encanamento') return <Droplets size={22} />;
  return <Wrench size={22} />;
}

export const LeadsFeed = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeads = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_requests')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(3);

      if (!error && data) {
        setLeads(data);
      }
      setLoading(false);
    };

    fetchLeads();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2].map(i => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-[24px] border border-border" />
          ))}
        </div>
      ) : leads.length > 0 ? (
        leads.map((lead) => {
          const timeAgo = formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: true });
          
          return (
            <div
              key={lead.id}
              className="group flex flex-col md:flex-row md:items-center gap-5 p-6 rounded-[24px] border border-border bg-card hover:border-[#B8924A]/20 hover:bg-accent/5 transition-all duration-300"
            >
              <div className="flex-1 flex flex-col gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-[#B8924A]/10 border border-[#B8924A]/20 text-[#B8924A]">
                      {lead.category}
                    </span>
                    <div className="flex items-center gap-1.5 text-muted-foreground/60 font-bold text-[10px] uppercase tracking-wide whitespace-nowrap shrink-0">
                      <Clock size={10} />
                      {timeAgo}
                    </div>
                  </div>
                  <h4 className="text-xl font-black tracking-tight text-foreground group-hover:text-[#B8924A] transition-colors leading-tight">
                    {lead.title}
                  </h4>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs">
                    <MapPin size={13} />
                    {lead.city || 'Localização não informada'}
                  </div>
                  <div className={cn(
                    'flex items-center gap-1.5 text-[#B8924A] font-black text-xs px-3 py-1 rounded-lg border',
                    'bg-[#B8924A]/[0.06] border-[#B8924A]/20',
                  )}>
                    <DollarSign size={13} />
                    A combinar
                  </div>
                </div>
              </div>

              {/* action */}
              <div className="md:pl-4">
                <Button
                  href={`/dashboard/provider/lead/${lead.id}`}
                  variant="gold-outline"
                  className="h-12 px-6 rounded-2xl font-black text-sm flex items-center gap-2 group/btn md:whitespace-nowrap w-full md:w-auto justify-center"
                >
                  Ver Proposta
                  <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-[24px]">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
            Nenhuma oportunidade nova no momento.
          </p>
        </div>
      )}
    </div>
  );
};
