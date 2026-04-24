'use client';

import * as React from 'react';
import { useState, useEffect, Suspense } from 'react';
import {
  User,
  Mail,
  Lock,
  Bell,
  CreditCard,
  Shield,
  Save,
  ArrowLeft,
  Smartphone,
  Trash2,
  Info,
  Award
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlatform } from '@/hooks/usePlatform';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Notification, NotificationType } from '@/components/ui/Notification';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<'provider' | 'client'>('client');
  const [activeTab, setActiveTab] = useState('personal');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Profile data states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [bio, setBio] = useState('');
  
  // Notification preference states
  const [notifLeads, setNotifLeads] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifStatus, setNotifStatus] = useState(true);
  const [notifPlatform, setNotifPlatform] = useState(true);

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
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userRole = session.user.user_metadata?.role || 'client';
        setRole(userRole as 'provider' | 'client');
        setEmail(session.user.email || '');

        // Fetch current profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) {
          setFullName(profile.full_name || '');
          setPhone(profile.phone || '');
          setCpfCnpj(profile.cpf_cnpj || '');
          setBio(profile.bio || '');
          setNotifLeads(profile.notif_new_leads !== false);
          setNotifMessages(profile.notif_messages !== false);
          setNotifStatus(profile.notif_status_updates !== false);
          setNotifPlatform(profile.notif_platform !== false);
        }
      }
      setIsLoading(false);
    };

    checkUser();
  }, []);

  const { isIOS } = usePlatform();
  const isProvider = role === 'provider';

  useEffect(() => {
    const tab = searchParams.get('tab');
    const allowed = isIOS
      ? ['personal', 'security', 'notifications']
      : ['personal', 'subscription', 'security', 'notifications'];
    if (tab && allowed.includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, isIOS]);

  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          cpf_cnpj: cpfCnpj,
          bio: bio,
          notif_new_leads: notifLeads,
          notif_messages: notifMessages,
          notif_status_updates: notifStatus,
          notif_platform: notifPlatform,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // Also update auth metadata for faster access
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      showNotification('success', 'Configurações Salvas', 'Suas alterações foram aplicadas com sucesso.');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      showNotification('error', 'Erro ao Salvar', 'Não foi possível salvar suas alterações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const sections = [
    { id: 'personal',      label: 'Dados Pessoais', icon: <User size={18} /> },
    { id: 'security',      label: 'Segurança',      icon: <Shield size={18} /> },
    { id: 'notifications', label: 'Notificações',   icon: <Bell size={18} /> },
  ];

  const cardHeaderCls = "p-10 pb-6 border-b border-border bg-card/50";
  const iconBoxCls    = "w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center text-[#B8924A]";
  const sectionLabelCls = "text-xs font-black uppercase tracking-widest text-muted-foreground border-l-4 border-[#B8924A] pl-4 mt-6";

  if (isLoading) {
    return (
      <div className="p-20 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#B8924A] border-t-transparent mx-auto mb-4" />
        <p className="font-black text-muted-foreground uppercase tracking-widest text-xs">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-24">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-muted-foreground hover:text-[#B8924A] transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>
          <div className="space-y-1">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter leading-[0.9]">Configurações</h1>
            <p className="text-muted-foreground font-bold">Gerencie sua conta e preferências de acesso.</p>
          </div>
        </div>

        <div className="w-full md:w-auto">
          <Button onClick={handleSave} isLoading={isSaving} className="bg-neutral-900 text-white rounded-xl font-black text-xs uppercase tracking-widest h-12 px-10 w-full sm:w-auto border border-white/10 shadow-sm">
            Salvar Alterações
            {!isSaving && <Save size={16} className="ml-2" />}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 flex flex-row lg:flex-col gap-1.5 sticky top-24 lg:top-32 z-20 bg-background/80 backdrop-blur-md lg:bg-transparent -mx-4 px-4 py-2 lg:mx-0 lg:px-0 overflow-x-auto no-scrollbar">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveTab(section.id)}
              className={cn(
                "flex-shrink-0 flex items-center gap-4 px-5 lg:px-6 py-3 lg:py-4 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-xs uppercase tracking-widest transition-all",
                activeTab === section.id
                  ? "bg-[#B8924A]/10 text-[#B8924A] border border-[#B8924A]/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              )}
            >
              <span className={activeTab === section.id ? "text-[#B8924A]" : "text-muted-foreground/50"}>
                {section.icon}
              </span>
              <span className="whitespace-nowrap">{section.label}</span>
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-9 space-y-10">
          <form onSubmit={handleSave} className="space-y-10">

            {/* PERSONAL DATA */}
            <motion.div
              initial={false}
              animate={{ opacity: activeTab === 'personal' ? 1 : 0.5 }}
              className={cn(activeTab !== 'personal' && "hidden")}
            >
              <Card className="border-border overflow-hidden rounded-[2.5rem]">
                <CardHeader className={cardHeaderCls}>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={iconBoxCls}><User size={20} /></div>
                    <CardTitle className="text-2xl font-black tracking-tight">Dados Pessoais</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-bold text-muted-foreground pl-0 md:pl-14 max-w-2xl">
                    Informações básicas de identificação na plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-10 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Input 
                      label="Nome Completo" 
                      placeholder="Ex: Gabriel Soares" 
                      icon={<User size={18} />}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                    <Input 
                      label="E-mail" 
                      placeholder="gabriel@exemplo.com" 
                      type="email" 
                      icon={<Mail size={18} />}
                      value={email}
                      disabled
                    />
                    <Input 
                      label="CPF/CNPJ" 
                      placeholder="000.000.000-00" 
                      icon={<Shield size={18} />}
                      value={cpfCnpj}
                      onChange={(e) => setCpfCnpj(e.target.value)}
                    />
                    <Input 
                      label="Telefone / WhatsApp" 
                      placeholder="(11) 99999-9999" 
                      icon={<Smartphone size={18} />}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="pt-4">
                    <label className={cn(sectionLabelCls, "block mb-4 border-none pl-0")}>
                      {isProvider ? 'Biografia / Descrição Profissional' : 'Sobre Você'}
                    </label>
                    <textarea
                      className="w-full bg-muted border border-border rounded-[1.5rem] p-6 text-sm font-bold italic min-h-[120px] focus:ring-1 focus:ring-[#B8924A]/40 focus:border-[#B8924A]/40 outline-none transition-all placeholder:text-muted-foreground/30 text-foreground resize-none"
                      placeholder={isProvider ? "Conte um pouco sobre sua experiência..." : "Conte um pouco sobre você..."}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>


            {/* SECURITY */}
            <motion.div
              initial={false}
              animate={{ opacity: activeTab === 'security' ? 1 : 0.5 }}
              className={cn(activeTab !== 'security' && "hidden")}
            >
              <Card className="border-border overflow-hidden rounded-[2.5rem]">
                <CardHeader className={cardHeaderCls}>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={iconBoxCls}><Lock size={20} /></div>
                    <CardTitle className="text-2xl font-black tracking-tight">Segurança</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-bold text-muted-foreground pl-0 md:pl-14 max-w-2xl">
                    Proteja sua conta com senhas fortes e autenticação.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-10 space-y-10">
                  <div className="space-y-6">
                    <h4 className={sectionLabelCls}>Alterar Senha</h4>
                    <div className="grid grid-cols-1 gap-6 max-w-md">
                      <Input label="Senha Atual"          type="password" placeholder="••••••••" icon={<Lock size={18} />} />
                      <Input label="Nova Senha"           type="password" placeholder="••••••••" icon={<Lock size={18} />} />
                      <Input label="Confirmar Nova Senha" type="password" placeholder="••••••••" icon={<Lock size={18} />} />
                    </div>
                  </div>

                   <div className="pt-10 border-t border-border space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-black tracking-tight text-foreground">Autenticação em Dois Fatores (2FA)</h4>
                          <Badge variant="error" className="sm:hidden font-black uppercase text-[8px] tracking-widest py-1 px-2 rounded-full h-fit">
                            Desativado
                          </Badge>
                        </div>
                        <p className="text-sm font-bold text-muted-foreground italic max-w-md">Adicione uma camada extra de segurança à sua conta.</p>
                      </div>
                      <Badge variant="error" className="hidden sm:flex font-black uppercase text-[10px] tracking-widest py-1.5 px-4 rounded-full">
                        Desativado
                      </Badge>
                    </div>
                    <Button variant="outline" className="rounded-xl w-full sm:w-auto">Configurar 2FA</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* NOTIFICATIONS */}
            <motion.div
              initial={false}
              animate={{ opacity: activeTab === 'notifications' ? 1 : 0.5 }}
              className={cn(activeTab !== 'notifications' && "hidden")}
            >
              <Card className="border-border overflow-hidden rounded-[2.5rem]">
                <CardHeader className={cardHeaderCls}>
                  <div className="flex items-center gap-4 mb-2">
                    <div className={iconBoxCls}><Bell size={20} /></div>
                    <CardTitle className="text-2xl font-black tracking-tight">Notificações</CardTitle>
                  </div>
                  <CardDescription className="text-sm font-bold text-muted-foreground pl-0 md:pl-14 max-w-2xl">
                    Escolha como e quando você deseja ser alertado.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 md:p-10 space-y-2">
                  {[
                    { 
                      title: 'Novos Leads em sua Região',  
                      desc: 'Alertas em tempo real quando um novo serviço for postado.', 
                      enabled: notifLeads, 
                      setter: setNotifLeads,
                      providerOnly: true 
                    },
                    { 
                      title: 'Mensagens no Chat',          
                      desc: 'Notificações de novas mensagens enviadas para você.',       
                      enabled: notifMessages,
                      setter: setNotifMessages
                    },
                    { 
                      title: 'Status dos Serviços',        
                      desc: 'Avisos sobre propostas aceitas e atualizações de pedidos.', 
                      enabled: notifStatus,
                      setter: setNotifStatus
                    },
                    { 
                      title: 'Avisos da Plataforma',       
                      desc: 'Novidades, dicas e atualizações de sistema.',              
                      enabled: notifPlatform,
                      setter: setNotifPlatform
                    },
                  ].filter(item => !item.providerOnly || isProvider).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-6 rounded-[1.5rem] hover:bg-muted/50 transition-colors group">
                      <div className="space-y-1">
                        <h4 className="text-lg font-black tracking-tight text-foreground group-hover:text-[#B8924A] transition-colors">{item.title}</h4>
                        <p className="text-sm font-bold text-muted-foreground italic">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => item.setter(!item.enabled)}
                        className={cn(
                          "w-14 h-8 rounded-full transition-all duration-300 relative px-1 shrink-0",
                          item.enabled ? "bg-[#B8924A] shadow-[0_0_12px_rgba(184,146,74,0.3)]" : "bg-muted"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
                          item.enabled ? "translate-x-6" : "translate-x-0"
                        )} />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

          </form>

          {/* DANGER ZONE */}
          <section className="pt-10 border-t border-border flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-1 text-center md:text-left max-w-lg">
              <h3 className="text-xl font-black text-red-400 tracking-tight">Zona de Risco</h3>
              <p className="text-sm font-bold text-muted-foreground italic">Uma vez deletada, sua conta e todos os seus dados não poderão ser recuperados.</p>
            </div>
            <Button 
              variant="outline" 
              className="w-full md:w-auto h-auto py-5 px-8 border-red-500/20 text-red-400 hover:bg-red-500/[0.08] hover:border-red-500/30 rounded-[1.5rem] md:rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
            >
              <Trash2 size={20} className="shrink-0" />
              <span className="text-center">Excluir Minha Conta</span>
            </Button>
          </section>
        </main>
      </div>

      <Notification 
        {...notif} 
        onClose={() => setNotif(prev => ({ ...prev, show: false }))} 
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center font-black animate-pulse text-muted-foreground">Carregando Configurações...</div>}>
      <SettingsContent />
    </Suspense>
  );
}
