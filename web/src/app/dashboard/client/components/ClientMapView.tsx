'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  Search, 
  Menu, 
  User, 
  MapPin, 
  Star, 
  Phone, 
  MessageSquare,
  Navigation,
  Clock,
  ChevronUp,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

// Normal Location Icon for the Client/User
const UserLocationIcon = () => {
  if (typeof window === 'undefined') return null;
  return L.divIcon({
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-8 h-8 bg-blue-500/20 rounded-full animate-ping"></div>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="#3b82f6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3" fill="white"></circle>
        </svg>
      </div>
    `,
    className: 'user-location-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
};

interface Provider {
  id: string;
  full_name: string;
  avatar_url: string;
  rating_avg: number;
  rating_count: number;
  address: string;
  latitude: number;
  longitude: number;
  role: string;
  category?: string;
}

// Auto-recenter component
function AutoRecenter({ userLocation }: { userLocation: [number, number] | null }) {
  const map = useMap();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Keep a ref to always have the latest userLocation inside the timeout callback
  const locationRef = useRef<[number, number] | null>(userLocation);

  useEffect(() => {
    locationRef.current = userLocation;
  }, [userLocation]);

  const scheduleRecenter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const loc = locationRef.current;
      if (loc) {
        map.flyTo(loc, 17, { duration: 2, easeLinearity: 0.25 });
      }
    }, 10000);
  };

  useMapEvents({
    movestart: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    moveend: scheduleRecenter,
    zoomstart: () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    zoomend: scheduleRecenter,
    click: scheduleRecenter,
  });

  // Also start the timer whenever userLocation becomes available
  useEffect(() => {
    if (userLocation) scheduleRecenter();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userLocation]);

  return null;
}

export function ClientMapView() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-23.5505, -46.6333]); // São Paulo default
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchProviders = async (center: [number, number]) => {
      setLoading(true);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'provider');

      if (!profiles) {
        setLoading(false);
        return;
      }

      // Processar perfis: se tiver coordenadas usa, se não tiver tenta geocodificar o endereço
      const processedProviders: Provider[] = [];

      for (const p of profiles) {
        if (p.latitude && p.longitude) {
          processedProviders.push(p);
        } else if (p.address || p.cep) {
          // Tenta geocodificar combinando Endereço e CEP para precisão total
          try {
            const query = `${p.address || ''} ${p.cep || ''}`.trim();
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
              headers: { 'User-Agent': 'Working-App-Agent' }
            });
            const geo = await res.json();
            
            if (geo && geo.length > 0) {
              processedProviders.push({
                ...p,
                latitude: parseFloat(geo[0].lat),
                longitude: parseFloat(geo[0].lon)
              });
            } else if (p.cep) {
              // Segunda tentativa: apenas pelo CEP caso o logradouro tenha algum erro
              const resCep = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${p.cep.replace(/\D/g, '')}&country=brazil&limit=1`, {
                headers: { 'User-Agent': 'Working-App-Agent' }
              });
              const geoCep = await resCep.json();
              if (geoCep && geoCep.length > 0) {
                processedProviders.push({
                  ...p,
                  latitude: parseFloat(geoCep[0].lat),
                  longitude: parseFloat(geoCep[0].lon)
                });
              }
            }
          } catch (e) {
            console.error(`Erro ao localizar prestador ${p.full_name}:`, e);
          }
        }
      }

      setProviders(processedProviders);
      setLoading(false);
    };

    // Geolocation logic
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCenter: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setMapCenter(newCenter);
          setUserLocation(newCenter);
          fetchProviders(newCenter);
        },
        () => fetchProviders(mapCenter),
        { timeout: 15000, enableHighAccuracy: true }
      );
    } else {
      fetchProviders(mapCenter);
    }
  }, []);

  if (!mounted) return <div className="w-full h-full bg-muted animate-pulse" />;

  return (
    <div className="relative w-full h-full bg-muted overflow-hidden md:p-4">
      <div className="w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/50">
        <MapContainer 
          center={mapCenter} 
          zoom={17}
          maxZoom={20}
          style={{ width: '100%', height: '100%', zIndex: 0 }}
          zoomControl={false}
        >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxNativeZoom={21}
          maxZoom={20}
        />
        
        <AutoRecenter userLocation={userLocation} />

        {userLocation && (
          <Marker 
            position={userLocation}
            icon={UserLocationIcon() as L.DivIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2">
                <p className="font-black text-xs uppercase tracking-widest text-blue-600">Sua localização</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        {providers.map((p) => {
          const isSelected = selectedProvider?.id === p.id;
          const providerColor = isSelected ? '#B8924A' : 'var(--muted)';
          
          const providerIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center transition-all duration-500 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
                <!-- Golden Pulse Ring -->
                <div class="absolute w-14 h-14 bg-[#B8924A]/20 rounded-2xl animate-pulse blur-[2px]"></div>
                <div class="absolute w-10 h-10 bg-[#B8924A]/30 rounded-full animate-ping blur-[4px]"></div>
                
                <!-- Main Avatar Card -->
                <div class="relative w-12 h-12 rounded-2xl overflow-hidden border-2 shadow-[0_8px_16px_rgba(184,146,74,0.3)] ${isSelected ? 'border-[#B8924A] ring-4 ring-[#B8924A]/20' : 'border-background'} bg-card">
                  ${p.avatar_url ? 
                    `<img src="${p.avatar_url}" class="w-full h-full object-cover" />` : 
                    `<div class="w-full h-full bg-[#B8924A]/10 flex items-center justify-center text-[#B8924A] font-black text-xs">${p.full_name.charAt(0)}</div>`
                  }
                  
                  <!-- Status Indicator -->
                  <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-background rounded-full shadow-sm"></div>
                </div>

                <!-- Pin Tip -->
                <div class="absolute -bottom-1.5 w-4 h-4 bg-background rotate-45 border-r border-b border-border/20 shadow-md -z-10"></div>
              </div>
            `,
            className: 'provider-marker-container',
            iconSize: [56, 56],
            iconAnchor: [28, 60]
          });

          return (
            <Marker 
              key={p.id} 
              position={[p.latitude, p.longitude]}
              icon={providerIcon}
              eventHandlers={{
                click: () => setSelectedProvider(p),
              }}
            >
              <Popup className="custom-popup">
                <div className="p-2 min-w-[150px]">
                  <p className="font-black text-sm">{p.full_name}</p>
                  <div className="flex items-center gap-1 mt-1 text-amber-500 font-bold text-xs">
                    <Star size={12} fill="currentColor" /> {p.rating_avg ? p.rating_avg.toFixed(1) : '5.0'}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Map Center Marker (if different from user) */}
        {!userLocation && (
          <Marker position={mapCenter} icon={UserLocationIcon() as L.DivIcon}>
            <Popup className="custom-popup">
              <div className="p-2">
                <p className="font-black text-xs uppercase tracking-widest text-[#B8924A]">Local selecionado</p>
              </div>
            </Popup>
          </Marker>
        )}
        
        <MapUpdater center={mapCenter} />
      </MapContainer>

      {/* Floating Action Bar */}
      <div className="absolute top-6 inset-x-6 z-10 flex justify-center">
        <div className="max-w-[240px] w-full">
          <Link 
            href="/dashboard/client/new"
            className="flex items-center justify-center w-full h-12 bg-background/90 backdrop-blur-xl border border-border/20 rounded-full px-6 text-center shadow-xl hover:bg-background transition-all"
          >
            <span className="text-[10px] font-black text-[#B8924A] uppercase tracking-[0.2em]">
              Buscar profissional
            </span>
          </Link>
        </div>
      </div>

      {/* Bottom Sheet (Provider Info) */}
      <AnimatePresence>
        {selectedProvider && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 inset-x-0 z-20"
          >
            <div className="bg-card border-t border-border rounded-t-[3rem] p-8 shadow-[0_-12px_40px_rgba(0,0,0,0.3)] backdrop-blur-xl bg-card/95 max-w-2xl mx-auto">
              <div className="flex justify-center mb-6">
                <div className="w-12 h-1.5 bg-muted rounded-full" />
              </div>

              <div className="flex items-start justify-between gap-6 mb-8">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-[#B8924A]/20">
                      {selectedProvider.avatar_url ? (
                        <img src={selectedProvider.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                          <User size={32} />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-[#B8924A] text-white p-2 rounded-xl shadow-lg border-2 border-card">
                      <Star size={14} fill="white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-foreground tracking-tight">{selectedProvider.full_name}</h3>
                    <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest mt-1 italic">
                      {selectedProvider.category || 'Profissional Certificado'}
                    </p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center gap-1 text-amber-500 font-black">
                        <Star size={16} fill="currentColor" />
                        <span>{selectedProvider.rating_avg ? selectedProvider.rating_avg.toFixed(1) : '5.0'}</span>
                      </div>
                      <div className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                      <span className="text-muted-foreground font-bold text-xs">{selectedProvider.rating_count || 0} serviços</span>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedProvider(null)}
                  className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass p-5 rounded-[1.5rem] border border-white/5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Endereço</p>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-[#B8924A] shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-foreground leading-relaxed line-clamp-2">
                      {selectedProvider.address || 'Localização aproximada'}
                    </p>
                  </div>
                </div>
                <div className="glass p-5 rounded-[1.5rem] border border-white/5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-green-400" />
                    <p className="text-xs font-bold text-green-400">Disponível agora</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button className="flex-1 h-16 rounded-2xl bg-[#B8924A] text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-[#B8924A]/20 hover:scale-[1.02] active:scale-95 transition-all gap-2">
                  <Navigation size={18} /> Solicitar agora
                </Button>
                <div className="flex gap-2">
                  <button className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground hover:bg-muted/80 transition-all">
                    <Phone size={20} />
                  </button>
                  <button className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center text-foreground hover:bg-muted/80 transition-all">
                    <MessageSquare size={20} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[100] bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-[#B8924A] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {/* Custom Styles for Pulse Effect */}
      <style dangerouslySetInnerHTML={{ __html: `
        .user-location-pulse {
          width: 24px;
          height: 24px;
          background: rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        
        .inner-dot {
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
          z-index: 2;
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.33); opacity: 1; }
          80%, 100% { transform: scale(1.5); opacity: 0; }
        }
        
        .user-location-icon, .provider-marker-container {
          background: transparent !important;
          border: none !important;
        }
      `}} />
      </div>
    </div>
  );
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 17);
  }, [center, map]);
  return null;
}
