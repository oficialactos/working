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
    <div className="space-y-10 pb-20 max-w-6xl mx-auto">
      {/* Navigation Header */}
      <header className="space-y-6">
        <button 
          onClick={() => router.back()} 
          className="flex items-center gap-2 font-black text-sm uppercase tracking-widest text-muted-foreground hover:text-[#B8924A] transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para o feed
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-[#B8924A] text-white flex items-center gap-1.5 rounded-md border-none uppercase font-black text-[10px] tracking-widest">
                <Zap size={14} className="fill-current" />
                {lead.status === 'open' ? 'Aberto' : lead.status === 'in_progress' ? 'Em andamento' : lead.status === 'completed' ? 'Concluído' : lead.status}
              </Badge>
              <div className="flex items-center gap-1.5 text-xs font-black text-green-600 uppercase tracking-widest">
                <CheckCircle2 size={14} />
                <span>Oportunidade Ativa</span>
              </div>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-[0.9]">{lead.title}</h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Main Content: Info & Details */}
        <main className="lg:col-span-8 space-y-10">
          {/* Client Insight Card */}
          <Card className="border border-border bg-muted/40 p-8 rounded-[2rem]">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center border-2 border-[#B8924A] font-black text-xl shadow-xl shadow-black/20 text-[#B8924A] overflow-hidden">
                {lead.client?.avatar_url ? (
                  <img src={lead.client.avatar_url} alt={formatName(lead.client.full_name)} className="w-full h-full object-cover" />
                ) : (
                  formatName(lead.client?.full_name).charAt(0)
                )}
              </div>
              <div className="space-y-4 flex-1 text-center sm:text-left">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black tracking-tight text-foreground">{formatName(lead.client?.full_name)}</h3>
                  <div className="flex items-center justify-center sm:justify-start gap-3">
                    <div className="flex items-center gap-1 bg-background px-2 py-0.5 rounded-md shadow-sm border border-border">
                      <Star size={12} fill="#B8924A" className="text-[#B8924A]" />
                      <span className="text-xs font-black text-foreground">{lead.client?.rating_avg || '5.0'}</span>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">({lead.client?.rating_count || 0} avaliações)</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Location & Time Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-8 border-border bg-card flex items-start gap-4">
                <div className="bg-muted p-3 rounded-2xl text-[#B8924A] shadow-inner border border-border">
                  <MapPin size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Localização</p>
                  <p className="font-bold text-foreground">{lead.address_text || lead.city}</p>
                  <p className="text-sm font-black text-[#B8924A] mt-1 flex items-center gap-1">
                    <Navigation size={12} /> Proximidade Alta
                  </p>
                </div>
             </Card>
             <Card className="p-8 border-border bg-card flex items-start gap-4">
                <div className="bg-muted p-3 rounded-2xl text-muted-foreground shadow-inner border border-border">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Publicado</p>
                  <p className="font-bold text-foreground">{timeAgo}</p>
                  <p className="text-xs text-muted-foreground font-bold mt-1 uppercase tracking-widest italic">Aguardando resposta</p>
                </div>
            </Card>
          </div>

          {/* Description Section */}
          <section className="space-y-6">
             <div className="flex items-center gap-4">
               <div className="h-px w-10 bg-[#B8924A]/40" />
               <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sobre o Serviço</h3>
             </div>
             <p className="text-2xl font-black text-foreground leading-snug tracking-tight italic">
               "{lead.description}"
             </p>
          </section>

          {/* Media Section */}
          {lead.media_urls?.length > 0 && (
            <section className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-widest border-l-4 border-[#B8924A] pl-4">Fotos Compartilhadas</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {lead.media_urls.map((url: string, i: number) => {
                  const isVideo = url.match(/\.(mp4|webm|ogg|mov)$/i);
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedMedia(url)}
                      className="aspect-square bg-muted rounded-[2rem] border-2 border-border overflow-hidden group cursor-pointer hover:border-[#B8924A]/30 transition-all shadow-sm relative"
                    >
                      {isVideo ? (
                        <div className="w-full h-full relative">
                          <video src={url} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                              <Zap size={20} className="text-white fill-white" />
                            </div>
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

          {/* Direct Negotiation Tip */}
          <div className="p-8 rounded-[2rem] bg-muted/50 border border-border flex flex-col md:flex-row items-center gap-6">
             <div className="bg-background p-4 rounded-full shadow-lg text-[#B8924A] border border-[#B8924A]/20">
               <Info size={32} />
             </div>
             <div className="space-y-1 text-center md:text-left">
               <h4 className="text-lg font-black text-foreground tracking-tight">Negociação Direta</h4>
               <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">
                  Combine o valor, forma de pagamento e o <strong>prazo de execução</strong> diretamente com o cliente através do chat. O working não retém valores nem cobra taxas sobre o serviço.
               </p>
             </div>
          </div>
        </main>

        {/* Sidebar: Proposal Form or Locked State */}
        <aside className="lg:col-span-4 sticky top-32 space-y-8">
          <Card className="border-2 border-border bg-card p-8 rounded-[2rem] shadow-2xl shadow-black/10 transition-transform hover:-translate-y-1">
            <div className="space-y-6">

              {/* Locked: Request already completed (another provider was selected) */}
              {lead.status === 'completed' && myProposalStatus !== 'accepted' ? (
                <div className="flex flex-col items-center gap-6 py-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border">
                    <ShieldCheck size={36} className="text-muted-foreground/40" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black tracking-tight text-foreground">Oportunidade Encerrada</h2>
                    <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">
                      O cliente já selecionou um prestador para este serviço. Fique de olho em novas oportunidades!
                    </p>
                  </div>
                  <Button variant="outline" fullWidth className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => router.push('/dashboard/provider/feed')}>
                    Ver Outras Oportunidades
                  </Button>
                </div>
              ) : myProposalStatus === 'pending' ? (
                /* Already submitted a proposal */
                <div className="flex flex-col items-center gap-6 py-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-[#B8924A]/10 flex items-center justify-center border border-[#B8924A]/20">
                    <CheckCircle2 size={36} className="text-[#B8924A]" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black tracking-tight text-foreground">Proposta Enviada</h2>
                    <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">
                      Você já enviou uma proposta para este serviço. Aguarde a resposta do cliente.
                    </p>
                  </div>
                  <Button variant="outline" fullWidth className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => router.push('/dashboard/provider')}>
                    Minha Dashboard
                  </Button>
                </div>
              ) : myProposalStatus === 'accepted' ? (
                /* Proposal was accepted! */
                <div className="flex flex-col items-center gap-6 py-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                    <Award size={36} className="text-green-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black tracking-tight text-foreground">Proposta Aceita!</h2>
                    <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">
                      Parabéns! O cliente aceitou sua proposta. Combine os detalhes finais através do chat.
                    </p>
                  </div>
                  <Button 
                    variant="primary" 
                    fullWidth 
                    className="h-16 rounded-2xl font-black text-xs uppercase tracking-widest bg-green-600 hover:bg-green-700 text-white shadow-xl shadow-green-500/20"
                    onClick={handleStartChat}
                    disabled={loadingChatId !== null}
                  >
                    {loadingChatId ? 'Abrindo Chat...' : 'Abrir Chat com Cliente'}
                  </Button>
                </div>
              ) : myProposalStatus === 'rejected' ? (
                /* Proposal was rejected */
                <div className="flex flex-col items-center gap-6 py-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center border border-border">
                    <ShieldCheck size={36} className="text-muted-foreground/40" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-black tracking-tight text-foreground">Não Selecionado</h2>
                    <p className="text-sm font-bold text-muted-foreground italic leading-relaxed">
                      O cliente optou por outro profissional para este serviço. Continue explorando novas oportunidades!
                    </p>
                  </div>
                  <Button variant="outline" fullWidth className="h-12 rounded-2xl font-black text-xs uppercase tracking-widest" onClick={() => router.push('/dashboard/provider/feed')}>
                    Ver Outras Oportunidades
                  </Button>
                </div>
              ) : (
                /* Open: Show normal proposal form */
                <>
              <header className="space-y-1">
                <h2 className="text-2xl font-black tracking-tight text-foreground">Envie sua Proposta</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Inicie o contato agora</p>
              </header>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <div 
                    onClick={() => setRequestVisit(!requestVisit)}
                    className={cn(
                      "flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer group",
                      requestVisit ? "bg-[#B8924A]/10 border-[#B8924A] shadow-lg shadow-[#B8924A]/10" : "bg-muted/30 border-border hover:border-[#B8924A]/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        requestVisit ? "bg-[#B8924A] text-white" : "bg-muted text-muted-foreground group-hover:text-[#B8924A]"
                      )}>
                        <MapPin size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-foreground">Solicitar Visita Técnica</p>
                        <p className="text-[10px] font-bold text-muted-foreground italic">Não consigo dar preço sem ver</p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                      requestVisit ? "border-[#B8924A] bg-[#B8924A]" : "border-muted-foreground/30"
                    )}>
                      {requestVisit && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                  </div>

                  {!requestVisit && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2"
                    >
                      <Input 
                        label="Valor Total do Orçamento (R$)" 
                        type="number" 
                        placeholder="Ex: 250" 
                        icon={<DollarSign size={20} />}
                        className="h-16 rounded-2xl bg-muted/50 border-border font-black text-xl text-foreground"
                        value={proposalPrice}
                        onChange={(e) => setProposalPrice(e.target.value)}
                        required={!requestVisit}
                      />
                      <p className="text-[10px] font-black text-muted-foreground uppercase text-center px-4 leading-relaxed">
                        Você pode renegociar o valor final após o chat ou visita técnica.
                      </p>
                    </motion.div>
                  )}
                </div>


                <div className="space-y-3 font-bold">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground pl-4">
                    {requestVisit ? 'Mensagem para Agendamento' : 'Descrição da Proposta'}
                  </label>
                  <textarea 
                    className="w-full bg-muted/50 border border-border rounded-[2rem] p-6 text-sm font-bold italic min-h-[160px] focus:ring-2 focus:ring-[#B8924A] outline-none transition-all placeholder:text-muted-foreground/40 text-foreground"
                    placeholder={requestVisit 
                      ? `Olá ${formatName(lead.client?.full_name).split(' ')[0]}! Gostaria de agendar uma visita técnica para avaliar o local e passar um orçamento preciso. Quais dias e horários funcionam para você?`
                      : `Olá ${formatName(lead.client?.full_name).split(' ')[0]}! Detalhe aqui seu prazo de execução, se o valor inclui material e outras informações importantes...`
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-2xl flex items-center justify-center gap-3 border border-border opacity-60">
                  <Info size={16} className="text-[#B8924A]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] italic text-foreground">Negociação Direta com o Cliente</span>
                </div>

                <Button 
                  fullWidth 
                  size="lg" 
                  variant="gold" 
                  isLoading={isSubmitting}
                  className="h-20 rounded-[2rem] text-lg group/btn shadow-xl shadow-amber-900/20"
                >
                  Confirmar e Enviar
                </Button>
              </form>
              </>
              )}
            </div>
          </Card>

          {/* Quick Stats Sidebar Card */}
          <Card className="p-8 border-border bg-card">
             <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6 italic">Concorrência Ativa</h4>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <p className="text-xs font-bold text-muted-foreground">Propostas Recebidas</p>
                   <p className="text-sm font-black italic text-foreground">02</p>
                </div>
                <div className="flex items-center justify-between">
                   <p className="text-xs font-bold text-muted-foreground">Visualizações do Lead</p>
                   <p className="text-sm font-black italic text-[#B8924A]">14</p>
                </div>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <div className="h-2 border border-border w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-[#B8924A] rounded-full" />
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest text-center italic">Alta probabilidade de conversão</p>
                </div>
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
