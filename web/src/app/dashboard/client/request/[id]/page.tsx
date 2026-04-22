'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft,
  ArrowRight,
  Clock,
  MapPin,
  Users,
  Star,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
  Zap,
  DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn, formatName } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientRequestDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const requestId = params.id as string;
      
      // Fetch request details
      const { data: reqData, error: reqError } = await supabase
        .from('service_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!reqError && reqData) {
        setRequest(reqData);
      }

      // Fetch proposals with profiles using a join for efficiency
      const { data: propData, error: propError } = await supabase
        .from('proposals')
        .select(`
          *,
          profiles:profiles!proposals_provider_id_fkey (
            full_name,
            avatar_url,
            rating_avg
          )
        `)
        .eq('request_id', requestId);

      if (!propError && propData) {
        setProposals(propData);
      }
      
      setLoading(false);
    };

    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8924A]"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black">Pedido não encontrado</h2>
        <Button onClick={() => router.back()} variant="outline" className="mt-4">Voltar</Button>
      </div>
    );
  }

  const handleStartChat = async (providerId: string) => {
    setLoadingChatId(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('request_id', params.id)
        .eq('provider_id', providerId)
        .maybeSingle();

      if (existingChat) {
        router.push(`/dashboard/chat?id=${existingChat.id}`);
        return;
      }

      // Create new chat
      const { data: newChat, error } = await supabase
        .from('chats')
        .insert({
          request_id: params.id,
          client_id: request.client_id,
          provider_id: providerId
        })
        .select()
        .single();

      if (error) throw error;

      if (newChat) {
        router.push(`/dashboard/chat?id=${newChat.id}`);
      }
    } catch (err: any) {
      console.error('Error starting chat:', err);
      alert('Não foi possível iniciar a conversa. Tente novamente.');
    } finally {
      setLoadingChatId(null);
    }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('service_requests')
      .update({
        title: editTitle,
        description: editDescription
      })
      .eq('id', request.id);

    if (error) {
      alert('Erro ao salvar: ' + error.message);
    } else {
      setRequest({ ...request, title: editTitle, description: editDescription });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const statusLabels: Record<string, string> = {
    'completed': 'Concluído',
    'in_progress': 'Em andamento',
    'open': 'Aguardando Propostas',
  };

  const timeAgo = formatDistanceToNow(new Date(request.created_at), { locale: ptBR, addSuffix: true });

  return (
    <div className="space-y-10 pb-20 max-w-6xl mx-auto">
      {/* Header with Back Action */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()} 
            className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-muted-foreground/60 hover:text-[#B8924A] transition-colors group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Voltar para pedidos
          </button>
          
          <Button 
            variant="outline"
            size="sm"
            onClick={() => {
              setEditTitle(request.title);
              setEditDescription(request.description);
              setIsEditing(true);
            }}
            className="rounded-xl border-border font-black text-[10px] uppercase tracking-widest px-4 h-10 hover:bg-[#B8924A] hover:text-white hover:border-[#B8924A] transition-all"
          >
            Editar Pedido
          </Button>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="primary" className="bg-blue-500/10 text-blue-500 border-none outline-none">{statusLabels[request.status] || request.status}</Badge>
              <div className="flex items-center gap-1.5 text-xs font-black text-muted-foreground/60 uppercase tracking-widest">
                <Clock size={14} />
                <span>{timeAgo}</span>
              </div>
            </div>
            <h1 className="text-4xl lg:text-6xl font-black tracking-tighter leading-none text-foreground">{request.title}</h1>
            <div className="flex items-center gap-2 text-muted-foreground font-bold">
              <MapPin size={18} />
              <span>{request.address_text || 'Localização não informada'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-muted px-6 py-3 rounded-2xl border border-border">
             <div className="flex -space-x-2">
               {proposals.slice(0, 3).map((_, i) => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[8px] font-black">
                   {i + 1}
                 </div>
               ))}
             </div>
             <span className="text-sm font-black italic text-foreground">{proposals.length} {proposals.length === 1 ? 'proposta recebida' : 'propostas recebidas'}</span>
          </div>
        </div>
      </header>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-card border border-white/10 w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl overflow-hidden"
            >
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#B8924A]/5 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <div className="space-y-8 relative z-10">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter">Editar Pedido</h3>
                  <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest opacity-60">Atualize as informações do seu serviço</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Título do Serviço</label>
                    <input 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-muted/50 border border-white/5 h-16 rounded-2xl font-black px-6 text-lg focus:outline-none focus:border-[#B8924A]/50 transition-colors"
                      placeholder="Ex: Reparo de Chuveiro"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-1">Descrição Detalhada</label>
                    <textarea 
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full bg-muted/50 border border-white/5 min-h-[150px] rounded-2xl font-bold p-6 text-foreground/80 focus:outline-none focus:border-[#B8924A]/50 transition-colors resize-none"
                      placeholder="Descreva o que precisa ser feito..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    fullWidth 
                    onClick={() => setIsEditing(false)}
                    className="rounded-2xl h-16 font-black text-xs uppercase tracking-widest"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    fullWidth 
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="bg-[#B8924A] hover:bg-[#A68342] text-white rounded-2xl h-16 font-black text-xs uppercase tracking-widest shadow-xl shadow-[#B8924A]/20"
                  >
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Content: Request Info & Proposals */}
        <main className="lg:col-span-8 space-y-12">
          {/* Detailed Description */}
          <section className="space-y-6">
             <div className="flex items-center gap-4">
               <div className="h-px flex-1 bg-border" />
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Descrição do Pedido</h3>
               <div className="h-px flex-1 bg-border" />
             </div>
             <p className="text-xl font-medium text-foreground/80 leading-relaxed italic border-l-4 border-[#B8924A] pl-8 py-2">
               "{request.description}"
             </p>
          </section>

          {/* Proposals Section */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black tracking-tight text-foreground">Propostas Disponíveis</h2>
              <button className="text-xs font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                Ordernar por <ChevronRight size={14} className="rotate-90" />
              </button>
            </div>

            <div className="space-y-6">
              <AnimatePresence>
                {proposals.length > 0 ? proposals.map((prop, i) => {
                  const propTime = formatDistanceToNow(new Date(prop.created_at), { locale: ptBR, addSuffix: true });
                  
                  return (
                    <motion.div
                      key={prop.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="group overflow-hidden transition-all duration-300 bg-card border-border hover:border-[#B8924A]/30 shadow-sm">
                        <CardContent className="pt-8 px-5 pb-5 md:p-8">
                          <div className="flex flex-col gap-6">
                            {/* Top info: Provider + Price */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-muted flex items-center justify-center font-black text-sm text-[#B8924A] border border-border overflow-hidden shrink-0">
                                  {prop.profiles?.avatar_url ? (
                                    <img src={prop.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    prop.profiles?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2) || 'PR'
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-black tracking-tight text-foreground truncate">{formatName(prop.profiles?.full_name, 'Prestador')}</h4>
                                    <div className="flex items-center gap-1 bg-[#B8924A]/10 px-1.5 py-0.5 rounded-md border border-[#B8924A]/20 shrink-0">
                                      <Star size={10} fill="#B8924A" className="text-[#B8924A]" />
                                      <span className="text-[10px] font-black text-[#B8924A]">{prop.profiles?.rating_avg?.toFixed(1) || '5.0'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">{propTime}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:items-end shrink-0 pl-[60px] sm:pl-0">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-xs font-black text-[#B8924A] italic">R$</span>
                                  <span className="text-3xl font-black tracking-tight text-foreground">{(prop.price || 0).toFixed(2).replace('.', ',')}</span>
                                </div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1">Valor total da proposta</p>
                              </div>
                            </div>

                            {/* Description */}
                            <div className="bg-muted/30 px-5 py-4 rounded-xl border border-border/50">
                               <p className="text-xs font-medium text-foreground/70 leading-relaxed italic line-clamp-3">
                                 "{prop.description || 'Nenhuma observação enviada.'}"
                               </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                               <Button 
                                  variant="outline" 
                                  className="flex-1 h-12 rounded-xl font-black bg-muted/20 border-border text-xs"
                                  onClick={() => handleStartChat(prop.provider_id || prop.prestador_id || prop.user_id || prop.id_prestador)}
                                  disabled={loadingChatId === (prop.provider_id || prop.prestador_id || prop.user_id || prop.id_prestador)}
                                >
                                 <MessageSquare size={16} className="mr-2" /> Chat
                               </Button>
                               <Button variant="primary" className="flex-[2] h-12 rounded-xl text-xs font-black bg-foreground text-background active:scale-95 transition-all">
                                 Aceitar Proposta 
                               </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                }) : (
                  <div className="text-center py-16 bg-muted/30 rounded-[2rem] border border-dashed border-border">
                    <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-widest italic">
                      Nenhuma proposta recebida até o momento.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </main>

        {/* Sidebar: Status & Context */}
        <aside className="lg:col-span-4 space-y-8 sticky top-32">
          <Card className="p-8 border-border bg-card rounded-[2rem] shadow-xl shadow-black/5">
            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-6 italic">Status da Solicitação</h4>
            <div className="space-y-6">
               <div className="flex gap-4 relative">
                 <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                 <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
                    <CheckCircle2 size={12} className="text-green-600" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Concluído</p>
                   <p className="text-xs font-black text-foreground">Publicação do pedido</p>
                 </div>
               </div>
               <div className="flex gap-4 relative">
                 <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                 <div className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 animate-pulse border border-blue-500/20">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-blue-500">Em andamento</p>
                   <p className="text-xs font-black text-foreground">Recebendo propostas</p>
                 </div>
               </div>
               <div className="flex gap-4 grayscale opacity-30">
                 <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Aguardando</p>
                   <p className="text-xs font-black text-foreground">Seleção do prestador</p>
                 </div>
               </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
