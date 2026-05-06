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
  User,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('Audio play error:', err);
      setIsPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !isFinite(audio.duration) || audio.duration === 0) return;
    setCurrentTime(audio.currentTime);
    setProgress((audio.currentTime / audio.duration) * 100);
  };

  const onLoadedMetadata = () => {
    if (audioRef.current && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = barRef.current;
    if (!audio || !bar || !isFinite(audio.duration)) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setProgress(ratio * 100);
    setCurrentTime(audio.currentTime);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 bg-muted/30 backdrop-blur-md px-4 py-3 rounded-2xl border border-border min-w-[240px] group/audio">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
      />

      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-[#B8924A] flex items-center justify-center text-white hover:scale-105 transition-transform shrink-0 shadow-lg shadow-[#B8924A]/20"
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1.5">
        <div
          ref={barRef}
          onClick={handleSeek}
          className="relative h-1.5 w-full bg-foreground/10 rounded-full overflow-hidden cursor-pointer"
        >
          <div
            className="absolute top-0 left-0 h-full bg-[#B8924A] rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">
          <span>{formatTime(currentTime)}</span>
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
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileDetails, setProfileDetails] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgTimestamp = useRef<string | null>(null);
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
        request:service_requests(id, title, category),
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

    lastMsgTimestamp.current = null;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', selectedChatId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
        if (data.length > 0) {
          lastMsgTimestamp.current = data[data.length - 1].created_at;
        }
      }
      setLoadingMessages(false);
    };

    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat:${selectedChatId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages((prev) => {
              if (prev.find(m => m.id === payload.new.id)) return prev;
              lastMsgTimestamp.current = payload.new.created_at;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) => prev.map(m => m.id === payload.new.id ? payload.new : m));
          } else if (payload.eventType === 'DELETE') {
            setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.warn('Chat realtime channel error');
        }
      });

    // Polling fallback — busca apenas mensagens mais novas que a última conhecida
    const poll = async () => {
      const query = supabase
        .from('messages')
        .select('*')
        .eq('chat_id', selectedChatId)
        .order('created_at', { ascending: true });

      if (lastMsgTimestamp.current) {
        query.gt('created_at', lastMsgTimestamp.current);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        lastMsgTimestamp.current = data[data.length - 1].created_at;
        setMessages((prev) => {
          const existing = new Set(prev.map(m => m.id));
          const fresh = data.filter(m => !existing.has(m.id));
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
      }
    };

    const pollInterval = setInterval(poll, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [selectedChatId]);

  useEffect(() => {
    const markAsRead = async () => {
      if (!user || !selectedChatId) return;
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('link', `/dashboard/chat?id=${selectedChatId}`)
        .eq('is_read', false);
    };
    markAsRead();
  }, [selectedChatId, user]);

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
      lastMsgTimestamp.current = data.created_at;
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

  useEffect(() => {
    if (!showProfile || !otherPerson?.id) return;
    setProfileDetails(null);
    setLoadingProfile(true);
    (async () => {
      // Fetch base profile
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone, bio, city, cpf_cnpj, created_at, role')
        .eq('id', otherPerson.id)
        .single();

      if (profileErr) {
        console.error('Profile fetch error:', profileErr);
        setLoadingProfile(false);
        return;
      }

      // Fetch provider extras separately
      const { data: providerData, error: providerErr } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('id', otherPerson.id)
        .maybeSingle();
      if (providerErr) console.error('Provider profile fetch error:', providerErr);

      setProfileDetails({ ...profile, provider_profiles: providerData ?? null });
      setLoadingProfile(false);
    })();
  }, [showProfile, otherPerson?.id]);

  return (
    <div className="chat-layout-premium">
      {/* Sidebar de Conversas */}
      <aside className="chat-sidebar-v2">
        <div className="p-5 pb-4 flex flex-col gap-4 border-b border-border/20">
          <h2 className="text-2xl font-black text-foreground tracking-tight">Mensagens</h2>
          <div className="flex items-center gap-2 px-4 py-3 bg-muted/20 border border-border rounded-[16px] text-muted-foreground focus-within:text-[#B8924A] focus-within:border-[#B8924A]/30 transition-all shadow-inner">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="bg-transparent border-none outline-none w-full text-sm font-medium text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
          {loadingChats ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-white/5 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : chats.length > 0 ? (
            chats.map((chat) => {
              const other = user?.id === chat.client_id ? chat.provider : chat.client;
              return (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={cn(
                    "w-full flex items-center gap-3.5 p-3.5 rounded-2xl mb-2 transition-all border text-left",
                    selectedChatId === chat.id 
                      ? "bg-[#B8924A]/10 border-[#B8924A]/30" 
                      : "bg-background border-border hover:bg-muted/50 hover:border-border/50"
                  )}
                >
                  <div className="relative shrink-0">
                     {other?.avatar_url ? (
                       <img src={other.avatar_url} alt={other.full_name} className="w-14 h-14 rounded-full object-cover border-2 border-transparent" />
                     ) : (
                       <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center font-black text-muted-foreground/50 text-xl border border-border">
                         {other?.full_name?.charAt(0) || '?'}
                       </div>
                     )}
                     <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
                   </div>

                   <div className="flex-1 overflow-hidden flex flex-col justify-center">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-foreground truncate pr-2">{other?.full_name}</span>
                        {/* Placeholder for timestamp if needed */}
                        <span className="text-[10px] text-muted-foreground/50 font-medium">Agora</span>
                      </div>
                      
                      {chat.request?.title ? (
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#B8924A]/50 shrink-0" />
                          <span className="text-[11px] font-bold tracking-wide text-[#B8924A] opacity-90 truncate">
                            {chat.request.title.toUpperCase()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 truncate">Toque para ver a conversa</span>
                      )}
                  </div>
                  
                  <div className="shrink-0 pl-2">
                    <ChevronRight size={16} className="text-muted-foreground/30" />
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
                <button className="flex items-center gap-3 hover:opacity-80 transition-opacity" onClick={() => setShowProfile(true)}>
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
                </button>
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    requestAnimationFrame(() => {
                      setIsHeaderOptionsOpen(!isHeaderOptionsOpen);
                    });
                  }}
                  style={{ touchAction: 'none' }}
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
                        className="absolute top-full right-0 mt-2 w-56 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                      >
                        <button 
                          onClick={() => {
                            setIsHeaderOptionsOpen(false);
                            if (confirm("Tem certeza que deseja limpar esta conversa? Todas as mensagens serão apagadas para você.")) {
                              handleClearChat();
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all border-b border-border/10"
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
              {/* Service Context Card */}
              {activeChat.request && otherPerson && (
                <div className="px-4 pt-5 pb-1 mb-2">
                  {/* Unified context card */}
                  <div className="flex items-center gap-0 bg-muted/20 border border-border/20 rounded-2xl overflow-hidden">

                    {/* LEFT — service info */}
                    <div className="flex-1 flex items-center gap-4 px-5 py-4 border-r border-border/20">
                      <div className="w-10 h-10 rounded-xl bg-[#B8924A]/10 border border-[#B8924A]/20 flex items-center justify-center shrink-0">
                        <Zap size={18} className="text-[#B8924A]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#B8924A]/70 mb-0.5">{activeChat.request.category}</p>
                        <h2 className="text-sm font-black text-foreground truncate"> {activeChat.request.title}</h2>
                      </div>
                      <Link
                        href={`/dashboard/client/request/${activeChat.request.id}`}
                        className="shrink-0 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#B8924A]/60 hover:text-[#B8924A] transition-colors"
                      >
                        Detalhes <ChevronRight size={12} />
                      </Link>
                    </div>

                    {/* RIGHT — person info + actions */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="w-9 h-9 rounded-xl bg-[#B8924A]/10 border border-[#B8924A]/20 overflow-hidden shrink-0">
                        {otherPerson.avatar_url
                          ? <img src={otherPerson.avatar_url} alt={otherPerson.full_name} className="w-full h-full object-cover" />
                          : <span className="w-full h-full flex items-center justify-center font-black text-sm text-[#B8924A]">{otherPerson.full_name?.charAt(0)}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-foreground truncate">{otherPerson.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-black text-[#B8924A]">★ {otherPerson.rating_avg || '5.0'}</span>
                          <span className="text-muted-foreground/30 text-[9px]">•</span>
                          <span className="text-[9px] font-black text-muted-foreground/50">{otherPerson.rating_count || '0'} trabalhos</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 ml-2">
                        {isProvider ? (
                          <>
                            <button className="btn-primary-gold" style={{padding: '0.5rem 1rem', fontSize: '0.65rem'}} onClick={() => triggerToast("Gerar orçamento...")}>Orçamento</button>
                            <button className="btn-outline-dark" style={{padding: '0.5rem 1rem', fontSize: '0.65rem'}} onClick={() => triggerToast("Concluído.")}>Concluído</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-primary-gold" style={{padding: '0.5rem 1rem', fontSize: '0.65rem'}} onClick={() => triggerToast(`Portfólio de ${otherPerson.full_name}...`)}>Portfólio</button>
                            <button className="btn-outline-dark" style={{padding: '0.5rem 1rem', fontSize: '0.65rem'}} onClick={() => triggerToast("Confirmando contratação...")}>Contratar</button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-5 mb-1">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/10 to-transparent" />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">Início da Conversa</span>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/10 to-transparent" />
                  </div>
                </div>
              )}

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
                                <img 
                                  src={msg.content.replace('[IMAGE]:', '')} 
                                  alt="Anexo" 
                                  className="w-full h-auto cursor-pointer hover:opacity-90 transition-opacity" 
                                  onClick={() => setSelectedMedia(msg.content.replace('[IMAGE]:', ''))} 
                                />
                              </div>
                            ) : msg.content.startsWith('[VIDEO]:') ? (
                              <div className="rounded-xl overflow-hidden mb-1 max-w-[300px] border border-border shadow-lg bg-black relative group/vid">
                                <video src={msg.content.replace('[VIDEO]:', '')} className="w-full h-auto max-h-[400px]" />
                                <div 
                                  className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover/vid:bg-black/40 transition-all cursor-pointer"
                                  onClick={() => setSelectedMedia(msg.content.replace('[VIDEO]:', ''))}
                                >
                                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <Zap size={24} className="text-white fill-white" />
                                  </div>
                                </div>
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
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = e.currentTarget.getBoundingClientRect();
                              requestAnimationFrame(() => {
                                setContextMenu({ id: msg.id, x: rect.left, y: rect.top });
                              });
                            }}
                            style={{ touchAction: 'none' }}
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
                      className="absolute bottom-full left-0 mb-4 bg-card border border-border rounded-2xl p-2 shadow-2xl min-w-[180px] z-50 overflow-hidden"
                    >
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all"
                      >
                        <ImageIcon size={16} className="text-[#B8924A]" /> Galeria
                      </button>
                      <button 
                         onClick={openCamera}
                         className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all"
                       >
                         <Camera size={16} className="text-[#B8924A]" /> Câmera
                       </button>
                      <div className="h-px bg-border/10 my-1" />
                      <button 
                        onClick={handleSendLocation}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all"
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
              className="absolute bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] min-w-[150px] overflow-hidden"
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

      {/* Profile Full-Screen Panel */}
      <AnimatePresence>
        {showProfile && otherPerson && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-[300] bg-background overflow-y-auto"
          >
            {/* Hero */}
            <div className="relative h-52 bg-gradient-to-br from-[#B8924A]/25 via-[#B8924A]/8 to-transparent overflow-hidden shrink-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,146,74,0.18),transparent_60%)]" />
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(184,146,74,0.12) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
              <button
                onClick={() => setShowProfile(false)}
                className="absolute top-5 left-5 flex items-center gap-2 px-4 py-2.5 bg-black/30 backdrop-blur-md border border-border/20 rounded-xl text-white/70 hover:text-white hover:bg-black/50 transition-all text-[10px] font-black uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
            </div>

            {/* Body */}
            <div className="max-w-2xl mx-auto px-6 -mt-14 relative z-10 pb-16">

              {/* Avatar + actions row */}
              <div className="flex items-end justify-between mb-5">
                <div className="w-24 h-24 rounded-2xl bg-[#B8924A]/15 border-2 border-[#B8924A]/40 overflow-hidden flex items-center justify-center font-black text-4xl text-[#B8924A] shadow-2xl shadow-black/60 ring-4 ring-background">
                  {otherPerson.avatar_url
                    ? <img src={otherPerson.avatar_url} alt={otherPerson.full_name} className="w-full h-full object-cover" />
                    : otherPerson.full_name?.charAt(0)
                  }
                </div>
                <div className="flex gap-2 pb-1">
                  {isProvider ? (
                    <>
                      <button onClick={() => { triggerToast('Gerar orçamento...'); setShowProfile(false); }}
                        className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
                        Orçamento
                      </button>
                      <button onClick={() => { triggerToast('Concluído.'); setShowProfile(false); }}
                        className="px-5 py-2.5 bg-[#B8924A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-[#B8924A]/25">
                        Concluído
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => triggerToast(`Portfólio de ${otherPerson.full_name}...`)}
                        className="px-5 py-2.5 bg-white/5 border border-white/10 text-white/70 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-colors">
                        Portfólio
                      </button>
                      <button onClick={() => { triggerToast('Confirmando contratação...'); setShowProfile(false); }}
                        className="px-5 py-2.5 bg-[#B8924A] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-[#B8924A]/25">
                        Contratar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Name + status */}
              <h1 className="text-2xl font-black text-foreground mb-1">{otherPerson.full_name}</h1>
              <div className="flex items-center gap-3 mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400/80">Online agora</span>
                </div>
                {profileDetails?.role && (
                  <span className="px-2.5 py-0.5 bg-[#B8924A]/15 border border-[#B8924A]/25 rounded-full text-[9px] font-black uppercase tracking-widest text-[#B8924A]">
                    {profileDetails.role === 'provider' ? 'Prestador' : 'Cliente'}
                  </span>
                )}
              </div>
              {profileDetails?.city && (
                <p className="text-[11px] font-semibold text-foreground/30 mb-6 flex items-center gap-1.5">
                  <MapPin size={11} className="text-foreground/20" />
                  {profileDetails.city}{profileDetails.state ? `, ${profileDetails.state}` : ''}
                </p>
              )}
              {!profileDetails?.city && <div className="mb-6" />}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[
                  { val: `★ ${otherPerson.rating_avg || '5.0'}`, lbl: 'Avaliação' },
                  { val: String(otherPerson.rating_count || '0'), lbl: 'Trabalhos' },
                  { val: profileDetails?.provider_profiles?.service_radius_km ? `${profileDetails.provider_profiles.service_radius_km} km` : '—', lbl: 'Raio de Atendimento' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} className="bg-muted/30 border border-border rounded-2xl py-4 flex flex-col items-center gap-1">
                    <span className="text-xl font-black text-foreground">{val}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground text-center">{lbl}</span>
                  </div>
                ))}
              </div>

              {loadingProfile ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#B8924A] border-t-transparent" />
                </div>
              ) : (
                <>
                  {/* About */}
                  <div className="mb-6">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#B8924A]/70 mb-3">Sobre</p>
                    <div className="bg-muted/30 border border-border/20 rounded-2xl p-5">
                      <p className={`text-sm leading-relaxed ${profileDetails?.bio ? 'font-semibold text-foreground/70' : 'font-semibold text-foreground/25 italic'}`}>
                        {profileDetails?.bio || 'Nenhuma descrição adicionada ainda.'}
                      </p>
                    </div>
                  </div>

                  {/* Contact & Fiscal info */}
                  {(() => {
                    const rows = [
                      { icon: <Phone size={14} />, lbl: 'Telefone', val: profileDetails?.phone || null },
                      { icon: <MapPin size={14} />, lbl: 'Localização', val: profileDetails?.city ? `${profileDetails.city}${profileDetails.state ? `, ${profileDetails.state}` : ''}` : null },
                      { icon: <CreditCard size={14} />, lbl: 'CPF / CNPJ', val: profileDetails?.cpf_cnpj ? `${profileDetails.cpf_cnpj.slice(0, 3)}***${profileDetails.cpf_cnpj.slice(-2)}` : null },
                      { icon: <Check size={14} />, lbl: 'Membro desde', val: profileDetails?.created_at ? new Date(profileDetails.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : null },
                    ].filter(r => r.val !== null);
                    if (rows.length === 0) return null;
                    return (
                      <div className="mb-6">
                        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#B8924A]/70 mb-3">Informações de Contato</p>
                        <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden divide-y divide-border">
                          {rows.map(({ icon, lbl, val }) => (
                            <div key={lbl} className="flex items-center gap-4 px-5 py-4">
                              <span className="text-[#B8924A]/50 shrink-0">{icon}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28 shrink-0">{lbl}</span>
                              <span className="text-sm font-semibold text-foreground/70">{val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Categories (provider only) */}
                  {profileDetails?.provider_profiles?.categories?.length > 0 && (
                    <div className="mb-6">
                      <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#B8924A]/70 mb-3">Especialidades</p>
                      <div className="flex flex-wrap gap-2">
                        {profileDetails.provider_profiles.categories.map((cat: string) => (
                          <span key={cat} className="px-3 py-1.5 bg-[#B8924A]/10 border border-[#B8924A]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#B8924A]/80">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portfolio */}
                  <div className="mb-8">
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#B8924A]/70 mb-3">Portfólio</p>
                    {profileDetails?.provider_profiles?.portfolio_urls?.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {profileDetails.provider_profiles.portfolio_urls.map((url: string, i: number) => (
                          <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-border">
                            <img src={url} alt={`Portfólio ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {[1,2,3].map(i => (
                          <div key={i} className="aspect-square rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground">
                            <ImageIcon size={20} />
                          </div>
                        ))}
                      </div>
                    )}
                    {!profileDetails?.provider_profiles?.portfolio_urls?.length && (
                      <p className="text-center text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 mt-3">Nenhum item no portfólio</p>
                    )}
                  </div>

                  {/* Safety tip */}
                  <div className="flex gap-3 items-start bg-[#B8924A]/5 border border-dashed border-[#B8924A]/15 rounded-2xl p-4">
                    <Shield size={15} className="text-[#B8924A]/50 mt-0.5 shrink-0" />
                    <p className="text-[10px] font-semibold text-foreground/40 leading-relaxed">
                      Nunca realize pagamentos fora da plataforma. A Working garante proteção total para clientes e prestadores.
                    </p>
                  </div>
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
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[9999] bg-card text-foreground px-8 py-5 rounded-3xl shadow-2xl flex items-center gap-4 border border-[#B8924A]/30 min-w-[320px]"
          >
            <div className="w-10 h-10 bg-[#B8924A]/10 rounded-full flex items-center justify-center text-[#B8924A] shrink-0">
              <Zap size={20} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest opacity-80">{toast.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .chat-layout-premium {
          display: flex;
          height: 100%;
          width: 100%;
          min-height: 0;
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
          height: 100%;
          overflow: hidden;
        }

        .sidebar-header {
          padding: 2rem 1rem 1.5rem;
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
          padding: 0 0.5rem 1rem;
          min-height: 0;
          overscroll-behavior-y: contain;
        }

        .chat-row-premium {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 0.75rem;
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
          height: 100%;
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

        .action-stack-removed {}

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
            padding: 1.5rem 0.5rem 1rem;
          }

          .sidebar-header, .chat-row-content, .row-top, .row-bottom {
            display: flex !important;
          }

          .chat-row-premium {
            padding: 0.8rem 0.5rem;
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
