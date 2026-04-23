'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Briefcase,
  MapPin,
  ChevronRight,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { format, addDays, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function estimatedDate(createdAt: string, deadlineDays: number | null): string {
  if (!deadlineDays) return 'A combinar';
  const date = addDays(new Date(createdAt), deadlineDays);
  if (isToday(date))    return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, "dd 'de' MMM", { locale: ptBR });
}

function estimatedDateFull(createdAt: string, deadlineDays: number | null): string {
  if (!deadlineDays) return '—';
  return format(addDays(new Date(createdAt), deadlineDays), "EEEE, dd/MM", { locale: ptBR });
}

type Job = {
  id: string;
  status: string;
  created_at: string;
  price: number;
  deadline_days: number | null;
  service_requests: {
    id: string;
    title: string;
    category: string;
    city: string;
    state: string;
    address_text: string | null;
  } | null;
};

export default function ProviderSchedulePage() {
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data, error } = await supabase
        .from('proposals')
        .select(`
          id, status, created_at, price, deadline_days,
          service_requests!request_id ( id, title, category, city, state, address_text )
        `)
        .eq('provider_id', session.user.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setJobs(data as unknown as Job[]);
      }
      setLoading(false);
    };

    fetchJobs();
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-20">

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 rounded-[28px] border border-border bg-card relative overflow-hidden">
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#B8924A]/20 to-transparent" />
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B8924A] shadow-[0_0_6px_#B8924A]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8924A]">Agenda</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground">Minha Agenda</h1>
          <p className="text-muted-foreground font-bold text-sm">
            Trabalhos aceitos aguardando execução.
          </p>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#B8924A]/[0.07] border border-[#B8924A]/20">
          <CalendarDays size={20} className="text-[#B8924A]" />
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Em aberto</p>
            <p className="text-sm font-black text-foreground">
              {loading ? '...' : `${jobs.length} trabalho${jobs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </header>

      {/* Jobs list */}
      <section>
        <h3 className="text-lg font-black text-foreground mb-5 px-1 flex items-center gap-2">
          <Briefcase size={18} className="text-[#B8924A]" /> Trabalhos Aceitos
        </h3>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-muted animate-pulse rounded-[24px] border border-border" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-card rounded-[28px] border-2 border-dashed border-border">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-5">
              <CalendarDays size={28} className="text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-black mb-2 text-foreground">Nenhum trabalho na agenda</h3>
            <p className="text-muted-foreground font-bold text-sm max-w-xs mx-auto">
              Quando uma proposta sua for aceita pelo cliente, o serviço aparecerá aqui.
            </p>
            <Button variant="outline" className="mt-8 px-8" href="/dashboard/provider/feed">
              Ver oportunidades
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, i) => {
              const req     = job.service_requests;
              const dateTag = estimatedDate(job.created_at, job.deadline_days);
              const dateFull = estimatedDateFull(job.created_at, job.deadline_days);

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="group hover:border-[#B8924A]/40 transition-all border-border bg-card overflow-hidden">
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-6">

                        {/* Date chip */}
                        <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#B8924A]/10 border border-[#B8924A]/20 flex flex-col items-center justify-center text-[#B8924A] gap-0.5">
                          <CalendarDays size={18} />
                          <span className="text-[9px] font-black text-center leading-tight px-1">{dateTag}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-green-500/10 border-green-500/20 text-green-400">
                              <CheckCircle2 size={10} /> Aceito
                            </span>
                            {job.deadline_days && (
                              <span className="text-[10px] font-bold text-muted-foreground capitalize">{dateFull}</span>
                            )}
                          </div>
                          <h4 className="text-base font-black text-foreground group-hover:text-[#B8924A] transition-colors truncate">
                            {req?.title ?? 'Serviço aceito'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground font-bold">
                            {req?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {req.address_text ?? `${req.city}, ${req.state}`}
                              </span>
                            )}
                            {job.price > 0 && (
                              <span className="flex items-center gap-1 text-[#B8924A] font-black">
                                <DollarSign size={12} />
                                R$ {Number(job.price).toLocaleString('pt-BR')}
                              </span>
                            )}
                            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/50">
                              {req?.category}
                            </span>
                          </div>
                        </div>

                        {/* CTA */}
                        <Button
                          variant="outline"
                          size="sm"
                          href={`/dashboard/provider/lead/${req?.id}`}
                          className="flex-shrink-0 gap-1 font-black"
                        >
                          Detalhes <ChevronRight size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Accepted date footer */}
      {jobs.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground/40 font-bold uppercase tracking-widest">
          Mostrando {jobs.length} proposta{jobs.length !== 1 ? 's' : ''} aceita{jobs.length !== 1 ? 's' : ''} · atualizado {format(new Date(), "dd/MM 'às' HH:mm", { locale: ptBR })}
        </p>
      )}
    </div>
  );
}
