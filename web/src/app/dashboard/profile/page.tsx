'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  LogOut, 
  Camera,
  ChevronRight,
  Star,
  Award,
  Wallet,
  Clock,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState({ 
    name: '...', 
    role: 'client', 
    avatar: '', 
    createdAt: '',
    stats: { active: 0, total: 0, rating: 0, ratingCount: 0, earnings: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const user = session.user;
      const role = user.user_metadata?.role || 'client';
      const isProv = role === 'provider';

      // Fetch Profile Data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // Fetch Stats
      let stats = { active: 0, total: 0, rating: 0, ratingCount: 0, earnings: 0 };
      
      if (!isProv) {
        const { data: requests } = await supabase
          .from('service_requests')
          .select('status')
          .eq('client_id', user.id);
        
        if (requests) {
          stats.total = requests.length;
          stats.active = requests.filter(r => r.status === 'open' || r.status === 'in_progress').length;
        }
      } else {
        // Provider stats
        const { count: proposalsCount } = await supabase
          .from('proposals')
          .select('*', { count: 'exact', head: true })
          .eq('provider_id', user.id);
        
        stats.total = proposalsCount || 0;
      }

      setUserData({
        name: profile?.full_name || user.user_metadata?.full_name || 'Usuário',
        role: role as 'client' | 'provider',
        avatar: profile?.avatar_url || user.user_metadata?.avatar_url || '',
        createdAt: user.created_at,
        stats: {
          ...stats,
          rating: profile?.rating_avg || 0,
          ratingCount: profile?.rating_count || 0
        }
      });
      
      setEditName(profile?.full_name || user.user_metadata?.full_name || '');
      setEditPhone(profile?.phone || '');
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editName,
        phone: editPhone
      })
      .eq('id', session.user.id);

    if (error) {
      alert('Erro ao salvar perfil: ' + error.message);
    } else {
      setUserData(prev => ({ ...prev, name: editName }));
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `${session.user.id}/avatar_${timestamp}.${fileExt}`;

      // Upload new file
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      // 1. Atualiza na tabela profiles (Principal)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;

      // 2. Atualiza nos metadados do Auth (Backup/Sessão)
      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      setUserData(prev => ({ ...prev, avatar: publicUrl }));
    } catch (error: any) {
      console.error('Erro detalhado:', error);
      alert('Erro ao salvar foto: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const isProvider = userData.role === 'provider';

  const statCards = isProvider ? [
    { label: 'Propostas Enviadas', value: userData.stats.total.toString().padStart(2, '0'), icon: <Briefcase size={20} />, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'Média Avaliação', value: userData.stats.rating.toFixed(1), icon: <Star size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
    { label: 'Pedidos Ganhos', value: '00', icon: <CheckCircle2 size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ] : [
    { label: 'Pedidos Ativos', value: userData.stats.active.toString().padStart(2, '0'), icon: <Clock size={20} />, color: 'text-[#B8924A]', bg: 'bg-[#B8924A]/10' },
    { label: 'Pedidos Realizados', value: userData.stats.total.toString().padStart(2, '0'), icon: <Award size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Minha Avaliação', value: userData.stats.rating.toFixed(1), icon: <Star size={20} />, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  ];

  const settingGroups = [
    {
      title: 'Minha Conta',
      items: [
        { icon: <User size={18} />, title: 'Dados Pessoais', desc: 'Nome, CPF e informações básicas', onClick: () => setIsEditing(true) },
      ]
    },
    {
      title: 'Segurança e Preferências',
      items: [
        { icon: <Shield size={18} />, title: 'Segurança', desc: 'Alterar senha e autenticação 2FA', target: '/dashboard/settings?tab=security' },
        { icon: <Bell size={18} />, title: 'Notificações', desc: 'Configurar alertas de novos leads e chat', target: '/dashboard/settings?tab=notifications' },
      ]
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      {/* Edit Profile Modal */}
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
              className="relative bg-card border border-white/10 w-[calc(100%-1rem)] max-w-2xl rounded-[2rem] md:rounded-[3rem] px-5 py-8 md:p-10 shadow-2xl"
            >
              <div className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tight text-foreground">Editar Perfil</h3>
                  <p className="text-muted-foreground font-bold">Atualize seus dados básicos.</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Nome Completo</label>
                    <input 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-muted border-none h-14 rounded-2xl font-bold px-6 focus:ring-2 focus:ring-[#B8924A] transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">WhatsApp / Telefone</label>
                    <input 
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-muted border-none h-14 rounded-2xl font-bold px-6 focus:ring-2 focus:ring-[#B8924A] transition-all"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                 <div className="flex flex-col sm:flex-row gap-4 pt-4">
                   <Button variant="outline" fullWidth onClick={() => setIsEditing(false)} className="rounded-2xl h-14 font-black order-2 sm:order-1">
                     Cancelar
                   </Button>
                   <Button fullWidth onClick={handleSaveProfile} disabled={saving} className="bg-neutral-900 text-white rounded-2xl h-14 font-black border border-white/10 shadow-sm order-1 sm:order-2">
                     {saving ? 'Salvando...' : 'Salvar Alterações'}
                   </Button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#141B25] rounded-[3rem] p-8 md:p-12 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#B8924A]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="relative group">
            <div className="w-40 h-40 rounded-[2.5rem] bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center overflow-hidden transition-transform group-hover:scale-[1.02]">
              {userData.avatar ? (
                <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={64} className="text-white/40" />
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-white text-[#141B25] rounded-2xl flex items-center justify-center shadow-xl hover:bg-neutral-100 transition-colors cursor-pointer">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>

          <div className="flex-1 text-center md:text-left space-y-6">
            <div className="space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <h1 className="text-3xl md:text-4xl font-black tracking-tighter">{userData.name}</h1>
              </div>
              <p className="text-white/40 font-black text-xs uppercase tracking-widest italic">
                Membro desde {userData.createdAt ? format(new Date(userData.createdAt), "MMMM 'de' yyyy", { locale: ptBR }) : '...'}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl">
                 <Star size={14} className={cn("text-amber-400 fill-amber-400", userData.stats.ratingCount === 0 && "opacity-20")} />
                 <span className="font-black text-sm">
                   {userData.stats.ratingCount > 0 ? (
                     <>
                       {Number(userData.stats.rating).toFixed(1)} 
                       <span className="text-white/30 font-bold ml-1">
                         ({userData.stats.ratingCount} {userData.stats.ratingCount === 1 ? 'avaliação' : 'avaliações'})
                       </span>
                     </>
                   ) : (
                     <span className="text-white/30 font-bold">Nenhuma avaliação</span>
                   )}
                 </span>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => {
              setEditName(userData.name);
              setIsEditing(true);
            }}
            className="h-16 px-10 rounded-2xl bg-neutral-900 text-white border border-white/10 font-black text-xs uppercase tracking-[0.2em] hover:bg-black transition-all shadow-sm"
          >
            Editar Perfil
          </Button>
        </div>
      </section>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="p-8 bg-card border border-border hover:border-[#B8924A]/20 hover:shadow-[0_0_32px_rgba(184,146,74,0.06)] transition-all group overflow-hidden relative">
              <div className={cn("absolute top-0 right-0 w-28 h-28 rounded-full blur-3xl opacity-20", stat.bg)} />
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border border-border", stat.bg, stat.color)}>
                  {stat.icon}
                </div>
                <TrendingUp size={16} className="text-green-400 opacity-60" />
              </div>
              <div className="relative z-10 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <h3 className="text-3xl font-black text-foreground">{stat.value}</h3>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Settings Groups */}
        <div className="xl:col-span-8 space-y-10">
          {settingGroups.map((group, idx) => (
            <section key={group.title} className="space-y-6">
              <div className="flex items-center gap-4 px-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{group.title}</h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              
              <div className="space-y-3">
                {group.items.map((item, i) => {
                  const content = (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground group-hover:bg-[#B8924A]/10 group-hover:border-[#B8924A]/20 group-hover:text-[#B8924A] transition-colors">
                        {item.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="text-lg font-black text-foreground/80 group-hover:text-foreground transition-colors tracking-tight">{item.title}</h4>
                        <p className="text-sm font-bold text-muted-foreground italic">"{item.desc}"</p>
                      </div>
                      <ChevronRight size={20} className="text-muted-foreground/40 group-hover:text-[#B8924A] group-hover:translate-x-1 transition-all" />
                    </>
                  );

                  const commonStyles = "w-full text-left group flex items-center gap-6 p-6 rounded-[2rem] bg-card border border-border hover:border-[#B8924A]/30 hover:bg-[#B8924A]/[0.04] transition-all outline-none";

                  if ('target' in item) {
                    return (
                      <Link key={item.title} href={item.target} className={commonStyles}>
                        {content}
                      </Link>
                    );
                  }

                  return (
                    <button key={item.title} onClick={(item as any).onClick} className={commonStyles}>
                      {content}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Sidebar Actions */}
        <aside className="xl:col-span-4 space-y-8">
          <Card className="p-10 bg-card border border-border rounded-[2.5rem] space-y-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-muted border border-border rounded-3xl flex items-center justify-center text-muted-foreground">
                <HelpCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-foreground">Central de Ajuda</h3>
                <p className="text-sm font-bold text-muted-foreground leading-relaxed">Dúvidas sobre como usar a plataforma ou conseguir mais leads?</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button variant="outline" fullWidth className="h-14 px-8 font-black text-xs uppercase rounded-2xl">
                Acessar FAQ
              </Button>
              <Button variant="outline" fullWidth className="h-14 px-8 font-black text-xs uppercase rounded-2xl flex items-center justify-center gap-2">
                Falar com Suporte <ExternalLink size={14} />
              </Button>
            </div>
          </Card>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-3 p-6 rounded-3xl bg-red-500/10 border border-red-500/15 text-red-400 font-black text-xs uppercase tracking-widest hover:bg-red-500/[0.15] hover:border-red-500/25 transition-all group"
          >
            <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
            Encerrar Sessão
          </button>
        </aside>
      </div>
    </div>
  );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
