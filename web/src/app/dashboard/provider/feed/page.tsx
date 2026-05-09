'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Filter, 
  Clock, 
  DollarSign, 
  ChevronRight,
  Star,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  Navigation,
  Award,
  User,
  X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { cn, formatName } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const formatDistance = formatDistanceToNow;

export default function RequestFeedPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [maxDistance, setMaxDistance] = useState(50);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentCity, setCurrentCity] = useState('Localizando...');
  const [isLocating, setIsLocating] = useState(false);
  
  // Advanced Filter States
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  
  const categories = ['Todos', 'Reforma & Construção', 'Manutenção & Elétrica', 'Serviços Domésticos', 'Móveis & Marcenaria', 'Jardim & Áreas Externas'];

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setCurrentCity('São Paulo, SP');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`, {
            headers: {
              'Accept-Language': 'pt-BR'
            }
          });
          const data = await res.json();
          if (data.address) {
            const city = data.address.city || 
                         data.address.town || 
                         data.address.municipality || 
                         data.address.village || 
                         data.address.city_district || 
                         data.address.hamlet || 
                         data.address.suburb || 
                         data.display_name?.split(',')[0] ||
                         'Localidade';
            
            const state = data.address.state || '';
            const stateAbbr = state.length > 2 ? state.substring(0, 2).toUpperCase() : state; // Simplistic abbr
            
            // Map common Brazilian states to abbreviations for cleaner UI
            const stateMap: {[key: string]: string} = {
              'São Paulo': 'SP', 'Rio de Janeiro': 'RJ', 'Minas Gerais': 'MG', 'Espírito Santo': 'ES',
              'Paraná': 'PR', 'Santa Catarina': 'SC', 'Rio Grande do Sul': 'RS',
              'Bahia': 'BA', 'Pernambuco': 'PE', 'Ceará': 'CE', 'Paraíba': 'PB', 'Rio Grande do Norte': 'RN', 'Alagoas': 'AL', 'Sergipe': 'SE', 'Maranhão': 'MA', 'Piauí': 'PI',
              'Distrito Federal': 'DF', 'Goiás': 'GO', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
              'Amazonas': 'AM', 'Pará': 'PA', 'Acre': 'AC', 'Rondônia': 'RO', 'Roraima': 'RR', 'Amapá': 'AP', 'Tocantins': 'TO'
            };
            
            const finalState = stateMap[state] || stateAbbr;
            setCurrentCity(`${city}${finalState ? `, ${finalState}` : ''}`);
          } else {
            setCurrentCity('São Paulo, SP');
          }
        } catch (err) {
          console.error('Location Fetch Error:', err);
          setCurrentCity('São Paulo, SP');
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        let errorMessage = 'Erro desconhecido';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão negada pelo usuário';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Localização indisponível (Sinal fraco ou GPS desligado)';
            break;
          case error.TIMEOUT:
            errorMessage = 'Tempo esgotado ao obter localização';
            break;
        }
        console.error(`Geolocation Error: [Code ${error.code}] ${error.message || 'Sem mensagem'} (${errorMessage})`);
        setCurrentCity('São Paulo, SP');
        setIsLocating(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 0 // Force fresh location if allowed
      }
    );
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          client:profiles!client_id(
            full_name,
            avatar_url,
            rating_avg,
            rating_count
          )
        `)
        .in('status', ['open', 'in_progress'])
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOpportunities(data);
      }
      setLoading(false);
    };

    fetchRequests();
    detectLocation();
  }, []);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter(opp => {
      const matchesCategory = activeCategory === 'Todos' || opp.category === activeCategory;
      const clientName = formatName(opp.client?.full_name, 'Cliente');
      const matchesSearch = 
        opp.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDistance = true; 
      const isUrgente = opp.urgency_level === 'high';
      const matchesUrgent = !onlyUrgent || isUrgente;
      const matchesPrice = true; 

      return matchesCategory && matchesSearch && matchesDistance && matchesUrgent && matchesPrice;
    });
  }, [searchTerm, activeCategory, onlyUrgent, opportunities]);

  const resetFilters = () => {
    setSearchTerm('');
    setActiveCategory('Todos');
    setMaxDistance(50);
    setMinPrice(0);
    setOnlyUrgent(false);
  };

  return (
    <div className="pb-20">
      {/* Header Section */}
      <header className="space-y-4 mb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <Badge variant="primary" className="mb-2">Oportunidades Disponíveis</Badge>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-foreground">Descobrir Serviços</h1>
            <p className="text-muted-foreground font-bold text-lg">Encontre os melhores projetos próximos à sua localização.</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
              onClick={detectLocation}
              disabled={isLocating}
              className={cn(
                "bg-muted px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-border transition-all hover:bg-muted/80 active:scale-95",
                isLocating && "animate-pulse opacity-70"
              )}
             >
               <MapPin size={16} className={cn("transition-colors", isLocating ? "text-[#B8924A]" : "text-muted-foreground/60")} />
               <span className="text-foreground">{currentCity}</span>
             </button>
          </div>
        </div>
      </header>



      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        {/* Main Feed */}
        <div className="xl:col-span-8 space-y-6">
          {loading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-[32px] border border-border" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opp, i) => {
                  const clientName = formatName(opp.client?.full_name, 'Cliente');
                  const timeAgo = formatDistanceToNow(new Date(opp.created_at), { addSuffix: true, locale: ptBR });
                  const isUrgente = opp.urgency_level === 'high';

                  return (
                    <motion.div
                      key={opp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="group hover:border-[#B8924A]/40 transition-all border-border bg-card overflow-hidden">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex items-start gap-4">
                            {/* Main Content Column */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <div className="flex items-center gap-2">
                                  {isUrgente && (
                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-500/5 px-2 py-0.5 rounded-md border border-red-500/10">
                                      <Zap size={8} className="fill-current" /> Urgente
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3 mb-0.5">
                                <h2 className="text-lg font-black group-hover:text-[#B8924A] transition-colors tracking-tight leading-tight text-foreground truncate">
                                  {opp.title}
                                </h2>
                                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap shrink-0">{timeAgo}</span>
                              </div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-[#B8924A] mb-2">
                                {opp.category}
                              </p>
                              
                              <div className="flex items-center gap-2 mb-3 text-[11px] font-bold text-muted-foreground truncate">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <MapPin size={12} className="shrink-0 text-[#B8924A]/60" />
                                  <span className="text-foreground truncate">{opp.city}</span>
                                </div>
                                <span className="shrink-0 opacity-30">•</span>
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <User size={12} className="shrink-0 opacity-60" />
                                  <span className="text-foreground truncate">{clientName}</span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-4">
                                <div className="flex gap-1 overflow-hidden">
                                  {opp.tags?.slice(0, 2).map((tag: string) => (
                                    <span key={tag} className="text-[9px] font-bold text-muted-foreground/70 bg-muted/30 px-2 py-0.5 rounded-md border border-border/50 whitespace-nowrap">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                                <Button 
                                  variant="uber" 
                                  size="sm" 
                                  href={`/dashboard/provider/lead/${opp.id}`}
                                  className="h-9 px-4 text-[11px] font-black uppercase tracking-widest shrink-0 rounded-xl"
                                >
                                  Ver Projeto
                                  <ChevronRight size={14} className="ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center p-20 text-center bg-card rounded-[32px] border-2 border-dashed border-border"
                >
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                    <Search size={32} className="text-muted-foreground/30" />
                  </div>
                  <h3 className="text-xl font-black mb-2 text-foreground">Nenhum serviço encontrado</h3>
                  <p className="text-muted-foreground font-bold max-w-xs mx-auto">Tente ajustar seus filtros ou pesquisar por outros termos.</p>
                  <Button variant="outline" className="mt-8 px-8" onClick={resetFilters}>
                    Limpar Filtros
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Filters Drawer Overlay */}
        <AnimatePresence>
          {isFiltersOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsFiltersOpen(false)}
                className="fixed inset-0 bg-[#141B25]/10 backdrop-blur-sm z-[100]"
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card shadow-2xl z-[110] p-10 flex flex-col border-l border-border"
              >
                <div className="flex items-center justify-between mb-10">
                  <h2 className="text-2xl font-black tracking-tight text-foreground">Filtros Avançados</h2>
                  <button onClick={() => setIsFiltersOpen(false)} className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-1 space-y-12 overflow-y-auto no-scrollbar pr-2">
                  <div className="space-y-6">
                    <div className="flex justify-between items-end">
                      <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Orçamento Mínimo</h3>
                      <span className="text-sm font-black text-[#B8924A] bg-accent/10 px-3 py-1 rounded-lg">R$ {minPrice}</span>
                    </div>
                    <div className="space-y-4">
                      <input 
                        type="range" 
                        min="0" 
                        max="2000" 
                        step="50"
                        value={minPrice}
                        onChange={(e) => setMinPrice(parseInt(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-[#B8924A]" 
                      />
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                        <span>R$ 0</span>
                        <span>R$ 2.000+</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-muted/40 rounded-[28px] border border-border">
                    <div className="space-y-1">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Apenas Urgentes</h3>
                      <p className="text-[11px] text-muted-foreground font-bold italic">Mostrar somente leads priorizados</p>
                    </div>
                    <button 
                      onClick={() => setOnlyUrgent(!onlyUrgent)}
                      className={cn(
                        "w-14 h-8 rounded-full transition-all relative flex items-center px-1",
                        onlyUrgent ? "bg-[#B8924A]" : "bg-muted-foreground/20"
                      )}
                    >
                      <motion.div 
                        animate={{ x: onlyUrgent ? 24 : 0 }}
                        className="w-6 h-6 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                </div>

                <div className="pt-10 mt-auto grid grid-cols-2 gap-4">
                  <Button variant="outline" fullWidth className="h-14 rounded-2xl border-border" onClick={resetFilters}>
                    Limpar Tudo
                  </Button>
                  <Button variant="primary" fullWidth className="h-14 rounded-2xl bg-foreground text-background hover:bg-[#B8924A]" onClick={() => setIsFiltersOpen(false)}>
                    Aplicar Filtros
                  </Button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Sidebar Filters */}
        <aside className="xl:col-span-4 sticky top-48 space-y-8">
          <Card className="p-8 border-border bg-card">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Filtrar por Categoria</h3>
            <div className="space-y-2">
              {categories.map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl font-bold transition-all flex items-center justify-between group",
                    activeCategory === cat ? "bg-[#B8924A] text-white shadow-lg" : "text-muted-foreground hover:bg-muted hover:text-[#B8924A]"
                  )}
                >
                  {cat}
                  <ChevronRight size={16} className={cn(
                    "transition-transform",
                    activeCategory === cat ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
                  )} />
                </button>
              ))}
            </div>

            <div className="h-px bg-border my-8" />

            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-6">Distância Máxima</h3>
            <div className="space-y-4">
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-[#B8924A]" 
              />
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                <span>1 km</span>
                <span className="text-[#B8924A] bg-accent/10 px-2 py-0.5 rounded-md font-black">{maxDistance} km</span>
                <span>50+ km</span>
              </div>
            </div>

            <div className="h-px bg-border my-8" />

          </Card>

        </aside>
      </div>
    </div>
  );
}
