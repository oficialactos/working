'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  MessageSquare, 
  CheckCircle2, 
  ArrowLeft,
  Trash2,
  Filter,
  MoreVertical,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function NotificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('not found')) {
          console.warn('Notifications table not found.');
          setNotifications([]);
        }
      } else if (data) {
        setNotifications(data.map(n => ({
          ...n,
          title: n.title,
          description: n.body,
          time: formatRelativeTime(n.created_at),
          unread: !n.is_read,
          date: categorizeDate(n.created_at),
          targetUrl: n.link || '/dashboard'
        })));
      }
      setLoading(false);
    };

    fetchNotifications();
  }, []);

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

  const categorizeDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'ontem';
    return 'anterior';
  };

  const tabs = [
    { id: 'all', label: 'Tudo' },
    { id: 'message', label: 'Mensagens' },
    { id: 'success', label: 'Serviços' }
  ];

  const filteredNotifications = notifications.filter(n => 
    activeTab === 'all' || n.type === activeTab
  );

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const deleteNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  // Grouping logic
  const sections = [
    { id: 'hoje', label: 'Hoje' },
    { id: 'ontem', label: 'Ontem' },
    { id: 'anterior', label: 'Mais Antigas' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="space-y-4">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[#B8924A] transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Voltar
          </button>
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tighter text-foreground">Notificações</h1>
            <p className="text-sm font-bold text-muted-foreground">Gerencie todos os seus alertas e novidades.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="rounded-2xl border-border font-bold text-xs px-6 py-4 h-auto flex items-center gap-2 hover:bg-muted"
            onClick={markAllAsRead}
          >
            <CheckCheck size={16} />
            Marcar todas como lidas
          </Button>
        </div>
      </header>

      {/* Tabs / Filters */}
      <div className="flex items-center gap-2 p-1.5 bg-muted rounded-[24px] w-fit mx-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 py-3 rounded-[20px] text-xs font-black transition-all",
              activeTab === tab.id 
                ? "bg-card text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List Area */}
      <div className="space-y-12 px-2">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-4 opacity-50">
            <div className="w-10 h-10 border-4 border-[#B8924A] border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-sm uppercase tracking-widest">Buscando notificações...</p>
          </div>
        ) : sections.map(section => {
          const items = filteredNotifications.filter(n => n.date === section.id);
          if (items.length === 0) return null;

          return (
            <section key={section.id} className="space-y-6">
              <div className="flex items-center gap-4 px-4 text-muted-foreground">
                <span className="text-[10px] font-black uppercase tracking-widest">{section.label}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {items.map((n) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      onClick={() => router.push(n.targetUrl)}
                      className={cn(
                        "group relative flex gap-5 p-6 rounded-[2.5rem] transition-all border border-border cursor-pointer",
                        n.unread ? "bg-card shadow-[0_10px_30px_rgba(15,40,80,0.04)] border-accent/20" : "bg-muted/30 hover:bg-muted hover:border-border"
                      )}
                    >
                      {/* Unread Indicator */}
                      {n.unread && (
                        <div className="absolute top-8 left-2 w-1.5 h-1.5 bg-[#B8924A] rounded-full" />
                      )}

                      {/* Icon */}
                      <div className={cn(
                        "shrink-0 w-14 h-14 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110",
                        n.type === 'message' ? "bg-purple-100 text-purple-600 shadow-sm" : 
                        n.type === 'success' ? "bg-green-100 text-green-600 shadow-sm" : "bg-blue-100 text-blue-600 shadow-sm"
                      )}>
                        {n.type === 'message' ? <MessageSquare size={22} /> : 
                         n.type === 'success' ? <CheckCircle2 size={22} /> : <Bell size={22} />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className={cn(
                              "text-base font-black tracking-tight",
                              n.unread ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {n.title}
                            </h4>
                            <p className="text-sm font-bold text-muted-foreground leading-relaxed italic">
                              "{n.description}"
                            </p>
                          </div>
                          <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest mt-1 text-right">
                            {n.time}
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Delete */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(n.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-3 rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all text-muted-foreground/30"
                      >
                        <Trash2 size={18} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-muted-foreground/30">
              <Bell size={48} />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-foreground">Você está em dia!</h3>
              <p className="text-sm font-bold text-muted-foreground">Nenhuma notificação encontrada nesta categoria.</p>
            </div>
            <Button 
              variant="primary" 
              className="rounded-2xl px-8 bg-foreground text-background hover:bg-[#B8924A] hover:text-white"
              onClick={() => setActiveTab('all')}
            >
              Ver Tudo
            </Button>
          </div>
        )}
      </div>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
