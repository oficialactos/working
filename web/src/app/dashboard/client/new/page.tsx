'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  MapPin,
  ChevronLeft,
  X,
  Info,
  CheckCircle2,
  Zap,
  ArrowRight,
  Sparkles,
  Video,
  RotateCcw,
  Circle,
  PlusCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useEffect, useRef } from 'react';

const CATEGORIES = [
  { 
    id: 'reforma', 
    label: 'Reforma & Construção', 
    icon: '🏗️', 
    desc: 'Pintura, Piso, Alvenaria, Hidráulica',
    subcategories: [
      { id: 'alvenaria', label: 'Alvenaria / Pedreiro' },
      { id: 'pintura', label: 'Pintura Residencial' },
      { id: 'encanamento', label: 'Hidráulica / Encanador' },
      { id: 'pisos', label: 'Pisos e Azulejos' },
      { id: 'telhado', label: 'Telhados e Calhas' },
    ]
  },
  { 
    id: 'manutencao', 
    label: 'Manutenção & Elétrica', 
    icon: '⚡', 
    desc: 'Elétrica, Reparos e Ar-condicionado',
    subcategories: [
      { id: 'eletricista', label: 'Eletricista / Fiação' },
      { id: 'ar_condicionado', label: 'Ar-condicionado' },
      { id: 'eletrodomesticos', label: 'Conserto de Eletros' },
      { id: 'portao', label: 'Portões Automáticos' },
    ]
  },
  { 
    id: 'domesticos', 
    label: 'Serviços Domésticos', 
    icon: '🧹', 
    desc: 'Faxina, Limpeza e Passadeira',
    subcategories: [
      { id: 'limpeza', label: 'Faxina Regular' },
      { id: 'pos_obra', label: 'Limpeza Pós-Obra' },
      { id: 'passadeira', label: 'Passadeira / Diarista' },
      { id: 'organizacao', label: 'Personal Organizer' },
    ]
  },
  { 
    id: 'marcenaria', 
    label: 'Móveis & Marcenaria', 
    icon: '🪚', 
    desc: 'Montagem e Reparos de Móveis',
    subcategories: [
      { id: 'montagem', label: 'Montagem de Móveis' },
      { id: 'marceneiro', label: 'Marcenaria sob Medida' },
      { id: 'estofados', label: 'Limpeza de Estofados' },
    ]
  },
  { 
    id: 'externos', 
    label: 'Jardim & Áreas Externas', 
    icon: '🌿', 
    desc: 'Poda, Piscina e Paisagismo',
    subcategories: [
      { id: 'jardinagem', label: 'Jardinagem / Poda' },
      { id: 'piscina', label: 'Manutenção de Piscina' },
      { id: 'dedetizacao', label: 'Dedetização' },
    ]
  },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('Buscando localização...');
  const [city, setCity] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [manualBairro, setManualBairro] = useState('');
  const [manualCityState, setManualCityState] = useState('');
  const [images, setImages] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [providerCount, setProviderCount] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Camera & Video States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecordingCamera, setIsRecordingCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedVideoBlob, setCapturedVideoBlob] = useState<Blob | null>(null);
  const [capturedVideoUrl, setCapturedVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraChunksRef = useRef<Blob[]>([]);
  const cameraTimerRef = useRef<any>(null);

  const [cep, setCep] = useState('');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth');
      } else {
        setUserId(session.user.id);
      }
    };
    checkUser();
  }, []);

  const handleCEPChange = async (value: string) => {
    const cleanCEP = value.replace(/\D/g, '');
    setCep(cleanCEP);
    
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setManualAddress(data.logradouro);
          setManualBairro(data.bairro);
          setManualCityState(`${data.localidade}, ${data.uf}`);
          
          setAddress(data.logradouro);
          setCity(`${data.bairro} · ${data.localidade}, ${data.uf}`);
        }
      } catch (error) {
        console.error('ViaCEP error:', error);
      }
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setAddress('Localização não suportada');
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const { latitude, longitude } = position.coords;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        
        const road = data.address.road || '';
        const houseNumber = data.address.house_number || '';
        const postcode = data.address.postcode ? data.address.postcode.replace(/\D/g, '') : '';
        
        let suburb = data.address.neighbourhood || 
                     data.address.suburb || 
                     data.address.city_district || 
                     data.address.district ||
                     data.address.village ||
                     data.address.hamlet ||
                     data.address.residential ||
                     '';
                       
        let cityStr = data.address.city || data.address.town || data.address.village || '';
        let state = data.address.state || '';

        // SE tivermos um CEP, vamos validar com o ViaCEP para garantir o BAIRRO CORRETO
        if (postcode && postcode.length === 8) {
          try {
            const vResponse = await fetch(`https://viacep.com.br/ws/${postcode}/json/`);
            const vData = await vResponse.json();
            if (!vData.erro) {
              suburb = vData.bairro || suburb;
              cityStr = vData.localidade || cityStr;
              state = vData.uf || state;
            }
          } catch (e) {
            console.warn('Silent ViaCEP check failed:', e);
          }
        }

        setAddress(`${road}${houseNumber ? ', ' + houseNumber : ''}`);
        setCity(`${suburb}${suburb && cityStr ? ' · ' : ''}${cityStr}${state ? ', ' + state : ''}`);
        
        // Populate manual fields for easy editing
        setManualAddress(road);
        setManualNumber(houseNumber);
        setManualBairro(suburb);
        setManualCityState(`${cityStr}${state ? ', ' + state : ''}`);
      } catch (error) {
        console.error('Error fetching address:', error);
        setAddress('Rua Abdo Leila, 100'); // Fallback
        setCity('Lins, SP');
      }
    }, (error) => {
      console.error('Geolocation error:', error);
      setAddress('Avenida Paulista, 1000');
      setCity('Bela Vista · São Paulo, SP');
    });
  };

  useEffect(() => {
    if (step === 3) {
      getLocation();
    }
  }, [step]);

  useEffect(() => {
    const getProviderCount = async () => {
      if (!city) return;
      const cleanCity = city.split('·').pop()?.split(',')[0].trim() || 'São Paulo';
      
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'provider')
        .ilike('city', `%${cleanCity}%`);
      
      setProviderCount(count || 0);
    };

    if (step === 3 && city) {
      getProviderCount();
    }
  }, [step, city]);

  const activeCategory = CATEGORIES.find(c => c.id === selectedCat);

  const nextStep = () => {
    if (step === 1 && activeCategory && !selectedSubCat) {
      // Stay on step 1 but show subcategories (handled in UI)
      return;
    }
    setStep(s => s + 1);
  };
  
  const prevStep = () => {
    if (step === 2 && selectedCat) {
       // Voltar para seleção geral
       setStep(1);
       setSelectedSubCat(null);
       return;
    }
    setStep(s => s - 1);
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !userId) return;

    setUploading(true);
    const newMedia = [...images];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (error) {
        console.error('Error uploading:', error);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      newMedia.push({
        url: publicUrl,
        type: file.type.startsWith('video') ? 'video' : 'image'
      });
    }

    setImages(newMedia);
    setUploading(false);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      alert('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
    setCapturedImage(null);
    setCapturedVideoBlob(null);
    if (capturedVideoUrl) URL.revokeObjectURL(capturedVideoUrl);
    setCapturedVideoUrl(null);
    setIsRecordingCamera(false);
    setRecordingTime(0);
    clearInterval(cameraTimerRef.current);
  };

  const takePhoto = () => {
    if (!cameraVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = cameraVideoRef.current.videoWidth;
    canvas.height = cameraVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(cameraVideoRef.current, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
    }
  };

  const startRecording = () => {
    if (!cameraStream) return;
    cameraChunksRef.current = [];
    const recorder = new MediaRecorder(cameraStream, { mimeType: 'video/webm' });
    
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) cameraChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(cameraChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setCapturedVideoBlob(blob);
      setCapturedVideoUrl(url);
    };

    recorder.start();
    cameraMediaRecorderRef.current = recorder;
    setIsRecordingCamera(true);
    setRecordingTime(0);
    cameraTimerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (cameraMediaRecorderRef.current && isRecordingCamera) {
      cameraMediaRecorderRef.current.stop();
      setIsRecordingCamera(false);
      clearInterval(cameraTimerRef.current);
    }
  };

  const confirmCapturedMedia = async () => {
    if (!userId) return;
    setUploading(true);
    
    try {
      let file: File | Blob;
      let type: 'image' | 'video';
      let ext: string;

      if (capturedImage) {
        const res = await fetch(capturedImage);
        file = await res.blob();
        type = 'image';
        ext = 'jpg';
      } else if (capturedVideoBlob) {
        file = capturedVideoBlob;
        type = 'video';
        ext = 'webm';
      } else {
        return;
      }

      const fileName = `${Math.random()}.${ext}`;
      const filePath = `${userId}/${fileName}`;

      const { error } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setImages(prev => [...prev, { url: publicUrl, type }]);
      closeCamera();
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erro ao salvar mídia capturada.');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!userId || !selectedSubCat || !title || !description) return;

    setLoading(true);
    const subCatLabel = activeCategory?.subcategories.find(s => s.id === selectedSubCat)?.label || 'Serviço';
    const fullCity = city || 'São Paulo';

    // Garante que o perfil existe antes de criar o pedido (o trigger pode não ter rodado)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'client',
          full_name: user?.user_metadata?.full_name || user?.email || '',
          avatar_url: user?.user_metadata?.avatar_url || null,
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        alert(`Erro ao criar perfil: ${profileError.message}`);
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase
      .from('service_requests')
      .insert({
        client_id: userId,
        title: title,
        description: description,
        category: subCatLabel,
        status: 'open',
        city: fullCity,
        address_text: address,
        media_urls: images.map(m => m.url)
      });

    if (error) {
      console.error('Submission error:', error);
      alert(`Erro ao publicar pedido: ${error.message}`);
      setLoading(false);
    } else {
      router.push('/dashboard/client');
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Professional Stepper Header */}
      <header className="relative z-50 py-6 border-b border-border flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => step > 1 ? prevStep() : router.back()} 
            className="flex items-center gap-2 font-black text-[10px] md:text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-[#B8924A] transition-colors group px-2"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {step === 1 ? 'Sair' : 'Voltar'}
          </button>
          
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-700",
                  s === step ? "w-10 md:w-16 bg-[#B8924A] shadow-[0_0_12px_#B8924A40]" : s < step ? "w-4 bg-[#B8924A]/40" : "w-4 bg-muted"
                )}
              />
            ))}
          </div>

          <span className="hidden sm:inline text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-2">
             Passo {step} / 03
          </span>
        </div>
      </header>

      <main className="mt-16 px-4">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {!selectedCat ? (
                <>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#B8924A]/10 border border-[#B8924A]/20 rounded-full w-fit">
                        <Sparkles size={14} className="text-[#B8924A]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#B8924A]">Novo Pedido</span>
                    </div>
                    <div className="space-y-4">
                      <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-[0.9]">O que você <br /> <span className="text-gradient-gold">precisa resolver?</span></h1>
                      <p className="text-muted-foreground font-bold text-lg md:text-xl max-w-xl">Selecione o grupo de serviço para começarmos seu projeto.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCat(cat.id)}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group relative overflow-hidden",
                          "border-border bg-card/50 hover:border-[#B8924A]/30 hover:bg-card hover:shadow-lg hover:shadow-[#B8924A]/5"
                        )}
                      >
                        <div className="w-12 h-12 shrink-0 rounded-xl bg-muted border border-border flex items-center justify-center text-2xl grayscale group-hover:grayscale-0 transition-all group-hover:scale-110 relative z-10">
                          {cat.icon}
                        </div>
                        <div className="relative z-10 flex-1 min-w-0">
                          <p className="font-black text-base text-foreground group-hover:text-[#B8924A] transition-colors">{cat.label}</p>
                          <p className="text-xs font-bold text-muted-foreground mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity truncate">{cat.desc}</p>
                        </div>
                        <ArrowRight size={16} className="shrink-0 text-muted-foreground/30 group-hover:text-[#B8924A] group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-6">
                    <button 
                      onClick={() => { setSelectedCat(null); setSelectedSubCat(null); }}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8924A] flex items-center gap-2 hover:opacity-70 transition-opacity"
                    >
                      <ChevronLeft size={16} /> Trocar grupo de serviço
                    </button>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                         <div className="w-16 h-16 rounded-3xl bg-[#B8924A]/10 flex items-center justify-center text-4xl">
                           {activeCategory?.icon}
                         </div>
                         <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground">{activeCategory?.label}</h1>
                      </div>
                      <p className="text-muted-foreground font-bold text-lg md:text-xl">Qual especialidade você procura neste grupo?</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeCategory?.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubCat(sub.id)}
                        className={cn(
                          "flex items-center justify-between p-7 rounded-3xl border-2 transition-all text-left relative overflow-hidden",
                          selectedSubCat === sub.id 
                            ? "border-[#B8924A] bg-[#B8924A]/[0.03] shadow-lg" 
                            : "border-border bg-card/50 hover:border-[#B8924A]/30 hover:bg-card"
                        )}
                      >
                        <p className={cn(
                          "font-black text-lg relative z-10",
                          selectedSubCat === sub.id ? "text-[#B8924A]" : "text-foreground"
                        )}>{sub.label}</p>
                        <div className="relative z-10 shrink-0">
                          {selectedSubCat === sub.id ? (
                            <div className="w-6 h-6 rounded-full bg-[#B8924A] flex items-center justify-center shadow-lg">
                              <CheckCircle2 size={14} className="text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-border" />
                          )}
                        </div>
                        
                        {selectedSubCat === sub.id && (
                           <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-[#B8924A]/10 rounded-full blur-3xl opacity-50" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-10 flex flex-col md:flex-row gap-4">
                    <Button 
                      size="lg" 
                      fullWidth
                      disabled={!selectedSubCat}
                      onClick={nextStep}
                      className="h-16 md:h-20 rounded-[2rem] bg-[#B8924A] text-white hover:bg-[#A68342] font-black text-lg shadow-xl shadow-[#B8924A]/20 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      Confirmar e continuar
                      <ArrowRight size={22} strokeWidth={3} />
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full w-fit">
                    <Info size={12} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Detalhamento</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-foreground leading-[0.9]">Conte os <br /> <span className="text-[#B8924A]">detalhes.</span></h1>
                <p className="text-muted-foreground font-bold text-lg">Quanto mais informações, melhores os orçamentos.</p>
              </div>

              <div className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Título do Problema</label>
                  <Input 
                    placeholder="Ex: Vazamento grave na pia da cozinha" 
                    className="bg-muted border-none h-16 rounded-2xl font-black text-lg px-8 focus:ring-2 focus:ring-[#B8924A] transition-all"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2">Descrição detalhada</label>
                  <textarea 
                    placeholder="Explique o que aconteceu e o que você precisa..." 
                    className="w-full bg-muted border-none rounded-[2rem] p-8 text-lg font-bold min-h-[180px] focus:ring-2 focus:ring-[#B8924A] outline-none transition-all placeholder:text-muted-foreground/30 text-foreground"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-6">
                   <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                     <Camera size={16} /> Fotos e Vídeos do local (Opcional)
                   </label>
                   <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
                      {images.map((img, i) => (
                        <div key={i} className="aspect-square relative rounded-[1.5rem] overflow-hidden group shadow-lg border border-border">
                          {img.type === 'image' ? (
                            <img src={img.url} className="w-full h-full object-cover" alt="Preview" />
                          ) : (
                            <video src={img.url} className="w-full h-full object-cover" />
                          )}
                          <button 
                            onClick={() => removeMedia(i)}
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-xl shadow-lg transition-all z-20"
                          >
                            <X size={14} strokeWidth={3} />
                          </button>
                          {img.type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <Zap size={20} className="text-white fill-white" />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div 
                        onClick={openCamera}
                        className="aspect-square bg-[#B8924A]/10 border-2 border-dashed border-[#B8924A]/30 rounded-[1.5rem] flex flex-col items-center justify-center gap-3 text-[#B8924A] hover:bg-[#B8924A]/20 transition-all group cursor-pointer"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Camera size={28} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Câmera / Vídeo</span>
                      </div>

                      <label className={cn(
                        "aspect-square bg-muted border-2 border-dashed border-border rounded-[1.5rem] flex flex-col items-center justify-center gap-3 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all group cursor-pointer",
                        uploading && "opacity-50 cursor-wait"
                      )}>
                        <input 
                          type="file" 
                          className="hidden" 
                          multiple 
                          accept="image/*,video/*" 
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                        <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                           {uploading ? (
                             <div className="w-6 h-6 border-2 border-[#B8924A] border-t-transparent rounded-full animate-spin" />
                           ) : (
                             <PlusCircle size={28} className="text-muted-foreground/40" />
                           )}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Anexar Arquivo
                        </span>
                      </label>
                    </div>
                </div>
              </div>

              <div className="pt-10">
                <Button size="lg" fullWidth onClick={nextStep} className="h-20 rounded-[2rem] bg-primary text-primary-foreground hover:bg-[#B8924A] font-black text-lg transition-all active:scale-95 shadow-xl shadow-black/10">
                  Próximo: Localização
                  <ArrowRight size={22} className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full w-fit">
                    <CheckCircle2 size={12} strokeWidth={3} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Finalização</span>
                </div>
                <h1 className="text-5xl font-black tracking-tighter text-foreground leading-[0.9]">Onde será <br /> <span className="text-[#B8924A]">o serviço?</span></h1>
                <p className="text-muted-foreground font-bold text-lg">Confirme o endereço para calcularmos o deslocamento.</p>
              </div>

              <Card className="border-none bg-muted p-10 rounded-[3rem] shadow-sm relative overflow-hidden group">
                <div className="flex items-start gap-8 relative z-10">
                  <div className="w-20 h-20 rounded-[2rem] bg-[#B8924A] flex items-center justify-center text-primary-foreground shrink-0 shadow-2xl shadow-amber-900/30 group-hover:scale-110 transition-transform">
                    <MapPin size={32} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-3 py-1">
                    <h3 className="text-2xl font-black tracking-tighter text-foreground">{address}</h3>
                    <p className="text-muted-foreground font-bold text-lg">{city}</p>
                    <button 
                      onClick={() => {
                        setManualAddress(address);
                        setIsEditingAddress(true);
                      }}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-[#B8924A] hover:underline bg-background px-4 py-2 rounded-lg shadow-sm"
                    >
                      Alterar Endereço
                    </button>
                  </div>
                </div>
                
                {/* Decorative */}
                <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-[#B8924A]/5 rounded-full blur-3xl" />
              </Card>

              {/* Edit Address Modal */}
              <AnimatePresence>
                {isEditingAddress && (
                  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setIsEditingAddress(false)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative bg-card border border-border w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl"
                    >
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-2xl font-black tracking-tight">Editar Endereço</h3>
                          <p className="text-muted-foreground text-sm font-bold">Digite o CEP para preenchimento automático.</p>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2 p-6 bg-[#B8924A]/5 border border-[#B8924A]/20 rounded-2xl">
                             <label className="text-[10px] font-black text-[#B8924A] uppercase tracking-widest px-1">Buscar por CEP (Automático)</label>
                             <Input 
                               value={cep}
                               onChange={(e) => handleCEPChange(e.target.value)}
                               placeholder="00000-000"
                               className="bg-background border-none h-14 rounded-xl font-black text-xl px-6 text-[#B8924A] placeholder:text-[#B8924A]/30"
                             />
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Rua / Logradouro</label>
                             <Input 
                               value={manualAddress}
                               onChange={(e) => setManualAddress(e.target.value)}
                               placeholder="Ex: Rua das Flores"
                               className="bg-muted border-none h-14 rounded-2xl font-bold px-6"
                             />
                          </div>

                          <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-1 space-y-2">
                               <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Número</label>
                               <Input 
                                 value={manualNumber}
                                 onChange={(e) => setManualNumber(e.target.value)}
                                 placeholder="123"
                                 className="bg-muted border-none h-14 rounded-2xl font-bold px-6"
                               />
                            </div>
                            <div className="col-span-2 space-y-2">
                               <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Bairro</label>
                               <Input 
                                 value={manualBairro}
                                 onChange={(e) => setManualBairro(e.target.value)}
                                 placeholder="Seu Bairro"
                                 className="bg-muted border-none h-14 rounded-2xl font-bold px-6"
                               />
                            </div>
                          </div>

                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Cidade e Estado</label>
                             <Input 
                               value={manualCityState}
                               onChange={(e) => setManualCityState(e.target.value)}
                               placeholder="Cidade, Estado"
                               className="bg-muted border-none h-14 rounded-2xl font-bold px-6"
                             />
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button 
                            variant="outline" 
                            fullWidth 
                            onClick={() => setIsEditingAddress(false)}
                            className="rounded-2xl h-14 font-black text-xs uppercase"
                          >
                            Cancelar
                          </Button>
                          <Button 
                            fullWidth 
                            onClick={() => {
                              setAddress(`${manualAddress}${manualNumber ? ', ' + manualNumber : ''}`);
                              setCity(`${manualBairro}${manualBairro && manualCityState ? ' · ' : ''}${manualCityState}`);
                              setIsEditingAddress(false);
                            }}
                            className="bg-[#B8924A] hover:bg-[#A68342] text-white rounded-2xl h-14 font-black text-xs uppercase shadow-lg shadow-[#B8924A]/20"
                          >
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <div className="bg-primary p-8 rounded-[2rem] flex gap-5 text-primary-foreground shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
                <div className="w-12 h-12 rounded-2xl bg-[#B8924A] flex items-center justify-center shrink-0 shadow-lg group-hover:rotate-12 transition-transform">
                  <Zap size={24} className="fill-primary-foreground text-primary-foreground" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-xs font-black uppercase tracking-widest text-[#B8924A]">Disponibilidade Local</p>
                  <p className="text-sm font-bold leading-relaxed opacity-80">
                    Existem <span className="text-foreground font-black">{providerCount !== null ? providerCount : '...'} profissionais</span> de {activeCategory?.subcategories.find(s => s.id === selectedSubCat)?.label} ativos próximos a você agora.
                  </p>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
              </div>

              <div className="pt-10">
                <Button 
                  size="lg" 
                  fullWidth 
                  onClick={handleSubmit} 
                  disabled={loading}
                  className="h-20 rounded-[2rem] bg-[#B8924A] text-white hover:bg-[#A68342] font-black text-lg transition-all active:scale-95 shadow-xl shadow-[#B8924A]/20 flex items-center justify-center gap-3"
                >
                  {loading ? 'Publicando...' : 'Publicar Pedido Agora'}
                  <Zap size={22} className="fill-white" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Camera / Video Recording Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4 md:p-10"
          >
            <div className="absolute top-6 right-6 z-[210]">
              <button onClick={closeCamera} className="p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md">
                <X size={24} />
              </button>
            </div>

            <div className="relative w-full max-w-2xl aspect-[9/16] md:aspect-video bg-neutral-900 rounded-[2rem] overflow-hidden shadow-2xl border border-white/5">
              {!capturedImage && !capturedVideoUrl ? (
                <>
                  <video 
                    ref={cameraVideoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  
                  {isRecordingCamera && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-600 rounded-full flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-white font-black text-xs uppercase tracking-widest">{recordingTime}s</span>
                    </div>
                  )}

                  <div className="absolute bottom-8 inset-x-0 flex items-center justify-around">
                    <button onClick={takePhoto} className="p-5 bg-white rounded-full text-black hover:scale-110 transition-transform shadow-xl">
                      <Camera size={32} />
                    </button>
                    
                    <button 
                      onClick={isRecordingCamera ? stopRecording : startRecording}
                      className={cn(
                        "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all shadow-xl",
                        isRecordingCamera ? "border-red-500 bg-red-500/20" : "border-white bg-white/10 hover:bg-white/20"
                      )}
                    >
                      {isRecordingCamera ? (
                        <div className="w-8 h-8 bg-red-500 rounded-sm" />
                      ) : (
                        <div className="w-8 h-8 bg-red-500 rounded-full" />
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full relative">
                  {capturedImage ? (
                    <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                  ) : (
                    <video src={capturedVideoUrl!} controls autoPlay className="w-full h-full object-cover" />
                  )}
                  
                  <div className="absolute bottom-8 inset-x-0 flex items-center justify-center gap-6">
                    <button 
                      onClick={() => { setCapturedImage(null); setCapturedVideoBlob(null); setCapturedVideoUrl(null); }}
                      className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-white font-black uppercase text-xs tracking-widest backdrop-blur-md transition-all flex items-center gap-2"
                    >
                      <RotateCcw size={18} /> Repetir
                    </button>
                    <Button 
                      onClick={confirmCapturedMedia} 
                      isLoading={uploading}
                      className="px-10 py-4 bg-[#B8924A] hover:bg-[#A68342] text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-[#B8924A]/30 flex items-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Confirmar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 text-center hidden md:block">
              <p className="text-white/40 text-xs font-black uppercase tracking-widest">
                {isRecordingCamera ? 'Gravando vídeo...' : 'Tire uma foto ou grave um vídeo rápido'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

