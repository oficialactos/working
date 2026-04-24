'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Send,
  Image as ImageIcon,
  MapPin,
  Phone,
  MoreVertical,
  CheckCheck,
  Search,
  MessageSquare,
  Award,
  Info,
  Shield,
  CreditCard,
  Mic,
  Square,
  Trash2,
  Camera,
  Film,
  Paperclip,
  Plus,
  X,
  Circle,
  Zap,
  RefreshCw,
  RotateCcw,
  Check,
  ArrowLeft,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Play, Pause } from 'lucide-react';

// Custom Premium Audio Player Component
function CustomAudioPlayer({ src }: { src: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration;
      setProgress((current / total) * 100);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/5 min-w-[240px] group/audio">
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={onTimeUpdate} 
        onLoadedMetadata={onLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-[#B8924A] flex items-center justify-center text-[#141B25] hover:scale-105 transition-transform shrink-0 shadow-lg shadow-[#B8924A]/20"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1.5">
        <div className="relative h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="absolute top-0 left-0 h-full bg-[#B8924A] rounded-full"
          />
        </div>
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/40">
          <span>{formatTime(audioRef.current?.currentTime || 0)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from 'react';

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-background min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B8924A] border-t-transparent" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageText, setEditMessageText] = useState('');
  const [contextMenu, setContextMenu] = useState<{ id: string, x: number, y: number } | null>(null);
  const [toast, setToast] = useState<{ show: boolean, msg: string } | null>(null);
  
  // Multimedia States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecordingCamera, setIsRecordingCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideoBlob, setCapturedVideoBlob] = useState<Blob | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [isHeaderOptionsOpen, setIsHeaderOptionsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cameraMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const triggerToast = (msg: string) => {
    setToast({ show: true, msg });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const initChat = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUser(session.user);
      
      await fetchChats(session.user.id);

      // Check for chat ID in URL
      const chatIdFromUrl = searchParams.get('id');
      if (chatIdFromUrl) {
        setSelectedChatId(chatIdFromUrl);
      }
    };

    initChat();
  }, [searchParams]);

  const fetchChats = async (userId: string) => {
    setLoadingChats(true);
    const { data, error } = await supabase
      .from('chats')
      .select(`
        *,
        request:service_requests(title, category),
        client:profiles!client_id(id, full_name, avatar_url, rating_avg, rating_count),
        provider:profiles!provider_id(id, full_name, avatar_url, rating_avg, rating_count)
      `)
      .or(`client_id.eq.${userId},provider_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setChats(data);
    }
    setLoadingChats(false);
  };

  useEffect(() => {
    if (!selectedChatId) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', selectedChatId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
      setLoadingMessages(false);
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`chat:${selectedChatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${selectedChatId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.find(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageText.trim() || !selectedChatId || !user) return;

    const content = messageText.trim();
    setMessageText('');

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      chat_id: selectedChatId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      is_read: false,
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from('messages')
      .insert({ chat_id: selectedChatId, sender_id: user.id, content })
      .select()
      .single();

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      triggerToast('Erro ao enviar mensagem');
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === tempId ? data : m));
    }
  };

  const handleDeleteMessage = async (id: string) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) {
      triggerToast('Erro ao excluir mensagem');
    } else {
      setContextMenu(null);
    }
  };

  const handleClearChat = async () => {
    if (!selectedChatId) return;
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', selectedChatId);

      if (error) throw error;
      setMessages([]);
      triggerToast("Conversa limpa com sucesso.");
    } catch (error) {
      console.error('Error clearing chat:', error);
      triggerToast("Erro ao limpar conversa.");
    }
  };

  const handleBlockUser = async () => {
    if (!otherPerson) return;
    try {
      triggerToast(`${otherPerson.full_name} foi bloqueado.`);
    } catch (error) {
      triggerToast("Erro ao bloquear usuário.");
    }
  };

  const handleUpdateMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editMessageText.trim() || !editingMessageId) return;

    const { error } = await supabase
      .from('messages')
      .update({ content: editMessageText.trim() })
      .eq('id', editingMessageId);

    if (error) {
      triggerToast('Erro ao editar mensagem');
    } else {
      setEditingMessageId(null);
      setEditMessageText('');
    }
  };

  // --- MULTIMEDIA HANDLERS ---

  const handleSendMedia = async (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChatId || !user) return;

    const isVideo = file.type.startsWith('video/');
    const typeLabel = isVideo ? 'VIDEO' : 'IMAGE';

    try {
      const fileExt = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
      const fileName = `${selectedChatId}/${Date.now()}.${fileExt}`;
      
      triggerToast(isVideo ? 'Enviando vídeo...' : 'Enviando foto...');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      await supabase.from('messages').insert({
        chat_id: selectedChatId,
        sender_id: user.id,
        content: `[${typeLabel}]:${publicUrl}`
      });
      
      setShowMediaMenu(false);
    } catch (err) {
      console.error(err);
      triggerToast('Erro ao enviar mídia.');
    }
  };

  // --- CUSTOM CAMERA HANDLERS ---

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' },
        audio: true 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setShowMediaMenu(false);
    } catch (err) {
      console.error('Camera access error:', err);
      triggerToast('Erro ao acessar a câmera. Verifique as permissões.');
    }
  };

  useEffect(() => {
    if (isCameraOpen && cameraStream && videoPreviewRef.current && !capturedImage && !capturedVideoUrl) {
      videoPreviewRef.current.srcObject = cameraStream;
    }
  }, [isCameraOpen, cameraStream, capturedImage, capturedVideoUrl]);

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
    setIsRecordingCamera(false);
    setCapturedImage(null);
    setCapturedVideoBlob(null);
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl);
      setCapturedVideoUrl(null);
    }
  };

  const capturePhoto = () => {
    if (!videoPreviewRef.current) return;

    const video = videoPreviewRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(dataUrl);
  };

  const handleSendCapturedMedia = async () => {
    if (!selectedChatId || !user) return;

    try {
      if (capturedImage) {
        triggerToast('Enviando foto...');
        // Convert dataUrl to blob
        const res = await fetch(capturedImage);
        const blob = await res.blob();
        const fileName = `${selectedChatId}/camera_${Date.now()}.jpg`;
        
        const { error } = await supabase.storage.from('chat-attachments').upload(fileName, blob);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
          await supabase.from('messages').insert({
            chat_id: selectedChatId,
            sender_id: user.id,
            content: `[IMAGE]:${publicUrl}`
          });
        }
      } else if (capturedVideoBlob) {
        triggerToast('Enviando vídeo...');
        const fileName = `${selectedChatId}/camera_vid_${Date.now()}.webm`;
        const { error } = await supabase.storage.from('chat-attachments').upload(fileName, capturedVideoBlob);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('chat-attachments').getPublicUrl(fileName);
          await supabase.from('messages').insert({
            chat_id: selectedChatId,
            sender_id: user.id,
            content: `[VIDEO]:${publicUrl}`
          });
        }
      }
      closeCamera();
    } catch (err) {
      triggerToast('Erro ao enviar mídia');
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setCapturedVideoBlob(null);
    if (capturedVideoUrl) {
      URL.revokeObjectURL(capturedVideoUrl);
      setCapturedVideoUrl(null);
    }
  };

  const startCameraVideo = () => {
    if (!cameraStream) return;
    console.log('Iniciando gravação de vídeo...');
    cameraChunksRef.current = [];
    const recorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        cameraChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      console.log('Gravação parada. Processando chunks:', cameraChunksRef.current.length);
      const videoBlob = new Blob(cameraChunksRef.current, { type: 'video/webm' });
      console.log('Blob de vídeo criado. Tamanho:', videoBlob.size);
      
      if (videoBlob.size > 0) {
        const url = URL.createObjectURL(videoBlob);
        setCapturedVideoBlob(videoBlob);
        setCapturedVideoUrl(url);
      } else {
        triggerToast('Erro: Vídeo não capturado corretamente');
      }
    };

    recorder.start(200); // Captura dados a cada 200ms
    cameraMediaRecorderRef.current = recorder;
    setIsRecordingCamera(true);
  };

  const stopCameraVideo = () => {
    if (cameraMediaRecorderRef.current) {
      cameraMediaRecorderRef.current.stop();
      setIsRecordingCamera(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        console.log('Gravadora parada. Processando áudio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        if (audioBlob.size === 0) {
          console.error('Blob de áudio está vazio');
          triggerToast('Erro: Áudio não capturado');
          return;
        }

        const fileName = `${selectedChatId}/audio_${Date.now()}.webm`;
        
        console.log('Fazendo upload para chat-attachments:', fileName);
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, audioBlob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Erro no upload do áudio:', uploadError);
          triggerToast('Erro ao salvar áudio. Verifique o Storage.');
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(fileName);

        console.log('Áudio enviado com sucesso. URL:', publicUrl);
        await supabase.from('messages').insert({
          chat_id: selectedChatId,
          sender_id: user.id,
          content: `[AUDIO]:${publicUrl}`
        });
        
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(200); // Coleta dados a cada 200ms para maior precisão
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      triggerToast('Erro ao acessar microfone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendLocation = () => {
    if (!navigator.geolocation) {
      triggerToast('Geolocalização não suportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      await supabase.from('messages').insert({
        chat_id: selectedChatId,
        sender_id: user.id,
        content: `[LOCATION]:${latitude},${longitude}`
      });
    }, () => {
      triggerToast('Erro ao obter localização');
    });
  };

  const activeChat = chats.find(c => c.id === selectedChatId);
  const otherPerson = activeChat ? (user?.id === activeChat.client_id ? activeChat.provider : activeChat.client) : null;
  const isProvider = user?.user_metadata?.role === 'provider';

  return (
    <div className="chat-layout-premium">
      {/* Sidebar de Conversas */}
      <aside className="chat-sidebar-v2">
        <div className="sidebar-header">
          <h2 className="sidebar-title">Mensagens</h2>
          <div className="search-pill-v2">
            <Search size={16} />
            <input type="text" placeholder="Pesquisar..." />
          </div>
        </div>

        <div className="chats-scroller">
          {loadingChats ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : chats.length > 0 ? (
            chats.map((chat) => {
              const other = user?.id === chat.client_id ? chat.provider : chat.client;
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`chat-row-premium ${selectedChatId === chat.id ? 'active' : ''}`}
                >
                  <div className="avatar-wrapper overflow-hidden">
                     {other?.avatar_url ? (
                       <img src={other.avatar_url} alt={other.full_name} className="w-12 h-12 rounded-[14px] object-cover" />
                     ) : (
                       <div className="avatar-placeholder">
                         {other?.full_name?.charAt(0) || '?'}
                       </div>
                     )}
                     <div className={`status-dot online`} />
                   </div>

                  <div className="chat-row-content">
                    <div className="row-top">
                      <span className="user-name">{other?.full_name}</span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="p-10 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Nenhuma conversa</p>
            </div>
          )}
        </div>
      </aside>

      {/* Janela de Mensagens */}
      <main className="chat-window-premium">
        {selectedChatId && activeChat && otherPerson ? (
          <>
            <header className="chat-top-header">
              <div className="header-contact">
                <button 
                  onClick={() => {
                    setSelectedChatId(null);
                    router.push('/dashboard/chat');
                  }}
                  className="mr-2 p-2 bg-muted/50 rounded-xl text-muted-foreground hover:text-[#B8924A] transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="header-avatar overflow-hidden">
                   {otherPerson.avatar_url ? (
                     <img src={otherPerson.avatar_url} alt={otherPerson.full_name} className="w-full h-full object-cover" />
                   ) : (
                     otherPerson.full_name?.charAt(0)
                   )}
                 </div>
                <div className="header-details">
                  <h3>{otherPerson.full_name}</h3>
                  <div className="status-badge-inline">
                    <span className="dot online" />
                    <span className="capitalize">Online</span>
                  </div>
                </div>
              </div>
              <div className="header-actions relative">
                <button
                  className="h-action-btn"
                  onClick={() => triggerToast(`Iniciando chamada com ${otherPerson.full_name}...`)}
                >
                  <Phone size={20} />
                </button>
                <button
                  className={cn("h-action-btn", isHeaderOptionsOpen && "bg-muted text-foreground")}
                  onClick={() => setIsHeaderOptionsOpen(!isHeaderOptionsOpen)}
                >
                  <MoreVertical size={20} />
                </button>

                <AnimatePresence>
                  {isHeaderOptionsOpen && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsHeaderOptionsOpen(false)}
                        className="fixed inset-0 z-40"
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full right-0 mt-2 w-56 bg-[#1A222C] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <button 
                          onClick={() => {
                            setIsHeaderOptionsOpen(false);
                            setShowDetails(!showDetails);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/70 transition-all border-b border-white/5"
                        >
                          <User size={16} className="text-[#B8924A]" /> {showDetails ? 'Esconder Perfil' : 'Ver Perfil'}
                        </button>
                        <button 
                          onClick={() => {
                            setIsHeaderOptionsOpen(false);
                            if (confirm("Tem certeza que deseja limpar esta conversa? Todas as mensagens serão apagadas para você.")) {
                              handleClearChat();
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/70 transition-all border-b border-white/5"
                        >
                          <Trash2 size={16} className="text-[#B8924A]" /> Limpar Conversa
                        </button>
                        <button 
                          onClick={() => {
                            setIsHeaderOptionsOpen(false);
                            if (confirm(`Deseja realmente bloquear ${otherPerson.full_name}?`)) {
                              handleBlockUser();
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-red-500/10 text-[10px] font-black uppercase tracking-widest text-red-400 transition-all"
                        >
                          <Shield size={16} /> Bloquear Usuário
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </header>

            <div className="messages-container">
              {loadingMessages ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B8924A] border-t-transparent" />
                </div>
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const isEditing = editingMessageId === msg.id;

                  return (
                    <div 
                      key={msg.id} 
                      className={`msg-wrapper ${isMe ? 'me' : 'them'}`}
                      onContextMenu={(e) => {
                        if (isMe) {
                          e.preventDefault();
                          setContextMenu({ id: msg.id, x: e.clientX, y: e.clientY });
                        }
                      }}
                    >
                      <div className="msg-payload relative group">
                        {isEditing ? (
                          <form onSubmit={handleUpdateMessage} className="flex flex-col gap-2">
                            <input 
                              autoFocus
                              className="bg-transparent border-none outline-none font-bold italic w-full text-sm"
                              value={editMessageText}
                              onChange={(e) => setEditMessageText(e.target.value)}
                            />
                            <div className="flex gap-2 justify-end">
                              <button type="button" onClick={() => setEditingMessageId(null)} className="text-[10px] font-black uppercase opacity-50">Cancelar</button>
                              <button type="submit" className="text-[10px] font-black uppercase text-[#B8924A]">Salvar</button>
                            </div>
                          </form>
                        ) : (
                          <>
                            {msg.content.startsWith('[IMAGE]:') ? (
                              <div className="rounded-xl overflow-hidden mb-1 max-w-[300px] border border-white/10 shadow-lg">
                                <img src={msg.content.replace('[IMAGE]:', '')} alt="Anexo" className="w-full h-auto cursor-pointer" onClick={() => window.open(msg.content.replace('[IMAGE]:', ''), '_blank')} />
                              </div>
                            ) : msg.content.startsWith('[VIDEO]:') ? (
                              <div className="rounded-xl overflow-hidden mb-1 max-w-[300px] border border-white/10 shadow-lg bg-black">
                                <video src={msg.content.replace('[VIDEO]:', '')} controls className="w-full h-auto max-h-[400px]" />
                              </div>
                            ) : msg.content.startsWith('[LOCATION]:') ? (
                              <div 
                                className="flex flex-col gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  const [lat, lng] = msg.content.replace('[LOCATION]:', '').split(',');
                                  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                }}
                              >
                                <div className="bg-[#B8924A]/20 p-3 rounded-xl flex items-center gap-3 border border-[#B8924A]/30">
                                  <MapPin className="text-[#B8924A]" size={20} />
                                  <span className="text-xs font-black uppercase tracking-widest">Localização Compartilhada</span>
                                </div>
                              </div>
                            ) : msg.content.startsWith('[AUDIO]:') ? (
                              <div className="py-1">
                                <CustomAudioPlayer src={msg.content.replace('[AUDIO]:', '')} />
                              </div>
                            ) : (
                              <p>{msg.content}</p>
                            )}
                            <div className="msg-info">
                              <span className="m-time">{time}</span>
                              {isMe && <CheckCheck size={14} className="check-icon" />}
                            </div>
                          </>
                        )}

                        {/* Options button for Desktop hover */}
                        {isMe && !isEditing && (
                          <button 
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setContextMenu({ id: msg.id, x: rect.left, y: rect.top });
                            }}
                            className="absolute -left-8 top-1/2 -translate-y-1/2 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30">
                  <MessageSquare size={48} className="mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">Inicie a conversa</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="chat-footer-v2">
              <div className="action-tools relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*,video/*" 
                  onChange={(e) => handleSendMedia(e)}
                />
                
                <AnimatePresence>
                  {showMediaMenu && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 20, scale: 0.9 }}
                      className="absolute bottom-full left-0 mb-4 bg-[#1A222C] border border-white/10 rounded-2xl p-2 shadow-2xl min-w-[180px] z-50 overflow-hidden"
                    >
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 transition-all"
                      >
                        <ImageIcon size={16} className="text-[#B8924A]" /> Galeria
                      </button>
                      <button 
                         onClick={openCamera}
                         className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 transition-all"
                       >
                         <Camera size={16} className="text-[#B8924A]" /> Câmera
                       </button>
                      <div className="h-px bg-white/5 my-1" />
                      <button 
                        onClick={handleSendLocation}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/70 transition-all"
                      >
                        <MapPin size={16} className="text-[#B8924A]" /> Localização
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="button"
                  className={`tool-icon ${showMediaMenu ? 'active bg-[#B8924A]/20 text-[#B8924A]' : ''}`}
                  onClick={() => setShowMediaMenu(!showMediaMenu)}
                >
                  <Plus size={22} className={`transition-transform duration-300 ${showMediaMenu ? 'rotate-45' : ''}`} />
                </button>
              </div>
              
              {isRecording ? (
                <div className="flex-1 flex items-center justify-between bg-[#B8924A]/10 px-6 py-3 rounded-full border border-[#B8924A]/30 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-widest text-[#B8924A]">Gravando... {formatTime(recordingTime)}</span>
                  </div>
                  <button onClick={stopRecording} className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/30 transition-colors">
                    <Square size={16} className="text-red-500 fill-red-500" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="input-pill-wrapper">
                  <input
                    type="text"
                    placeholder="Escreva sua mensagem..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <div className="flex items-center gap-1">
                    <button 
                      type="button" 
                      onClick={startRecording}
                      className="tool-icon-small hover:text-[#B8924A]"
                    >
                      <Mic size={20} />
                    </button>
                    <button type="submit" className="send-circle-btn">
                      <Send size={18} />
                    </button>
                  </div>
                </form>
              )}
            </footer>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="empty-state-icon">
              <MessageSquare size={40} />
            </div>
            <h3>Sua Central de Mensagens</h3>
            <p>Selecione um contato na esquerda para visualizar a conversa e negociar serviços.</p>
          </div>
        )}
      </main>

      {/* Sidebar Detalhes (DIREITA) */}
      {selectedChatId && activeChat && otherPerson && (
        <aside className="chat-aside-details">
          <div className="aside-scroll">
            {/* Botão de Voltar para Mobile ao ver Detalhes */}
            <div className="md:hidden mb-6">
               <button 
                 onClick={() => setShowDetails(false)}
                 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#B8924A] bg-[#B8924A]/10 px-4 py-2 rounded-xl"
               >
                 <ArrowLeft size={16} /> Voltar para o Chat
               </button>
            </div>

            {isProvider ? (
              /* PROVIDER VIEW: Detalhes do Lead */
              <div className="detail-section">
                <div className="section-header">
                  <div className="icon-box"><MapPin size={18} /></div>
                  <h4>Detalhes da Solicitação</h4>
                </div>

                <div className="lead-card-premium">
                  <div className="l-item">
                    <span className="l-label">Serviço</span>
                    <p className="l-value">{activeChat.request?.title}</p>
                  </div>
                  <div className="l-item">
                    <span className="l-label">Categoria</span>
                    <Badge className="bg-[#B8924A] text-white font-black uppercase text-[10px] tracking-widest border-none">
                      {activeChat.request?.category}
                    </Badge>
                  </div>
                  <div className="l-item">
                    <span className="l-label">Localização</span>
                    <p className="l-value font-black group-hover:text-[#B8924A] transition-colors">
                      {activeChat.request?.city || 'Local Indisponível'}
                    </p>
                  </div>
                </div>

                <div className="action-stack">
                  <button
                    className="btn-primary-gold"
                    onClick={() => triggerToast("Enviando solicitação de orçamento...")}
                  >
                    Gerar Orçamento
                  </button>
                  <button
                    className="btn-outline-dark"
                    onClick={() => triggerToast("Serviço marcado como concluído.")}
                  >
                    Marcar como Concluído
                  </button>
                </div>

                <div className="warning-box">
                  <Info size={16} />
                  <p>Lembre-se: Combine o valor e o prazo diretamente com o cliente.</p>
                </div>
              </div>
            ) : (
              /* CLIENT VIEW: Perfil do Profissional */
              <div className="detail-section">
                <div className="provider-mini-card">
                   <div className="p-avatar-large overflow-hidden border-2 border-[#B8924A]/20">
                     {otherPerson.avatar_url ? (
                       <img src={otherPerson.avatar_url} alt={otherPerson.full_name} className="w-full h-full object-cover" />
                     ) : (
                       <>
                         {otherPerson.full_name?.charAt(0)}
                         
                       </>
                     )}
                   </div>
                  <h4 className="p-name">{otherPerson.full_name}</h4>
                  

                  <div className="p-stats-row">
                    <div className="s-block">
                      <span className="s-val">{otherPerson.rating_avg || '5.0'}</span>
                      <span className="s-lbl">Rating</span>
                    </div>
                    <div className="s-divider" />
                    <div className="s-block">
                      <span className="s-val">{otherPerson.rating_count || '0'}</span>
                      <span className="s-lbl">Trabalhos</span>
                    </div>
                  </div>
                </div>

                <div className="action-stack">
                  <button
                    className="btn-primary-gold"
                    onClick={() => triggerToast(`Abrindo portfólio de ${otherPerson.full_name}...`)}
                  >
                    Ver Portfólio Completo
                  </button>
                  <button
                    className="btn-outline-dark"
                    onClick={() => triggerToast("Enviando confirmação de contratação...")}
                  >
                    Confirmar Contratação
                  </button>
                </div>

                <div className="safety-card">
                  <Shield size={20} className="text-[#B8924A]" />
                  <div className="s-info">
                    <p className="s-title">Dica de Segurança</p>
                    <p className="s-desc">Negocie valores e prazos via chat. Confirme o serviço apenas após o orçamento final.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <div className="fixed inset-0 z-[999]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              style={{ 
                top: Math.min(contextMenu.y, typeof window !== 'undefined' ? window.innerHeight - 120 : contextMenu.y), 
                left: Math.min(contextMenu.x, typeof window !== 'undefined' ? window.innerWidth - 160 : contextMenu.x) 
              }}
              className="absolute bg-[#1A222C]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[150px] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => {
                  const msg = messages.find(m => m.id === contextMenu.id);
                  if (msg) {
                    setEditingMessageId(msg.id);
                    setEditMessageText(msg.content);
                  }
                  setContextMenu(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-white/80 transition-all hover:translate-x-1"
              >
                Editar Mensagem
              </button>
              <div className="h-px bg-white/5 my-1 mx-2" />
              <button 
                onClick={() => handleDeleteMessage(contextMenu.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-red-400 transition-all hover:translate-x-1"
              >
                Excluir
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

       {/* Camera Modal */}
       <AnimatePresence>
         {isCameraOpen && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-[100] bg-black flex flex-col"
           >
             <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
               <button onClick={closeCamera} className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white">
                 <X size={24} />
               </button>
               {!capturedImage && !capturedVideoBlob && (
                 <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/10">
                   <button 
                     onClick={() => setCameraMode('photo')}
                     className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${cameraMode === 'photo' ? 'bg-white text-black' : 'text-white/60'}`}
                   >
                     Foto
                   </button>
                   <button 
                     onClick={() => setCameraMode('video')}
                     className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${cameraMode === 'video' ? 'bg-white text-black' : 'text-white/60'}`}
                   >
                     Vídeo
                   </button>
                 </div>
               )}
               <div className="w-12" /> {/* Spacer */}
             </div>

             {capturedImage ? (
               <img src={capturedImage} className="flex-1 object-cover" alt="Captured" />
             ) : capturedVideoUrl ? (
               <video src={capturedVideoUrl} controls autoPlay loop className="flex-1 object-cover" />
             ) : (
               <video 
                 ref={videoPreviewRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 className="flex-1 object-cover"
               />
             )}

             <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-8 px-6">
               {isRecordingCamera && (
                 <div className="bg-red-500 px-4 py-1 rounded-full animate-pulse text-[10px] font-black uppercase tracking-widest">
                   Gravando Vídeo
                 </div>
               )}
               
               {capturedImage || capturedVideoBlob ? (
                 <div className="w-full flex justify-between items-center gap-4 max-w-sm">
                   <button 
                     onClick={retake}
                     className="flex-1 bg-white/10 backdrop-blur-md border border-white/10 text-white py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                   >
                     <RotateCcw size={18} /> Refazer
                   </button>
                   <button 
                     onClick={handleSendCapturedMedia}
                     className="flex-1 bg-[#B8924A] text-black py-4 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-[#B8924A]/20"
                   >
                     <Check size={18} /> Enviar
                   </button>
                 </div>
               ) : (
                 <>
                   <button 
                     onClick={cameraMode === 'photo' ? capturePhoto : (isRecordingCamera ? stopCameraVideo : startCameraVideo)}
                     className={`w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-90 ${isRecordingCamera ? 'bg-red-500 border-red-500/30' : 'bg-transparent'}`}
                   >
                     <div className={`rounded-full transition-all ${isRecordingCamera ? 'w-8 h-8 bg-white' : 'w-14 h-14 bg-white'}`} />
                   </button>

                   <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                     {cameraMode === 'photo' ? 'Toque para tirar foto' : (isRecordingCamera ? 'Toque para parar' : 'Toque para gravar')}
                   </p>
                 </>
               )}
             </div>
           </motion.div>
         )}
       </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast?.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] bg-[#141B25] text-white px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-[#B8924A]/30 min-w-[320px]"
          >
            <div className="w-8 h-8 rounded-full bg-[#B8924A] flex items-center justify-center text-[#141B25]">
              <CheckCheck size={16} />
            </div>
            <p className="font-black text-xs uppercase tracking-widest">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .chat-layout-premium {
          display: flex;
          height: 100%;
          background: hsl(var(--card));
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid var(--glass-border);
        }

        /* SIDEBAR */
        .chat-sidebar-v2 {
          width: 320px;
          background: hsl(var(--sidebar-bg));
          border-right: 1px solid var(--glass-border);
          display: ${selectedChatId ? 'none' : 'flex'};
          flex-direction: column;
          min-height: 0;
        }

        .chat-window-premium {
          flex: 1;
          display: ${selectedChatId ? 'flex' : 'none'};
          flex-direction: column;
          background: hsl(var(--card));
          min-height: 0;
        }

        .sidebar-header {
          padding: 2rem 1.5rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .sidebar-title {
          font-size: 1.4rem;
          font-weight: 900;
          color: hsl(var(--foreground) / 0.9);
          letter-spacing: -1px;
        }

        .search-pill-v2 {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0.7rem 1rem;
          background: hsl(var(--muted) / 0.5);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          color: hsl(var(--muted-foreground));
        }

        .search-pill-v2 input {
          border: none;
          background: none;
          outline: none;
          width: 100%;
          font-size: 0.85rem;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .search-pill-v2 input::placeholder { color: hsl(var(--muted-foreground) / 0.5); }

        .chats-scroller {
          flex: 1;
          overflow-y: auto;
          padding: 0 1rem 1rem;
          min-height: 0;
          overscroll-behavior-y: contain;
        }

        .chat-row-premium {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 20px;
          margin-bottom: 0.4rem;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .chat-row-premium:hover { background: hsl(var(--muted) / 0.4); }

        .chat-row-premium.active {
          background: rgba(184,146,74,0.10);
          border-color: rgba(184,146,74,0.20);
        }

        .avatar-placeholder {
          width: 48px;
          height: 48px;
          background: hsl(var(--muted));
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          color: hsl(var(--muted-foreground));
          font-size: 1.1rem;
        }

        .active .avatar-placeholder {
          background: rgba(184,146,74,0.15);
          color: #B8924A;
        }

        .avatar-wrapper { position: relative; }
        .status-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2.5px solid hsl(var(--sidebar-bg));
        }
        .active .status-dot { border-color: hsl(var(--card)); }
        .status-dot.online  { background: #22c55e; }
        .status-dot.offline { background: hsl(var(--muted-foreground) / 0.3); }

        .chat-row-content { flex: 1; text-align: left; }
        .row-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
        .user-name { font-weight: 900; font-size: 0.9rem; color: hsl(var(--foreground)); }
        .active .user-name { color: #B8924A; }
        .timestamp { font-size: 0.7rem; color: hsl(var(--muted-foreground)); font-weight: 700; }

        .row-bottom { display: flex; justify-content: space-between; align-items: center; }
        .last-message { font-size: 0.8rem; color: hsl(var(--muted-foreground)); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
        .active .last-message { color: hsl(var(--foreground) / 0.7); }
        .unread-dot { background: #B8924A; color: white; font-size: 0.65rem; font-weight: 900; padding: 2px 8px; border-radius: 100px; }

        /* MAIN CHAT WINDOW */

        .chat-top-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-contact { display: flex; align-items: center; gap: 0.8rem; }
        .header-avatar {
          width: 42px;
          height: 42px;
          background: rgba(184,146,74,0.15);
          color: #B8924A;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .header-details h3 { font-size: 1rem; font-weight: 900; color: hsl(var(--foreground)); margin-bottom: 2px; }
        .status-badge-inline { display: flex; align-items: center; gap: 6px; font-size: 0.7rem; font-weight: 800; color: hsl(var(--muted-foreground)); }
        .status-badge-inline .dot { width: 5px; height: 5px; background: hsl(var(--muted)); border-radius: 50%; }
        .status-badge-inline .dot.online { background: #22c55e; }

        .h-action-btn { padding: 8px; color: hsl(var(--muted-foreground)); transition: all 0.2s; border-radius: 10px; }
        .h-action-btn:hover { color: hsl(var(--foreground)); background: hsl(var(--muted)); }

        .messages-container {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          background-image: radial-gradient(var(--dot-color) 1.5px, transparent 1.5px);
          background-size: 40px 40px;
          min-height: 0;
          overscroll-behavior-y: contain;
        }

        .date-divider { display: flex; justify-content: center; margin: 1rem 0; }
        .date-divider span {
          background: #B8924A;
          padding: 4px 14px;
          border-radius: 100px;
          font-size: 0.65rem;
          font-weight: 900;
          color: white;
          text-transform: uppercase;
        }

        .msg-wrapper { display: flex; width: 100%; }
        .msg-wrapper.me { justify-content: flex-end; }

        .msg-payload {
          max-width: 70%;
          padding: 1rem 1.4rem;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }

        .me .msg-payload {
          background: rgba(184,146,74,0.18);
          color: hsl(var(--foreground));
          border-bottom-right-radius: 4px;
          border: 1px solid rgba(184,146,74,0.25);
        }

        .them .msg-payload {
          background: hsl(var(--muted) / 0.5);
          color: hsl(var(--foreground));
          border-bottom-left-radius: 4px;
          border: 1px solid var(--glass-border);
        }

        .msg-payload p { font-size: 0.9rem; font-weight: 600; line-height: 1.5; }

        .msg-info {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 5px;
          margin-top: 6px;
          font-size: 0.65rem;
          font-weight: 800;
          opacity: 0.4;
        }

        .chat-footer-v2 {
          padding: 1.2rem 2rem;
          background: hsl(var(--sidebar-bg));
          border-top: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          gap: 1.2rem;
        }

        .action-tools { display: flex; gap: 0.4rem; }
        .tool-icon { padding: 10px; color: hsl(var(--muted-foreground)); transition: all 0.2s; border-radius: 12px; }
        .tool-icon:hover { color: hsl(var(--foreground)); background: hsl(var(--muted)); }

        .input-pill-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          background: hsl(var(--muted) / 0.5);
          border: 1px solid var(--glass-border);
          padding: 4px 4px 4px 18px;
          border-radius: 18px;
          transition: all 0.2s;
        }

        .input-pill-wrapper:focus-within {
          background: hsl(var(--muted) / 0.8);
          border-color: rgba(184,146,74,0.40);
          box-shadow: 0 0 0 3px rgba(184,146,74,0.08);
        }

        .input-pill-wrapper input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          font-size: 0.9rem;
          font-weight: 600;
          padding: 0.7rem 0;
          color: hsl(var(--foreground));
        }

        .input-pill-wrapper input::placeholder { color: hsl(var(--muted-foreground) / 0.6); }

        .send-circle-btn {
          width: 44px;
          height: 44px;
          background: #B8924A;
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-shadow: 0 0 16px rgba(184,146,74,0.30);
        }
        .send-circle-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(184,146,74,0.45);
        }

        .no-chat-selected {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: hsl(var(--card));
        }

        .empty-state-icon {
          width: 80px;
          height: 80px;
          background: hsl(var(--muted) / 0.5);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--muted-foreground));
          margin-bottom: 2rem;
        }

        /* ASIDE DETAILS */
        .chat-aside-details {
          width: 300px;
          background: hsl(var(--sidebar-bg));
          border-left: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .aside-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 2rem 1.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1.5rem;
        }

        .icon-box {
          width: 36px;
          height: 36px;
          background: rgba(184,146,74,0.12);
          border: 1px solid rgba(184,146,74,0.20);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #B8924A;
        }

        .section-header h4 {
          font-size: 0.85rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: hsl(var(--foreground) / 0.7);
        }

        .lead-card-premium {
          background: hsl(var(--muted) / 0.3);
          border-radius: 24px;
          padding: 1.5rem;
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
          margin-bottom: 2rem;
        }

        .l-item { display: flex; flex-direction: column; gap: 4px; }
        .l-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; color: hsl(var(--muted-foreground)); letter-spacing: 1px; }
        .l-value { font-size: 0.9rem; font-weight: 800; color: hsl(var(--foreground) / 0.8); }

        .action-stack {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          margin-bottom: 2rem;
        }

        .btn-primary-gold {
          width: 100%;
          background: #B8924A;
          color: white;
          padding: 1.2rem;
          border-radius: 16px;
          font-weight: 900;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.2s;
          box-shadow: 0 0 20px rgba(184,146,74,0.25);
        }

        .btn-primary-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(184,146,74,0.40);
        }

        .btn-outline-dark {
          width: 100%;
          background: transparent;
          border: 1px solid var(--glass-border);
          color: hsl(var(--muted-foreground));
          padding: 1.2rem;
          border-radius: 16px;
          font-weight: 900;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.2s;
        }

        .btn-outline-dark:hover {
          background: hsl(var(--muted) / 0.5);
          border-color: hsl(var(--muted-foreground) / 0.3);
          color: hsl(var(--foreground));
        }

        .warning-box {
          background: hsl(45 93% 47% / 0.1);
          border: 1px solid hsl(45 93% 47% / 0.2);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          gap: 10px;
          color: hsl(45 93% 47% / 0.8);
          font-size: 0.7rem;
          font-weight: 700;
          font-style: italic;
        }

        .provider-mini-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .p-avatar-large {
          width: 80px;
          height: 80px;
          background: rgba(184,146,74,0.15);
          color: #B8924A;
          border: 1px solid rgba(184,146,74,0.25);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          font-weight: 900;
          position: relative;
          margin-bottom: 1rem;
        }

        .p-badge-verified {
          position: absolute;
          top: -10px;
          right: -10px;
          width: 28px;
          height: 28px;
          background: #B8924A;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid hsl(var(--sidebar-bg));
        }

        .p-name  { font-size: 1.2rem; font-weight: 900; color: hsl(var(--foreground)); margin-bottom: 4px; }
        .p-title { font-size: 0.8rem; font-weight: 700; color: hsl(var(--muted-foreground)); margin-bottom: 1.5rem; }
        
        .p-stats-row {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 1rem 2rem;
          background: hsl(var(--muted) / 0.5);
          border-radius: 100px;
          border: 1px solid var(--glass-border);
        }

        .s-block { display: flex; flex-direction: column; }
        .s-val { font-size: 1rem; font-weight: 900; color: hsl(var(--foreground)); }
        .s-lbl { font-size: 0.6rem; font-weight: 800; color: hsl(var(--muted-foreground)); text-transform: uppercase; letter-spacing: 0.5px; }
        .s-divider { width: 1px; height: 24px; background: var(--glass-border); }

        .safety-card {
          margin-top: 1rem;
          background: rgba(184,146,74,0.06);
          border-radius: 20px;
          padding: 1.2rem;
          border: 1px dashed rgba(184,146,74,0.20);
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }

        .s-title { font-size: 0.75rem; font-weight: 900; color: rgba(255,255,255,0.75); margin-bottom: 4px; }
        .s-desc  { font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.35); line-height: 1.4; }

        .no-chat-selected h3 { font-size: 1.4rem; font-weight: 900; color: hsl(var(--foreground)); margin-bottom: 0.5rem; }
        .no-chat-selected p { color: hsl(var(--muted-foreground)); font-weight: 600; max-width: 300px; font-size: 0.9rem; text-align: center; }

        @media (max-width: 1024px) {
          .chat-aside-details { 
            display: ${showDetails ? 'flex' : 'none'}; 
            position: fixed;
            inset: 0;
            z-index: 150;
            width: 100% !important;
            background: hsl(var(--background));
          }
        }

        @media (max-width: 768px) {
          .chat-layout-premium {
            height: 100%;
            border-radius: 0;
            border: none;
            background: hsl(var(--background));
            display: flex;
            flex-direction: column;
          }

          ${selectedChatId ? `
            .chat-layout-premium {
              position: fixed;
              inset: 0;
              top: 0;
              bottom: 0;
              z-index: 100;
            }
          ` : ''}

          .chat-sidebar-v2 {
            width: 100% !important;
          }

          .sidebar-header {
            padding: 1.5rem 1rem 1rem;
          }

          .sidebar-header, .chat-row-content, .row-top, .row-bottom {
            display: flex !important;
          }

          .chat-row-premium {
            padding: 0.8rem 1rem;
            gap: 0.8rem;
          }

          .chat-top-header {
            padding: 0.75rem 1rem;
          }

          .header-avatar {
            width: 36px;
            height: 36px;
            border-radius: 10px;
          }

          .header-details h3 {
            font-size: 0.9rem;
          }

          .messages-container {
            padding: 1rem 0.75rem;
            gap: 0.75rem;
          }

          .msg-payload {
            max-width: 90%;
            padding: 0.7rem 0.9rem;
          }

          .msg-payload p {
            font-size: 0.85rem;
          }

          .chat-footer-v2 {
            padding: 0.6rem 0.75rem;
            padding-bottom: 1.2rem;
            gap: 0.75rem;
          }

          .input-pill-wrapper {
            padding: 2px 2px 2px 14px;
            border-radius: 14px;
          }

          .input-pill-wrapper input {
            padding: 0.5rem 0;
            font-size: 0.85rem;
          }

          .send-circle-btn {
            width: 38px;
            height: 38px;
            border-radius: 11px;
          }
        }

        .s-desc  { font-size: 0.65rem; font-weight: 700; color: rgba(255,255,255,0.35); line-height: 1.4; }

      `}</style>
    </div>
  );
}
