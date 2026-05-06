'use client';

import { MapPin, Clock, MessageSquare, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

export const ActiveServices = () => {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch service requests where this provider has an accepted proposal
      // Join with chats to get the direct chat link
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          proposals!inner(status, provider_id),
          chats(id)
        `)
        .eq('status', 'in_progress')
        .eq('proposals.provider_id', session.user.id)
        .eq('proposals.status', 'accepted')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setServices(data);
      }
      setLoading(false);
    };

    fetchServices();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[1].map(i => (
          <div key={i} className="h-40 bg-muted animate-pulse rounded-[24px] border border-border" />
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return null; // Don't show the section if there are no active services
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 mb-2 px-1">
        <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg text-green-600">
          <CheckCircle2 size={16} />
        </div>
        <h3 className="text-lg font-black text-foreground">Serviços em Andamento</h3>
      </div>
      
      {services.map((service) => {
        const timeAgo = formatDistanceToNow(new Date(service.updated_at || service.created_at), { locale: ptBR, addSuffix: true });
        const chatId = service.chats?.[0]?.id;
        
        return (
          <div
            key={service.id}
            className="group flex flex-col md:flex-row md:items-center gap-5 p-6 rounded-[24px] border border-green-500/20 bg-green-500/[0.02] hover:bg-green-500/[0.04] transition-all duration-300"
          >
            <div className="flex-1 flex flex-col gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 w-fit">
                    {service.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-muted-foreground/60 font-bold text-[9px] uppercase tracking-wide">
                    <Clock size={10} />
                    Atualizado {timeAgo}
                  </div>
                </div>
                <h4 className="text-xl font-black tracking-tight text-foreground leading-tight pt-1">
                  {service.title}
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-muted-foreground font-bold text-xs">
                  <MapPin size={13} />
                  {service.address_text || service.city}
                </div>
              </div>
            </div>

            {/* action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 md:pl-4">
              {chatId && (
                <Button
                  href={`/dashboard/chat?id=${chatId}`}
                  variant="outline"
                  className="h-12 px-6 rounded-2xl font-black text-sm flex items-center gap-2 group/btn border-border bg-card hover:bg-muted"
                >
                  <MessageSquare size={16} />
                  Abrir Chat
                </Button>
              )}
              <Button
                href={`/dashboard/provider/lead/${service.id}`}
                variant="primary"
                className="h-12 px-6 rounded-2xl font-black text-sm flex items-center gap-2 group/btn bg-foreground text-background"
              >
                Detalhes
                <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
