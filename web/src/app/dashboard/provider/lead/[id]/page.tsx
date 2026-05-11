'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Send,
  Star,
  Image as ImageIcon,
  CheckCircle2,
  Zap,
  Navigation,
  Info,
  ChevronRight,
  X,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { cn, formatName } from '@/lib/utils';
import { Notification, NotificationType } from '@/components/ui/Notification';

export default function LeadDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [proposalPrice, setProposalPrice] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestVisit, setRequestVisit] = useState(false);
  const [lead, setLead] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [myProposalStatus, setMyProposalStatus] = useState<string | null>(null); // null = not sent yet
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  // Notification state
  const [notif, setNotif] = useState<{
    show: boolean;
    type: NotificationType;
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showNotification = (type: NotificationType, title: string, message: string) => {
    setNotif({ show: true, type, title, message });
  };

  useEffect(() => {
    const fetchLead = async () => {
      setLoading(true);

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:profiles!client_id(*)
        `)
        .eq('id', params.id)
        .single();

      if (error || !data) {
        setError('Oportunidade não encontrada.');
      } else {
        setLead(data);

        // Check if this provider already has a proposal for this request
        if (currentSession) {
          const { data: existingProposal } = await supabase
            .from('proposals')
            .select('status')
            .eq('request_id', params.id)
            .eq('provider_id', currentSession.user.id)
            .maybeSingle();

          if (existingProposal) {
            setMyProposalStatus(existingProposal.status);
          }
        }
      }
      setLoading(false);
    };

    fetchLead();
  }, [params.id]);

  const handleStartChat = async () => {
    if (!session || !lead) return;
    setLoadingChatId(session.user.id);
    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .eq('request_id', params.id)
        .eq('provider_id', session.user.id)
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
          client_id: lead.client_id,
          provider_id: session.user.id
        })
        .select()
        .single();

      if (error) throw error;

      if (newChat) {
        // Update request status to in_progress
        await supabase
          .from('service_requests')
          .update({ status: 'in_progress' })
          .eq('id', params.id);

        router.push(`/dashboard/chat?id=${newChat.id}`);
      }
    } catch (err: any) {
      console.error('Error starting chat:', err);
      showNotification('error', 'Erro', 'Não foi possível iniciar a conversa. Tente novamente.');
    } finally {
      setLoadingChatId(null);
    }
  };

  useEffect(() => {
    if (lead && requestVisit) {
      const clientName = formatName(lead.client?.full_name).split(' ')[0];
      setDescription(`Olá ${clientName}! Gostaria de agendar uma visita técnica para avaliar o local e passar um orçamento preciso. Quais dias e horários funcionam para você?`);
    } else if (lead && !requestVisit && description.includes('Gostaria de agendar uma visita técnica')) {
      setDescription('');
    }
  }, [requestVisit, lead]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
        return;
      }

      // Check if user is actually a provider
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      // Fallback: If profile is missing, try to use metadata and auto-create profile
      if (!profile || profileError) {
        console.warn('Profile missing or error:', profileError);
        const metadataRole = session.user.user_metadata?.role;
        const fullName = session.user.user_metadata?.full_name || session.user.email;

        if (metadataRole === 'provider') {
          console.info('Auto-syncing missing provider profile...');
          const { error: syncError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              role: 'provider',
              full_name: fullName
            });
          
          if (!syncError) {
            // Also ensure provider_profile exists
            await supabase.from('provider_profiles').upsert({ id: session.user.id });
            profile = { role: 'provider' };
          } else {
            console.error('Failed to sync profile:', syncError);
          }
        } else {
          profile = { role: metadataRole };
        }
      }

      if (profile?.role !== 'provider') {
        showNotification('error', 'Acesso Negado', `Seu perfil está registrado como "${profile?.role || 'não definido'}". Apenas prestadores podem enviar propostas.`);
        setIsSubmitting(false);
        return;
      }

      // Clean price input (replace comma with dot)
      const cleanPrice = proposalPrice.replace(',', '.');
      const numericPrice = requestVisit ? 0 : parseFloat(cleanPrice);

      if (!requestVisit && (isNaN(numericPrice) || numericPrice <= 0)) {
        showNotification('warning', 'Valor Inválido', 'Por favor, insira um valor válido para o orçamento ou solicite uma visita técnica.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase
        .from('proposals')
        .insert({
          request_id: params.id,
          provider_id: session.user.id,
          price: numericPrice,
          deadline_days: 0, // Negotiated via chat
          description: description,
          status: 'pending'
        });

      if (error) {
        console.error('Supabase Insert Error:', error);
        if (error.code === '23505') {
          showNotification('warning', 'Proposta Duplicada', 'Você já enviou uma proposta para este serviço.');
        } else {
          showNotification('error', 'Erro no Envio', `Não foi possível enviar sua proposta: ${error.message || 'Erro de permissão'}`);
        }
        setIsSubmitting(false);
      } else {
        // Update request status to in_progress
        await supabase
          .from('service_requests')
          .update({ status: 'in_progress' })
          .eq('id', params.id);
          
        // --- NEW: Automatically create chat and send the message ---
        try {
          // 1. Create/Get chat
          let chatId: string;
          const { data: existingChat } = await supabase
            .from('chats')
            .select('id')
            .eq('request_id', params.id)
            .eq('provider_id', session.user.id)
            .maybeSingle();

          if (existingChat) {
            chatId = existingChat.id;
          } else {
            const { data: newChat, error: chatError } = await supabase
              .from('chats')
              .insert({
                request_id: params.id,
                client_id: lead.client_id,
                provider_id: session.user.id
              })
              .select()
              .single();
            
            if (chatError) throw chatError;
            chatId = newChat.id;
          }

          // 2. Send the message (the description provided in the proposal)
          if (description.trim()) {
            await supabase
              .from('messages')
              .insert({
                chat_id: chatId,
                sender_id: session.user.id,
                content: description.trim()
              });
          }
        } catch (chatErr) {
          console.error('Error auto-creating chat/message:', chatErr);
        }
        // ---------------------------------------------------------

        showNotification('success', 'Sucesso!', 'Sua proposta foi enviada e uma conversa foi iniciada com o cliente.');
        setTimeout(() => {
          router.push('/dashboard/provider');
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected Error:', err);
      showNotification('error', 'Erro Inesperado', 'Ocorreu um erro ao processar sua solicitação. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#B8924A] border-t-transparent" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-black">{error || 'Algo deu errado'}</h2>
        <Button onClick={() => router.back()}>Voltar para o feed</Button>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: true });

  return (
    <div className="w-full pb-32 px-4 md:px-10">
      {/* Top Bar / Navigation */}
      <nav className="py-6 flex items-center justify-between mb-8">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-[#B8924A] transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao Feed
        </button>

        <div />
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Service Details */}
        <main className="lg:col-span-5 space-y-10">
          <header className="space-y-4">
            <div className="space-y-2">
              <p className="text-[#B8924A] font-black uppercase tracking-[0.2em] text-[10px]">{lead.category}</p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight text-foreground">{lead.title}</h1>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-[11px] font-bold text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-[#B8924A]" />
                <span className="text-foreground">{lead.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>Publicado {timeAgo}</span>
              </div>
            </div>
          </header>

          {/* Description Section */}
          <section className="bg-card border border-border p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#B8924A]/20" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">Descrição do Projeto</h3>
            <p className="text-xl md:text-2xl font-black text-foreground leading-snug tracking-tight italic">
              "{lead.description}"
            </p>
          </section>

          {/* Media Section */}
          {lead.media_urls?.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Fotos e Vídeos</h3>
                <span className="text-[10px] font-bold text-muted-foreground/50">{lead.media_urls.length} arquivos</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {lead.media_urls.map((url: string, i: number) => {
                  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedMedia(url)}
                      className="aspect-square bg-muted rounded-[1.5rem] border border-border overflow-hidden group cursor-pointer hover:border-[#B8924A]/40 transition-all shadow-sm relative"
                    >
                      {isVideo ? (
                        <div className="w-full h-full relative">
                          <video src={url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Zap size={20} className="text-white fill-white" />
                          </div>
                        </div>
                      ) : (
                        <img src={url} alt={`Evidência ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Tips Section */}
          <div className="p-6 rounded-3xl bg-[#B8924A]/5 border border-[#B8924A]/10 flex items-start gap-4">
            <Info size={18} className="text-[#B8924A] shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-[#B8924A]/80 leading-relaxed italic">
              Dica: Combine prazos e materiais diretamente no chat. O pagamento é feito direto pelo cliente, sem taxas da plataforma.
            </p>
          </div>
        </main>

        {/* Right Column: Client & Proposal Form */}
        <aside className="lg:col-span-7 space-y-6 lg:sticky lg:top-8">
          {/* Client Compact Card */}
          <Card className="border border-border bg-card p-6 rounded-[2rem]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center border border-border font-black text-lg text-[#B8924A] overflow-hidden shrink-0">
                {lead.client?.avatar_url ? (
                  <img src={lead.client.avatar_url} alt={formatName(lead.client.full_name)} className="w-full h-full object-cover" />
                ) : (
                  formatName(lead.client?.full_name).charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Solicitante</p>
                <h3 className="text-lg font-black text-foreground truncate leading-tight">{formatName(lead.client?.full_name)}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 bg-[#B8924A]/10 px-1.5 py-0.5 rounded-md">
                    <Star size={10} fill="#B8924A" className="text-[#B8924A]" />
                    <span className="text-[10px] font-black text-[#B8924A]">{lead.client?.rating_avg || '5.0'}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{lead.client?.rating_count || 0} avaliações</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Proposal / Action Card */}
          <Card className={cn(
            "border-2 p-8 rounded-[2.5rem] shadow-2xl shadow-black/5 transition-all",
            myProposalStatus ? "border-border bg-muted/20" : "border-[#B8924A]/20 bg-card"
          )}>
            <div className="space-y-6">
              {lead.status === 'completed' && myProposalStatus !== 'accepted' ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <ShieldCheck size={40} className="text-muted-foreground/30" />
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground">Projeto Encerrado</h2>
                    <p className="text-xs font-bold text-muted-foreground italic">O cliente já selecionou um profissional.</p>
                  </div>
                  <Button variant="outline" fullWidth className="h-12 rounded-xl mt-4" onClick={() => router.push('/dashboard/provider/feed')}>
                    Explorar Feed
                  </Button>
                </div>
              ) : myProposalStatus === 'pending' ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#B8924A]/10 flex items-center justify-center text-[#B8924A] mb-2">
                    <Clock size={28} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground">Proposta em Análise</h2>
                    <p className="text-xs font-bold text-muted-foreground italic">Sua proposta foi enviada. O cliente entrará em contato em breve.</p>
                  </div>
                  <Button variant="outline" fullWidth className="h-12 rounded-xl mt-4" onClick={() => router.push('/dashboard/provider')}>
                    Minhas Propostas
                  </Button>
                </div>
              ) : myProposalStatus === 'accepted' ? (
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600 mb-2">
                    <Award size={32} />
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-xl font-black text-foreground text-green-600">Parabéns!</h2>
                    <p className="text-xs font-bold text-muted-foreground italic">O cliente aceitou sua proposta. Inicie o chat para combinar os detalhes.</p>
                  </div>
                  <Button 
                    variant="primary" 
                    fullWidth 
                    className="h-16 rounded-2xl font-black bg-green-600 hover:bg-green-700 text-white mt-4"
                    onClick={handleStartChat}
                    disabled={loadingChatId !== null}
                  >
                    {loadingChatId ? 'Abrindo...' : 'Falar com Cliente'}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <header className="space-y-1 mb-2">
                    <h2 className="text-xl font-black text-foreground">Enviar Proposta</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#B8924A]">Inicie a negociação agora</p>
                  </header>

                  <div className="space-y-4">
                    <div 
                      onClick={() => setRequestVisit(!requestVisit)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer",
                        requestVisit ? "bg-[#B8924A]/5 border-[#B8924A]" : "bg-muted/30 border-transparent hover:border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin size={18} className={requestVisit ? "text-[#B8924A]" : "text-muted-foreground"} />
                        <div>
                          <p className="text-[11px] font-black text-foreground leading-tight">Solicitar Visita Técnica</p>
                          <p className="text-[9px] font-bold text-muted-foreground italic">Avaliar local antes de dar o preço</p>
                        </div>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        requestVisit ? "border-[#B8924A] bg-[#B8924A]" : "border-muted-foreground/30"
                      )}>
                        {requestVisit && <CheckCircle2 size={10} className="text-white" />}
                      </div>
                    </div>

                    {!requestVisit && (
                      <div className="space-y-3">
                        <div className="relative">
                          <DollarSign size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input 
                            type="number" 
                            placeholder="Valor da Proposta" 
                            className="h-16 pl-12 rounded-2xl bg-muted/50 border-none font-black text-base text-foreground"
                            value={proposalPrice}
                            onChange={(e) => setProposalPrice(e.target.value)}
                            required={!requestVisit}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <textarea 
                      className="w-full bg-muted/50 border-none rounded-[1.5rem] p-5 text-sm font-bold italic min-h-[120px] focus:ring-1 focus:ring-[#B8924A] outline-none transition-all placeholder:text-muted-foreground/40 text-foreground"
                      placeholder={requestVisit 
                        ? `Olá! Gostaria de agendar uma visita técnica...`
                        : `Descreva seu serviço, prazos e se inclui materiais...`
                      }
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>

                  <Button 
                    fullWidth 
                    size="lg" 
                    variant="gold" 
                    isLoading={isSubmitting}
                    className="h-16 rounded-[1.5rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-[#B8924A]/20"
                  >
                    Enviar Proposta
                  </Button>
                </form>
              )}
            </div>
          </Card>

        </aside>
      </div>

      <Notification 
        {...notif} 
        onClose={() => setNotif(prev => ({ ...prev, show: false }))} 
      />

      {/* Full Screen Media Viewer */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedMedia(null)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all z-[210]"
              onClick={() => setSelectedMedia(null)}
            >
              <X size={24} />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-5xl w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedMedia.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                <video 
                  src={selectedMedia} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
                />
              ) : (
                <img 
                  src={selectedMedia} 
                  alt="Full screen view" 
                  className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl shadow-white/5"
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
