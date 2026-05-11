'use client';

import { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  BellRing, 
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
  Briefcase,
  Trash2,
  MoreVertical,
  Edit2,
  X,
  MapPin,
  Globe,
  MessageSquare
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
import { Notification, NotificationType } from '@/components/ui/Notification';

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState({ 
    name: '...', 
    role: 'client', 
    avatar: '', 
    phone: '',
    cep: '',
    address: '',
    createdAt: '',
    stats: { active: 0, total: 0, rating: 0, ratingCount: 0, earnings: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Máscaras
  const formatPhone = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 10) {
      v = v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (v.length > 5) {
      v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (v.length > 2) {
      v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    } else if (v.length > 0) {
      v = v.replace(/^(\d*)/, "($1");
    }
    return v;
  };

  const formatCEP = (v: string) => {
    v = v.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) {
      v = v.replace(/^(\d{5})(\d{0,3})/, "$1-$2");
    }
    return v;
  };
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
        { icon: <BellRing size={18} />, title: 'Notificações', desc: 'Configurar alertas de novos leads e chat', target: '/dashboard/settings?tab=notifications' },
      ]
    }
  ];

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCep, setEditCep] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [notif, setNotif] = useState<{ show: boolean; type: NotificationType; title: string; message: string }>({ show: false, type: 'error', title: '', message: '' });
  const showError = (title: string, message: string) => setNotif({ show: true, type: 'error', title, message });

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
        .maybeSingle();

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
        phone: profile?.phone || user.user_metadata?.phone || '',
        cep: profile?.cep || user.user_metadata?.cep || '',
        address: profile?.address || user.user_metadata?.address || '',
        createdAt: user.created_at,
        stats: {
          ...stats,
          rating: profile?.rating_avg || 0,
          ratingCount: profile?.rating_count || 0
        }
      });
      
      setEditName(profile?.full_name || user.user_metadata?.full_name || '');
      setEditPhone(profile?.phone || user.user_metadata?.phone || '');
      setEditCep(profile?.cep || user.user_metadata?.cep || '');
      setEditAddress(profile?.address || user.user_metadata?.address || '');
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    let latitude = null;
    let longitude = null;

    if (editAddress) {
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(editAddress)}`);
        const geoData = await geoRes.json();
        if (geoData && geoData.length > 0) {
          latitude = parseFloat(geoData[0].lat);
          longitude = parseFloat(geoData[0].lon);
        }
      } catch (err) {
        console.error('Geocoding error:', err);
      }
    }

    const payload = {
      full_name: editName,
      phone: editPhone,
      cep: editCep,
      address: editAddress,
      latitude,
      longitude,
      updated_at: new Date().toISOString()
    };

    // 1. Primeiro atualizamos os metadados do Auth.
    // Isso é garantido que funcione para o usuário logado e serve como nossa fonte de verdade fallback.
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        full_name: editName,
        phone: editPhone,
        cep: editCep,
        address: editAddress
      }
    });

    if (authError) {
      showError('Erro ao atualizar autenticação', authError.message);
      setSaving(false);
      return;
    }

    // 2. Tentamos atualizar a tabela profiles. 
    // Se falhar por RLS, não bloqueamos o usuário, pois os dados já estão no Auth.
    const { error: dbError } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        role: userData.role || 'client',
        ...payload
      });

    if (dbError) {
      console.warn('Erro de DB (Profiles) ignorado devido ao sucesso no Auth:', dbError);
      // Opcionalmente mostramos uma notificação de aviso, mas não um erro fatal.
    }

    setNotif({
      show: true,
      type: 'success',
      title: '✅ PERFIL ATUALIZADO',
      message: 'Suas informações foram salvas com sucesso.'
    });

    setUserData(prev => ({ 
      ...prev, 
      name: editName,
      phone: editPhone,
      cep: editCep,
      address: editAddress
    }));
    setIsEditing(false);
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
        .upsert({ 
          id: session.user.id,
          avatar_url: publicUrl,
          full_name: userData.name,
          role: userData.role,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Erro detalhado Supabase:', updateError.message, updateError.details, updateError.hint);
        throw new Error(`Erro no banco de dados: ${updateError.message}`);
      }

      // 2. Atualiza nos metadados do Auth (Backup/Sessão)
      const { error: authError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      if (authError) {
        console.warn('Aviso: Erro ao atualizar metadados de sessão:', authError);
      }

      // 3. Atualiza o estado local com cache-busting para garantir que a imagem mude
      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      setUserData(prev => ({ ...prev, avatar: finalUrl }));
      
      setNotif({
        show: true,
        type: 'success',
        title: 'Foto Atualizada',
        message: 'Sua nova foto de perfil foi salva permanentemente.'
      });
    } catch (error: any) {
      console.error('Erro detalhado no upload:', error);
      showError('Falha ao Salvar', error.message || 'Ocorreu um erro ao processar sua foto.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    setShowDeleteConfirm(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Atualiza na tabela profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id);

      if (updateError) {
        console.warn('Erro ao remover foto do DB:', updateError);
      }

      // 2. Atualiza nos metadados do Auth
      await supabase.auth.updateUser({
        data: { avatar_url: null }
      });

      setUserData(prev => ({ ...prev, avatar: '' }));
    } catch (error: any) {
      console.error('Erro ao remover foto:', error);
      showError('Erro ao remover foto', error.message);
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

  return (
    <div className="max-w-xl lg:max-w-6xl mx-auto min-h-screen pb-24 px-4 md:px-8 pt-4 lg:pt-8">
      {/* Delete Confirmation Modal (Both Mobile and Desktop) */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-card border border-border w-full max-w-md rounded-3xl p-8 shadow-2xl space-y-6"
            >
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto">
                <Trash2 size={28} />
              </div>
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold text-foreground">Remover Foto?</h3>
                <p className="text-muted-foreground text-sm">Tem certeza que deseja remover sua foto de perfil? Esta ação não pode ser desfeita.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setShowDeleteConfirm(false)} className="rounded-xl h-12 font-bold order-2 sm:order-1 bg-transparent border-border text-foreground hover:bg-muted">Cancelar</Button>
                <Button fullWidth onClick={handleRemoveAvatar} className="bg-red-500 hover:bg-red-600 text-white rounded-xl h-12 font-bold shadow-sm order-1 sm:order-2">Sim, Remover</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal (Mobile Only) */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:p-6 lg:hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsEditing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative bg-card border border-border w-full max-w-lg rounded-t-3xl p-6 shadow-2xl pb-safe"
            >
              <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-6" />
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-foreground">Editar Perfil</h3>
                  <p className="text-muted-foreground text-sm">Atualize seus dados básicos.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground px-1">Nome Completo</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-muted/50 border border-border h-12 rounded-xl text-sm font-medium text-foreground px-4 focus:border-[#B8924A]/50 transition-all outline-none" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-muted-foreground px-1">Telefone</label>
                    <input value={editPhone} onChange={(e) => setEditPhone(formatPhone(e.target.value))} className="w-full bg-muted/50 border border-border h-12 rounded-xl text-sm font-medium text-foreground px-4 focus:border-[#B8924A]/50 transition-all outline-none" placeholder="(00) 00000-0000" />
                  </div>
                  <div className="flex gap-4">
                    <div className="space-y-1.5 w-1/3">
                      <label className="text-xs font-bold text-muted-foreground px-1">CEP</label>
                      <div className="relative">
                        <input 
                          value={editCep}
                          onChange={async (e) => {
                            const val = formatCEP(e.target.value);
                            setEditCep(val);
                            if (val.length === 9) {
                              setIsFetchingCep(true);
                              try {
                                const res = await fetch(`https://viacep.com.br/ws/${val.replace('-', '')}/json/`);
                                const data = await res.json();
                                if (!data.erro) setEditAddress(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
                              } catch (err) {} finally { setIsFetchingCep(false); }
                            }
                          }}
                          className="w-full bg-muted/50 border border-border h-12 rounded-xl text-sm font-medium text-foreground px-4 focus:border-[#B8924A]/50 transition-all outline-none"
                          placeholder="00000-000"
                        />
                        {isFetchingCep && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-3 h-3 border-2 border-[#B8924A] border-t-transparent rounded-full animate-spin" /></div>}
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <label className="text-xs font-bold text-muted-foreground px-1">Endereço</label>
                      <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full bg-muted/50 border border-border h-12 rounded-xl text-sm font-medium text-foreground px-4 focus:border-[#B8924A]/50 transition-all outline-none" placeholder="Rua, Número..." />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" fullWidth onClick={() => setIsEditing(false)} className="rounded-xl h-12 font-bold bg-transparent border-border text-foreground hover:bg-muted">Cancelar</Button>
                  <Button fullWidth onClick={handleSaveProfile} disabled={saving} className="bg-[#B8924A] hover:bg-[#a3803f] text-white rounded-xl h-12 font-bold shadow-sm">{saving ? 'Salvando...' : 'Salvar'}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Top Header - Hidden as it is now in the global layout header */}
      <header className="flex items-center justify-between mb-8 lg:mb-12 opacity-0 pointer-events-none h-0">
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Perfil</h1>
        <Link href="/dashboard/settings?tab=notifications" className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-colors relative">
          <BellRing size={20} className="text-white" />
          <span className="absolute top-2.5 right-2.5 lg:top-3.5 lg:right-3.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#07090E]" />
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
        
        {/* LEFT COLUMN: Mobile Profile Info + Menus */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Photo Options Bottom Sheet (Mobile) */}
          <AnimatePresence>
            {showPhotoOptions && (
              <div className="fixed inset-0 z-[120] flex items-end justify-center lg:hidden">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setShowPhotoOptions(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                <motion.div 
                  initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="relative bg-card border border-border w-full rounded-t-[2rem] p-6 shadow-2xl pb-safe"
                >
                  <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8" />
                  <div className="space-y-4">
                    <div className="text-center mb-6">
                      <h3 className="text-xl font-bold text-foreground">Foto de Perfil</h3>
                      <p className="text-sm text-muted-foreground">Como você deseja gerenciar sua foto?</p>
                    </div>

                    <div className="grid gap-3">
                      <label className="flex items-center justify-center gap-3 w-full h-14 bg-[#B8924A] text-white font-bold rounded-2xl cursor-pointer hover:bg-[#a3803f] transition-all">
                        <Camera size={20} />
                        Nova Foto
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => { handleAvatarUpload(e); setShowPhotoOptions(false); }} disabled={uploading} />
                      </label>

                      {userData.avatar && (
                        <button 
                          onClick={() => { setShowPhotoOptions(false); setShowDeleteConfirm(true); }}
                          className="flex items-center justify-center gap-3 w-full h-14 bg-red-500/10 text-red-500 border border-red-500/20 font-bold rounded-2xl hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 size={20} />
                          Remover Foto
                        </button>
                      )}

                      <button 
                        onClick={() => setShowPhotoOptions(false)}
                        className="w-full h-14 bg-muted text-foreground font-bold rounded-2xl hover:bg-muted/80 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Mobile Only Profile Info */}
          <div className="flex items-center gap-4 group lg:hidden">
            <div className="relative shrink-0">
              <div 
                onClick={() => setShowPhotoOptions(true)}
                className="w-[72px] h-[72px] rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden cursor-pointer active:scale-95 transition-transform"
              >
                {userData.avatar ? <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={32} className="text-muted-foreground/40" />}
                {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
              </div>
              <button 
                onClick={() => setShowPhotoOptions(true)}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-foreground text-background rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform z-10"
              >
                <Camera size={14} />
              </button>
            </div>
            <div 
              onClick={() => {
                setEditName(userData.name);
                setIsEditing(true);
              }}
              className="flex-1 flex flex-col justify-center overflow-hidden cursor-pointer"
            >
              <h2 className="text-xl font-bold text-foreground truncate">{userData.name}</h2>
              <p className="text-sm text-muted-foreground truncate">{isProvider ? 'Prestador' : 'Cliente'} • {userData.createdAt ? format(new Date(userData.createdAt), "MMM yyyy", { locale: ptBR }) : ''}</p>
            </div>
            <ChevronRight size={20} className="text-muted-foreground/20 shrink-0" />
          </div>

          {/* Stats Cards - Vertical Stack */}
          <div className="space-y-4">
            <div className="flex flex-col gap-4 lg:grid lg:grid-cols-1 lg:gap-4">
              {statCards.map((stat, i) => (
                <div 
                  key={i} 
                  className="bg-card border border-border rounded-3xl p-5 hover:border-[#B8924A]/30 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105", stat.bg, stat.color)}>
                        {stat.icon}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-tight max-w-[80px]">
                        {stat.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl font-black text-foreground leading-none">
                          {stat.value}
                        </span>
                        {stat.label.includes('Avaliação') && (
                          <Star size={14} className="fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      {stat.label.includes('Avaliação') && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mt-1">
                          de 5.0
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Banner (Conversas) */}
          <Link href="/dashboard/chat" className="block bg-gradient-to-br from-[#B8924A] to-[#d4af71] rounded-[24px] p-6 shadow-xl hover:scale-[1.02] transition-transform">
            <div className="flex flex-col gap-4">
              <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <MessageSquare size={24} className="text-[#07090E]" />
              </div>
              <div>
                <h3 className="font-bold text-[#07090E] text-xl mb-1">Conversas</h3>
                <p className="text-sm text-[#07090E]/80 font-medium leading-snug">Acesse seus chats e pedidos em andamento</p>
              </div>
            </div>
          </Link>

              <div className="space-y-6">
            <div>
              <div className="bg-card lg:bg-transparent rounded-2xl border border-border lg:border-none overflow-hidden space-y-1">
                <button onClick={() => { if(window.innerWidth < 1024) { setEditName(userData.name); setIsEditing(true); } }} className="w-full flex items-center justify-between p-4 lg:p-3 lg:hover:bg-muted lg:rounded-xl transition-colors border-b border-border lg:border-none group">
                  <div className="flex items-center gap-4">
                    <User size={20} className="text-muted-foreground group-hover:text-[#B8924A] transition-colors" />
                    <span className="font-bold text-foreground group-hover:text-[#B8924A] transition-colors">Informações da Conta</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground/20 lg:hidden" />
                </button>
                <Link href="/dashboard/settings?tab=security" className="w-full flex items-center justify-between p-4 lg:p-3 lg:hover:bg-muted lg:rounded-xl transition-colors border-b border-border lg:border-none group">
                  <div className="flex items-center gap-4">
                    <Shield size={20} className="text-muted-foreground group-hover:text-[#B8924A] transition-colors" />
                    <span className="font-bold text-foreground group-hover:text-[#B8924A] transition-colors">Segurança e Senha</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground/20 lg:hidden" />
                </Link>
                {isProvider ? (
                  <div className="w-full flex items-center justify-between p-4 lg:p-3 lg:hover:bg-muted lg:rounded-xl transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <Star size={20} className="text-amber-400" />
                      <span className="font-bold text-foreground group-hover:text-amber-400 transition-colors">Minhas Avaliações</span>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground/20 lg:hidden" />
                  </div>
                ) : (
                  <Link href="/dashboard/client/requests" className="w-full flex items-center justify-between p-4 lg:p-3 lg:hover:bg-muted lg:rounded-xl transition-colors group">
                    <div className="flex items-center gap-4">
                      <Clock size={20} className="text-muted-foreground group-hover:text-[#B8924A] transition-colors" />
                      <span className="font-bold text-foreground group-hover:text-[#B8924A] transition-colors">Histórico de Pedidos</span>
                    </div>
                    <ChevronRight size={18} className="text-muted-foreground/20 lg:hidden" />
                  </Link>
                )}
              </div>
            </div>
 
            <div>
              <div className="bg-card lg:bg-transparent rounded-2xl border border-border lg:border-none overflow-hidden space-y-1">
                <button className="w-full flex items-center justify-between p-4 lg:p-3 lg:hover:bg-muted lg:rounded-xl transition-colors border-b border-border lg:border-none group">
                  <div className="flex items-center gap-4">
                    <HelpCircle size={20} className="text-muted-foreground group-hover:text-[#B8924A] transition-colors" />
                    <span className="font-bold text-foreground group-hover:text-[#B8924A] transition-colors">Central de Ajuda</span>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground/20 lg:hidden" />
                </button>
                <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 lg:p-3 lg:hover:bg-red-500/10 lg:rounded-xl transition-colors group">
                  <div className="flex items-center gap-4">
                    <LogOut size={20} className="text-red-400" />
                    <span className="font-bold text-red-400">Sair da conta</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Desktop Inline Edit Form */}
        <div className="hidden lg:block lg:col-span-8">
          <div className="bg-card rounded-[32px] p-10 border border-border shadow-2xl">
            <h2 className="text-2xl font-bold text-foreground mb-10">Informações Pessoais</h2>
            
            {/* Desktop Avatar Header */}
            <div className="flex items-center gap-8 mb-10 pb-8 border-b border-border">
              <div className="relative shrink-0">
                <div className="w-[100px] h-[100px] rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden">
                  {userData.avatar ? <img src={userData.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User size={40} className="text-muted-foreground/40" />}
                  {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /></div>}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-4">{userData.name}</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center justify-center h-10 px-6 bg-[#B8924A] hover:bg-[#a3803f] text-white font-bold text-sm rounded-xl cursor-pointer transition-colors">
                    <span>Nova Foto</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                  {userData.avatar && (
                    <button onClick={() => setShowDeleteConfirm(true)} disabled={uploading} className="h-10 px-6 bg-transparent border border-border hover:bg-muted text-foreground font-bold text-sm rounded-xl transition-colors">
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>
 
            {/* Desktop Form Fields */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground px-1">Nome Completo</label>
                  <div className="relative">
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-muted/50 border border-border h-14 rounded-xl text-sm font-medium text-foreground px-5 focus:border-[#B8924A]/50 transition-all outline-none" />
                    <Edit2 size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/20" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground px-1">Telefone</label>
                  <div className="relative">
                    <input value={editPhone} onChange={(e) => setEditPhone(formatPhone(e.target.value))} className="w-full bg-muted/50 border border-border h-14 rounded-xl text-sm font-medium text-foreground px-5 focus:border-[#B8924A]/50 transition-all outline-none" placeholder="(00) 00000-0000" />
                    <Edit2 size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground/20" />
                  </div>
                </div>
              </div>
 
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground px-1">CEP</label>
                  <input 
                    value={editCep}
                    onChange={async (e) => {
                      const val = formatCEP(e.target.value);
                      setEditCep(val);
                      if (val.length === 9) {
                        setIsFetchingCep(true);
                        try {
                          const res = await fetch(`https://viacep.com.br/ws/${val.replace('-', '')}/json/`);
                          const data = await res.json();
                          if (!data.erro) setEditAddress(`${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
                        } catch (err) {} finally { setIsFetchingCep(false); }
                      }
                    }}
                    className="w-full bg-muted/50 border border-border h-14 rounded-xl text-sm font-medium text-foreground px-5 focus:border-[#B8924A]/50 transition-all outline-none"
                    placeholder="00000-000"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-xs font-bold text-muted-foreground px-1">Endereço Completo</label>
                  <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full bg-muted/50 border border-border h-14 rounded-xl text-sm font-medium text-foreground px-5 focus:border-[#B8924A]/50 transition-all outline-none" placeholder="Rua, Número..." />
                </div>
              </div>
 
              <div className="pt-6">
                <Button fullWidth onClick={handleSaveProfile} disabled={saving} className="bg-[#B8924A] hover:bg-[#a3803f] text-white rounded-xl h-14 text-base font-bold shadow-sm">
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Notification {...notif} onClose={() => setNotif(p => ({ ...p, show: false }))} />
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
