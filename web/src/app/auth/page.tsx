'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench,
  Mail,
  Lock,
  User,
  ArrowLeft,
  Globe,
  CheckCircle2,
  ArrowRight,
  Building2,
  Fingerprint,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

function AuthContent() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<'client' | 'provider'>('client');
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maskCnpj = (value: string) =>
    value
      .replace(/\D/g, '')
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18);

  const handleCnpjChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCnpj(e.target.value);
    setCnpj(masked);
    const raw = masked.replace(/\D/g, '');
    if (raw.length === 14) {
      setIsFetchingCnpj(true);
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
        if (res.ok) {
          const data = await res.json();
          setRazaoSocial(data.razao_social || '');
        }
      } catch {
        // silent
      } finally {
        setIsFetchingCnpj(false);
      }
    }
  };

  useEffect(() => {
    const m = searchParams.get('mode');
    const r = searchParams.get('role');
    if (m === 'login' || m === 'register') setMode(m);
    if (r === 'client' || r === 'provider') setRole(r);
  }, [searchParams]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'register') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: userName,
              role: role,
              cnpj: role === 'provider' ? cnpj : undefined,
              razao_social: role === 'provider' ? razaoSocial : undefined,
            }
          }
        });

        if (signUpError) throw signUpError;
        if (data.user) {
          // Success - Redirect or show confirmation
          window.location.href = role === 'client' ? '/dashboard/client' : '/dashboard/provider';
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;
        if (data.user) {
          const userRole = data.user.user_metadata?.role || 'client';
          window.location.href = userRole === 'client' ? '/dashboard/client' : '/dashboard/provider';
        }
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-stretch">

      {/* ── Left visual panel ──────────────────────────────────── */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-grid">
        {/* ambient orbs */}
        <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-[#B8924A]/8 rounded-full blur-[80px] animate-blob pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-[#141B25]/60 rounded-full blur-[60px] animate-blob animation-delay-2000 pointer-events-none" />

        <motion.img
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.12 }}
          transition={{ duration: 1.6 }}
          src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2000"
          className="absolute inset-0 w-full h-full object-cover grayscale"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative z-10 p-20 flex flex-col justify-between h-full">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-[#B8924A]/10 border border-[#B8924A]/20 p-1.5 rounded-lg">
              <Wrench size={20} className="text-[#B8924A]" />
            </div>
            <span className="text-xl font-black tracking-tighter text-foreground uppercase">ServiçosJá</span>
          </Link>

          <div className="space-y-6">
            <Badge variant="gold">Segurança em dobro</Badge>
            <h2 className="text-5xl font-black leading-[0.9] tracking-tighter">
              <span className="text-foreground">A maior rede de </span><br />
              <span className="text-foreground">profissionais do </span><br />
              <span className="text-gradient-gold">Brasil.</span>
            </h2>
            <p className="text-base text-muted-foreground font-medium max-w-md">
              Junte-se a milhares de usuários que transformam sua rotina com agilidade e confiança.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-4">
              {[
                { value: '+10k', label: 'Clientes' },
                { value: '+500', label: 'Profissionais' },
                { value: '4.9★', label: 'Avaliação' },
              ].map(({ value, label }) => (
                <div key={label} className="glass rounded-2xl p-4 text-center">
                  <p className="text-xl font-black text-[#B8924A]">{value}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 glass rounded-2xl p-4">
            <div className="w-10 h-10 rounded-xl bg-[#B8924A]/15 border border-[#B8924A]/25 flex items-center justify-center">
              <Sparkles size={16} className="text-[#B8924A]" />
            </div>
            <div>
              <p className="text-xs font-black text-foreground">+100 serviços concluídos agora</p>
              <p className="text-[10px] text-muted-foreground/50 font-bold">Plataforma em operação 24h</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-20 relative bg-dot">
        {/* back link (mobile) */}
        <Link
          href="/"
          className="lg:hidden absolute top-8 left-8 p-2 hover:bg-muted rounded-xl text-muted-foreground/50 hover:text-foreground transition-colors"
        >
          <ArrowLeft size={22} />
        </Link>

        <div className="w-full max-w-md space-y-10 mt-12 lg:mt-0">
          <header className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-black tracking-tighter text-foreground">
              {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-muted-foreground font-bold text-sm">
              {mode === 'login'
                ? 'Sentimos sua falta! Entre com seus dados.'
                : 'O primeiro passo para uma experiência incrível.'}
            </p>
          </header>

          <div className="space-y-7">
            {/* role toggle - Only show on register mode */}
            {mode === 'register' && (
              <div className="bg-white/[0.04] border border-white/[0.07] p-1 rounded-2xl flex gap-1 animate-in fade-in slide-in-from-top-2 duration-500">
                {(['client', 'provider'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={cn(
                      'flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all',
                      role === r
                        ? 'bg-[#B8924A] text-white shadow-lg shadow-[#B8924A]/20'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {r === 'client' ? 'Vou contratar' : 'Vou trabalhar'}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-xs font-bold animate-shake">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${mode}-${role}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {mode === 'register' && (
                    <Input
                      label="Como podemos te chamar?"
                      placeholder="Nome completo"
                      icon={<User size={16} />}
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  )}
                  {mode === 'register' && role === 'provider' && (
                    <>
                      <Input
                        label="CNPJ da Empresa"
                        placeholder="00.000.000/0000-00"
                        icon={<Fingerprint size={16} />}
                        value={cnpj}
                        onChange={handleCnpjChange}
                        required
                        error={
                          cnpj.replace(/\D/g, '').length > 0 && cnpj.replace(/\D/g, '').length < 14
                            ? 'CNPJ incompleto'
                            : undefined
                        }
                      />
                      <Input
                        label="Razão Social"
                        placeholder="Nome da empresa"
                        icon={<Building2 size={16} />}
                        value={razaoSocial}
                        onChange={(e) => setRazaoSocial(e.target.value)}
                        required
                        className={isFetchingCnpj ? 'animate-pulse opacity-60' : ''}
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <Input
                label="E-mail profissional"
                placeholder="exemplo@email.com"
                type="email"
                icon={<Mail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="space-y-2">
                <Input
                  label="Senha de acesso"
                  placeholder="••••••••"
                  type="password"
                  icon={<Lock size={16} />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {mode === 'login' && (
                  <button
                    type="button"
                    className="text-[11px] font-black uppercase tracking-widest text-[#B8924A] hover:text-[#d4af71] transition-colors"
                  >
                    Esqueceu sua senha?
                  </button>
                )}
              </div>

              <Button
                fullWidth
                variant="glow"
                size="lg"
                className="h-14 rounded-2xl font-black mt-2"
                isLoading={loading}
              >
                {mode === 'login' ? 'Continuar' : 'Criar minha conta'}
                {!loading && <ArrowRight size={18} />}
              </Button>
            </form>

            {/* divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-background px-4 text-muted-foreground/30">ou continue com</span>
              </div>
            </div>

            <button className="w-full flex items-center justify-center h-12 rounded-2xl border border-border bg-muted/30 hover:bg-muted/50 transition-all font-black text-sm gap-3 text-muted-foreground/60 hover:text-foreground">
              <Globe size={18} /> Continuar com Google
            </button>
          </div>

          <footer className="text-center">
            <p className="text-muted-foreground font-bold text-sm">
              {mode === 'login' ? 'Novo por aqui?' : 'Já possui uma conta?'}
              <button
                onClick={() => {
                  setMode(mode === 'login' ? 'register' : 'login');
                  setError(null);
                }}
                className="ml-2 text-[#B8924A] font-black hover:text-[#d4af71] transition-colors underline underline-offset-4"
              >
                {mode === 'login' ? 'Criar uma conta' : 'Fazer login'}
              </button>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#B8924A] border-t-transparent" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
