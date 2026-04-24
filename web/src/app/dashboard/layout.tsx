'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  Search,
  Bell,
  Settings,
  LogOut,
  User,
  Plus,
  CalendarDays,
  CheckCircle2,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

import { Suspense } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#B8924A] border-t-transparent" />
        </div>
      </div>
    }>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </Suspense>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChatOpen = pathname === '/dashboard/chat' && searchParams.get('id');
  const { theme, toggle: toggleTheme } = useTheme();
  const [userData, setUserData] = useState<{
    name: string;
    email: string;
    initials: string;
    role: 'client' | 'provider';
  }>({
    name: 'Carregando...',
    email: '',
    initials: '...',
    role: 'client',
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [hasNotificationsTable, setHasNotificationsTable] = useState(true);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;
  const markAllAsRead = () => setNotifications((ns) => ns.map((n) => ({ ...n, unread: false })));

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/auth');
        return;
      }

      const user = session.user;
      const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
      const role = user.user_metadata?.role || 'client';
      const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      
      setUserData({
        name,
        email: user.email || '',
        initials,
        role: role as 'client' | 'provider'
      });
      setAuthLoading(false);
    };

    const fetchNotifications = async () => {
      if (!hasNotificationsTable) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('not found')) {
            setHasNotificationsTable(false);
            setNotifications([]);
          } else {
            throw error;
          }
        } else if (data) {
          setNotifications(data.map(n => ({
            id: n.id,
            title: n.title,
            description: n.body,
            time: formatRelativeTime(n.created_at),
            unread: !n.is_read,
            type: n.type,
            targetUrl: n.link || '/dashboard'
          })));
        }
      } catch (err) {
        console.error('Error fetching notifications:', err);
      } finally {
        setLoadingNotifications(false);
      }
    };

    const formatRelativeTime = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Agora';
      if (diffInMinutes < 60) return `${diffInMinutes}m atrás`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h atrás`;
      
      return date.toLocaleDateString();
    };

    let isMounted = true;
    let channel: any;

    const init = async () => {
      await checkUser();
      if (!isMounted) return;
      await fetchNotifications();
      if (!isMounted) return;

      // Subscribe to new notifications only if table exists and we are still mounted
      if (hasNotificationsTable) {
        // Create channel with a unique name for this effect instance to avoid "cannot add callbacks after subscribe" error
        // which happens if an old subscription is still active during re-render
        const channelName = `notifications-${Math.random().toString(36).slice(2, 9)}`;
        const newChannel = supabase.channel(channelName);
        
        newChannel
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'notifications' 
          }, () => {
            if (isMounted) fetchNotifications();
          })
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              console.warn('Realtime channel error - possibly missing permissions or table');
            }
          });

        channel = newChannel;
      }
    };

    init();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [router, hasNotificationsTable]);



  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isProvider = pathname.includes('/provider') || userData.role === 'provider';

  const clientNav: NavItem[] = [
    { label: 'Visão Geral',   href: '/dashboard/client',          icon: LayoutDashboard },
    { label: 'Meus Pedidos',  href: '/dashboard/client/requests',  icon: Briefcase },
    { label: 'Mensagens',     href: '/dashboard/chat',             icon: MessageSquare },
    { label: 'Meu Perfil',    href: '/dashboard/profile',          icon: User },
    { label: 'Configurações', href: '/dashboard/settings',         icon: Settings },
  ];

  const providerNav: NavItem[] = [
    { label: 'Painel',            href: '/dashboard/provider',      icon: LayoutDashboard },
    { label: 'Encontrar Serviços',href: '/dashboard/provider/feed', icon: Search },
    { label: 'Mensagens',         href: '/dashboard/chat',          icon: MessageSquare },
    { label: 'Meu Perfil',        href: '/dashboard/profile',       icon: User },
    { label: 'Configurações',     href: '/dashboard/settings',      icon: Settings },
  ];

  const navItems = isProvider ? providerNav : clientNav;
  const currentLabel = navItems.find((n) => n.href === pathname)?.label || 'Painel';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#B8924A] border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-background overflow-hidden flex flex-col md:flex-row",
      isChatOpen ? "p-0 gap-0" : "p-2 pt-14 md:p-5 gap-3 md:gap-5"
    )}>

      {/* ── Desktop Sidebar ──────────────────────────────────────── */}
      {!isChatOpen && (
      <aside className="hidden md:flex w-[270px] bg-[hsl(var(--sidebar-bg))] border-r border-border text-foreground flex-col h-[calc(100vh-2.5rem)] rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.1)] sticky top-5 z-50 overflow-hidden shrink-0">

        {/* top gold accent line */}
        <div className="absolute top-0 inset-x-6 h-px bg-gradient-to-r from-transparent via-[#B8924A]/40 to-transparent" />

        {/* logo */}
        <div className="p-7 pb-3">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-lg font-black tracking-tighter leading-none">
              <span className="text-[#B8924A]">W</span><span className="text-foreground">orking</span>
            </span>
          </Link>
        </div>

        {/* section label */}
        <div className="px-7 pb-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">
            {isProvider ? 'Área do Profissional' : 'Área do Cliente'}
          </p>
        </div>

        {/* nav items */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3 rounded-2xl font-bold transition-all duration-200 group relative overflow-hidden',
                  isActive
                    ? 'bg-[#B8924A]/10 text-[#B8924A] border border-[#B8924A]/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/10',
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#B8924A] rounded-r-full shadow-[0_0_8px_#B8924A]" />
                )}
                <item.icon
                  size={18}
                  className={cn(
                    'transition-all duration-200 shrink-0',
                    isActive ? 'text-[#B8924A]' : 'text-muted-foreground group-hover:text-foreground/80',
                  )}
                />
                <span className="text-[0.88rem] tracking-tight">{item.label}</span>
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#B8924A] shadow-[0_0_8px_rgba(184,146,74,0.8)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* user card */}
        <div className="p-3">
          <div className="absolute bottom-16 inset-x-3 h-px bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          <div
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/30 border border-border hover:bg-muted/50 hover:border-accent/20 transition-all cursor-pointer group mt-3 relative"
          >
            <div 
              onClick={() => router.push('/dashboard/profile')}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-10 h-10 rounded-[14px] bg-[#B8924A]/10 border border-[#B8924A]/20 flex items-center justify-center font-black text-sm text-[#B8924A] group-hover:scale-105 transition-transform shrink-0">
                {userData.initials}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-[0.8rem] font-black truncate text-foreground/80">{userData.name}</p>
                <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground truncate">{userData.email}</p>
              </div>
            </div>
            
            <button
              onClick={(e) => { 
                e.preventDefault();
                e.stopPropagation(); 
                handleLogout(); 
              }}
              className="p-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground shrink-0 group/logout"
              title="Sair da conta"
            >
              <LogOut size={16} className="group-hover/logout:scale-110 transition-transform" />
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* ── Mobile Header ─────────────────────────────────────────── */}




      {/* ── Main panel ────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 overflow-hidden",
        isChatOpen ? "h-screen" : "h-[calc(100vh-2.5rem)]"
      )}>
        <main className={cn(
          "flex-1 bg-card flex flex-col overflow-hidden relative",
          isChatOpen ? "rounded-none border-none shadow-none" : "border border-border rounded-[28px] shadow-[0_8px_40px_rgba(0,0,0,0.05)]"
        )}>

          {/* top accent line */}
          <div className="absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-[#B8924A]/20 to-transparent" />

          {/* top bar */}
          {!isChatOpen && (
            <header className="flex items-center justify-between px-4 md:px-8 py-5 border-b border-white/[0.05] bg-white/[0.01] backdrop-blur-sm sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.07]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8924A] shadow-[0_0_6px_#B8924A]" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {currentLabel}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3 relative">
              {/* theme toggle */}
              <button
                onClick={toggleTheme}
                title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
                className="p-2.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
              >
                {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
              </button>

              {/* notification bell */}
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={cn(
                  'relative p-2.5 rounded-xl transition-all group',
                  isNotificationsOpen
                    ? 'bg-[#B8924A]/10 border border-[#B8924A]/20 text-[#B8924A]'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                <Bell size={19} />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-[#B8924A] rounded-full border border-[#0C1018] animate-pulse shadow-[0_0_6px_#B8924A]" />
                )}
              </button>

              {/* notification dropdown */}
              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsNotificationsOpen(false)}
                      className="fixed inset-0 z-50 pointer-events-auto"
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      className="absolute top-full right-[-10px] md:right-0 mt-3 w-[calc(100vw-2rem)] md:w-96 bg-popover border border-border rounded-[28px] shadow-[0_24px_60px_rgba(0,0,0,0.15)] z-[60] overflow-hidden"
                    >
                      <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-[#B8924A]/25 to-transparent" />
                      <div className="p-6 pb-4 flex items-center justify-between">
                        <h3 className="text-base font-black text-foreground">Notificações</h3>
                        <button
                          onClick={markAllAsRead}
                          className="text-[10px] uppercase tracking-widest font-black text-[#B8924A] hover:text-[#d4af71] transition-colors"
                        >
                          Marcar lidas
                        </button>
                      </div>

                      <div className="max-h-[360px] overflow-y-auto px-3 pb-3 space-y-1 no-scrollbar">
                        {loadingNotifications ? (
                          <div className="p-10 flex flex-col items-center justify-center gap-3 opacity-50">
                            <div className="w-5 h-5 border-2 border-[#B8924A] border-t-transparent rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Carregando...</p>
                          </div>
                        ) : notifications.length > 0 ? (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              onClick={() => { setIsNotificationsOpen(false); router.push(n.targetUrl); }}
                              className={cn(
                                'w-full flex gap-3.5 p-4 rounded-2xl transition-all text-left group',
                                n.unread ? 'bg-[#B8924A]/[0.05] hover:bg-[#B8924A]/[0.09]' : 'hover:bg-muted/40',
                              )}
                            >
                              <div className={cn(
                                'shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105',
                                n.type === 'message' ? 'bg-violet-500/10 border border-violet-500/20 text-violet-400' :
                                n.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
                                'bg-[#B8924A]/10 border border-[#B8924A]/20 text-[#B8924A]',
                              )}>
                                {n.type === 'message' ? <MessageSquare size={15} /> :
                                 n.type === 'success' ? <CheckCircle2 size={15} /> : <Bell size={15} />}
                              </div>
                              <div className="flex-1 space-y-0.5">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-black text-sm text-foreground truncate">{n.title}</p>
                                  <span className="text-[10px] font-bold text-muted-foreground shrink-0">{n.time}</span>
                                </div>
                                <p className="text-xs text-muted-foreground font-bold leading-relaxed line-clamp-2">{n.description}</p>
                              </div>
                              {n.unread && (
                                <div className="shrink-0 flex items-center">
                                  <div className="w-1.5 h-1.5 bg-[#B8924A] rounded-full shadow-[0_0_6px_#B8924A]" />
                                </div>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="py-12 px-6 text-center space-y-3 opacity-30">
                            <Bell size={32} className="mx-auto" />
                            <p className="text-xs font-black uppercase tracking-widest">Nenhuma notificação real</p>
                          </div>
                        )}
                      </div>

                      <div className="p-3 border-t border-white/[0.05]">
                        <Button
                          onClick={() => { setIsNotificationsOpen(false); router.push('/dashboard/notifications'); }}
                          fullWidth
                          variant="outline"
                          className="h-11 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                        >
                          Ver Todas as Notificações
                        </Button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="h-5 w-px bg-border hidden md:block" />

              <div className="hidden md:block">
                {!isProvider && (
                  <Button
                    href="/dashboard/client/new"
                    variant="glow"
                    className="rounded-xl flex items-center gap-2 px-5 h-10 font-black text-xs uppercase tracking-widest"
                  >
                    <Plus size={16} /> Novo Pedido
                  </Button>
                )}
                {isProvider && (
                  <div className="flex items-center gap-2 bg-[#B8924A]/[0.08] border border-[#B8924A]/20 text-[#B8924A] font-black text-[10px] uppercase tracking-[0.18em] px-4 py-2 rounded-xl">
                    <span className="w-1.5 h-1.5 bg-[#B8924A] rounded-full animate-pulse shadow-[0_0_6px_#B8924A]" />
                    Disponível
                  </div>
                )}
              </div>
            </div>
          </header>
          )}

          {/* content */}
          <div
            className={cn(
              "flex-1 no-scrollbar overflow-x-hidden",
              isChatOpen ? "p-0 overflow-hidden" : "px-3 py-5 md:p-8 md:pb-8 overflow-y-auto"
            )}
            style={!isChatOpen ? { paddingBottom: 'calc(8rem + env(safe-area-inset-bottom, 0px))' } : undefined}
          >
            <div className={cn("mx-auto w-full", isChatOpen ? "h-full" : "max-w-[1400px]")}>
              {children}
            </div>
          </div>
        </main>
      </div>
      {/* ── Mobile Bottom Nav ────────────────────────────────────── */}
      {!isChatOpen && (
        <nav
          className="md:hidden fixed bottom-0 inset-x-0 bg-[#0C1018] border-t border-white/[0.05] z-[60] flex items-center justify-between px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', height: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}
        >
        {/* Left side items */}
        <div className="flex flex-1 justify-around items-center">
          {navItems.slice(0, 2).map((item, index) => {
            const isActive = pathname === item.href;
            const label = isProvider
              ? (index === 0 ? 'Painel' : 'Serviços')
              : (index === 0 ? 'Geral' : 'Pedidos');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-all',
                  isActive ? 'text-[#B8924A]' : 'text-[#8E9196]'
                )}
              >
                <item.icon size={22} className={cn('transition-all duration-300', isActive && 'scale-110')} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Central Prominent Button */}
        <div className="flex flex-col items-center justify-center -translate-y-4 gap-1.5">
          {isProvider ? (
            <>
              <Link
                href="/dashboard/provider/schedule"
                className="w-14 h-14 bg-[#B8924A] rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(184,146,74,0.3)] active:scale-95 transition-all"
              >
                <CalendarDays size={28} />
              </Link>
              <span className="text-xs font-bold text-[#B8924A]">Agenda</span>
            </>
          ) : (
            <>
              <Link
                href="/dashboard/client/new"
                className="w-14 h-14 bg-[#B8924A] rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(184,146,74,0.3)] active:scale-95 transition-all"
              >
                <Plus size={32} />
              </Link>
              <span className="text-xs font-bold text-[#B8924A]">Pedir</span>
            </>
          )}
        </div>

        {/* Right side items */}
        <div className="flex flex-1 justify-around items-center">
          {navItems.slice(2, 4).map((item, index) => {
            const isActive = pathname === item.href;
            const label = index === 0 ? 'Mensagens' : 'Perfil';
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 transition-all',
                  isActive ? 'text-[#B8924A]' : 'text-[#8E9196]'
                )}
              >
                <item.icon size={22} className={cn('transition-all duration-300', isActive && 'scale-110')} />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      )}

    </div>
  );
}
