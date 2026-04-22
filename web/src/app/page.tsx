'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench,
  ShieldCheck,
  ArrowRight,
  Star,
  Smartphone,
  Search,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

const categories = [
  { label: 'Elétrica',    icon: '⚡', items: 120, grad: 'from-yellow-500/10 to-amber-500/5' },
  { label: 'Hidráulica',  icon: '🔧', items: 85,  grad: 'from-blue-500/10 to-cyan-500/5' },
  { label: 'Pintura',     icon: '🎨', items: 156, grad: 'from-pink-500/10 to-rose-500/5' },
  { label: 'Limpeza',     icon: '🧹', items: 340, grad: 'from-emerald-500/10 to-green-500/5' },
  { label: 'Jardinagem',  icon: '🌿', items: 42,  grad: 'from-green-500/10 to-teal-500/5' },
  { label: 'Mecânica',    icon: '⚙️', items: 67,  grad: 'from-slate-500/10 to-gray-500/5' },
  { label: 'Montagem',    icon: '📦', items: 210, grad: 'from-orange-500/10 to-amber-500/5' },
  { label: 'Informática', icon: '💻', items: 98,  grad: 'from-violet-500/10 to-purple-500/5' },
];

const values = [
  {
    icon: ShieldCheck,
    title: 'Pagamento Protegido',
    desc: 'Seu dinheiro fica guardado com segurança e só é liberado para o profissional após a confirmação do serviço.',
  },
  {
    icon: Clock,
    title: 'Suporte 24h',
    desc: 'Nossa equipe está sempre disponível para ajudar você em qualquer etapa do atendimento.',
  },
  {
    icon: CheckCircle2,
    title: 'Profissionais VIP',
    desc: 'Realizamos a verificação rigorosa de antecedentes de todos os prestadores parceiros.',
  },
];

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-[#B8924A]/30">

      {/* ── Navbar ────────────────────────────────────────────────── */}
      <nav className={cn(
        'fixed top-0 inset-x-0 z-[100] px-6 transition-all duration-500',
        isScrolled
          ? 'py-3 bg-background/80 backdrop-blur-xl border-b border-white/[0.05]'
          : 'py-6 bg-transparent',
      )}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="bg-[#B8924A]/10 border border-[#B8924A]/20 p-1.5 rounded-lg group-hover:bg-[#B8924A]/20 transition-all">
              <Wrench size={20} className="text-[#B8924A]" />
            </div>
            <span className="text-xl font-black tracking-tighter text-white uppercase">ServiçosJá</span>
          </Link>

          <div className="flex items-center gap-4 md:gap-8">
            <div className="hidden md:flex items-center gap-8">
              {['Para você', 'Para trabalhar', 'Empresas'].map((item) => (
                <Link key={item} href="#" className="text-sm font-bold text-white/40 hover:text-white transition-colors">
                  {item}
                </Link>
              ))}
              <div className="h-4 w-px bg-white/10" />
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/auth?mode=login" className="text-sm font-bold text-white/40 hover:text-white transition-colors">
                Entrar
              </Link>
              <Button variant="gold" size="sm" href="/auth?mode=register" className="rounded-full px-4 md:px-6">
                Cadastrar
              </Button>
            </div>
          </div>

        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden bg-grid">
        {/* ambient orbs */}
        <div className="absolute top-1/4 -left-40 w-[500px] h-[500px] bg-[#B8924A]/8 rounded-full blur-[100px] animate-blob pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-[400px] h-[400px] bg-[#141B25]/60 rounded-full blur-[80px] animate-blob animation-delay-2000 pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 w-[300px] h-[300px] bg-[#B8924A]/5 rounded-full blur-[80px] animate-blob animation-delay-4000 pointer-events-none" />

        {/* radial vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(184,146,74,0.05),transparent)] pointer-events-none" />

        <div className="relative z-10 max-w-[1400px] mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

          {/* left column */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#B8924A]/10 border border-[#B8924A]/20 text-[#B8924A] text-[11px] font-black uppercase tracking-wider">
              <Sparkles size={12} />
              A maior plataforma de serviços do Brasil
            </div>

            <h1 className="text-6xl lg:text-[5.5rem] font-black leading-[0.9] tracking-tighter">
              <span className="text-white">A solução que </span><br />
              <span className="text-white">você precisa, </span><br />
              <span className="text-gradient-gold">no seu tempo.</span>
            </h1>

            <p className="max-w-xl text-lg text-white/45 font-medium leading-relaxed">
              Conectamos você aos melhores profissionais locais para resolver qualquer
              problema em minutos. Seguro, rápido e transparente.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-sm group">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-[#B8924A] transition-colors"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Qual serviço você precisa?"
                  onKeyDown={(e) => { if (e.key === 'Enter') window.location.href = '/auth?mode=login' }}
                  className="w-full h-14 glass rounded-2xl py-3 pl-12 pr-4 text-white placeholder:text-white/25 focus:outline-none focus:border-[#B8924A]/40 focus:ring-1 focus:ring-[#B8924A]/25 transition-all text-sm font-bold"
                />
              </div>
              <Button href="/auth?mode=login" variant="glow" size="lg" className="h-14 px-8 rounded-2xl group font-black">
                Pedir agora
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </div>

            <div className="flex items-center gap-8 pt-2">
              <div className="flex -space-x-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-full border-2 border-background bg-white/10"
                  />
                ))}
              </div>
              <p className="text-sm">
                <span className="text-[#B8924A] font-black">4.9/5</span>
                <span className="text-white/35 font-bold"> · +10k clientes satisfeitos</span>
              </p>
            </div>
          </motion.div>

          {/* right column */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-white/[0.08]">
              <img
                src="https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=2000"
                alt="Profissional de serviços"
                className="w-full h-full object-cover brightness-[0.35] grayscale"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

              {/* profile card */}
              <div className="absolute bottom-0 inset-x-0 p-6">
                <div className="glass rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Destaque do mês</p>
                      <h3 className="text-base font-black text-white mt-1">João Paulo</h3>
                      <p className="text-xs text-white/40 font-bold">Eletricista Certificado</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-[#B8924A]/15 border border-[#B8924A]/25 flex items-center justify-center text-[#B8924A] text-sm font-black">
                      JP
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={11} fill="#B8924A" color="#B8924A" />
                      ))}
                    </div>
                    <span className="text-[11px] font-bold text-white/40">4.9 · 120 serviços</span>
                  </div>
                </div>
              </div>
            </div>

            {/* floating notification */}
            <div className="absolute -left-10 top-1/3 glass rounded-2xl p-4 hidden xl:flex items-center gap-3 shadow-xl animate-bounce-slow">
              <div className="bg-green-500/10 border border-green-500/20 p-2.5 rounded-xl text-green-400 shrink-0">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-white">Serviço concluído!</p>
                <p className="text-[10px] text-white/35 font-bold">Há menos de 1 min</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────── */}
      <div className="py-10 border-y border-white/[0.04]">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap justify-between items-center gap-8">
          {['Elétrica', 'Construção', 'Hidráulica', 'Pintura', 'Limpeza'].map((s) => (
            <span key={s} className="text-xl font-black tracking-tighter text-white/[0.12]">
              {s}
            </span>
          ))}
        </div>
      </div>

      {/* ── Services grid ─────────────────────────────────────────── */}
      <section className="py-28 lg:py-40">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
            <div className="space-y-5">
              <Badge variant="gold">Categorias</Badge>
              <h2 className="text-5xl lg:text-7xl font-black tracking-tighter">
                <span className="text-white">Explore as </span><br />
                <span className="text-white/20">categorias.</span>
              </h2>
            </div>
            <Link
              href="/auth?mode=login"
              className="flex items-center gap-2 font-black text-sm text-white/35 hover:text-[#B8924A] transition-colors group"
            >
              Explorar tudo
              <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <div
                  onClick={() => window.location.href = '/auth?mode=login'}
                  className={cn(
                    'group cursor-pointer aspect-square flex flex-col items-center justify-center gap-4 rounded-2xl',
                    'border border-white/[0.06] bg-white/[0.02] transition-all duration-300 p-6 relative overflow-hidden',
                    'hover:border-[#B8924A]/25 hover:bg-white/[0.04]',
                    'hover:shadow-[0_0_28px_rgba(184,146,74,0.07)]',
                  )}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${cat.grad} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <span className="text-4xl relative z-10 group-hover:scale-110 transition-transform duration-300">
                    {cat.icon}
                  </span>
                  <div className="text-center relative z-10">
                    <h4 className="text-sm font-black text-white">{cat.label}</h4>
                    <p className="text-[11px] font-bold text-white/35 group-hover:text-white/55 mt-0.5">
                      {cat.items} profissionais
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────────────────── */}
      <section className="pb-24 mx-6">
        <div className="max-w-[1400px] mx-auto rounded-3xl border border-white/[0.06] bg-white/[0.02] p-12 lg:p-20 relative overflow-hidden">
          {/* top accent line */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-[#B8924A]/35 to-transparent" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-14">
            {values.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="space-y-5 group">
                <div className="w-13 h-13 w-12 h-12 rounded-2xl bg-[#B8924A]/10 border border-[#B8924A]/20 flex items-center justify-center text-[#B8924A] group-hover:glow-gold-sm transition-all">
                  <Icon size={22} />
                </div>
                <h3 className="text-2xl font-black text-white">{title}</h3>
                <p className="text-white/40 font-medium leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── App promo ─────────────────────────────────────────────── */}
      <section className="py-24 lg:py-36 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-12 lg:p-20 flex flex-col lg:flex-row items-center justify-between gap-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-[#B8924A]/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="space-y-8 lg:w-1/2 z-10">
              <Badge variant="gold">Em breve</Badge>
              <h2 className="text-5xl lg:text-6xl font-black tracking-tighter leading-none">
                <span className="text-white">A experiência completa </span><br />
                <span className="text-white/20">no seu bolso.</span>
              </h2>
              <p className="text-base font-medium text-white/40 max-w-md">
                Acompanhe serviços em tempo real, agende horários e converse com profissionais pelo app.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button variant="glow" size="lg" className="rounded-2xl gap-3 font-black">
                  <Smartphone size={20} /> App Store
                </Button>
                <Button variant="outline" size="lg" className="rounded-2xl gap-3 font-black">
                  Google Play
                </Button>
              </div>
            </div>

            <div className="lg:w-1/2 relative flex justify-center z-10">
              <div className="w-64 h-[480px] rounded-[2.5rem] border border-white/[0.10] bg-white/[0.03] relative overflow-hidden shadow-2xl">
                <div className="absolute inset-x-0 top-0 flex justify-center pt-3">
                  <div className="w-20 h-5 bg-white/[0.05] rounded-full" />
                </div>
                <div className="absolute inset-0 p-4 pt-12 space-y-3">
                  <div className="h-7 w-2/3 bg-white/[0.05] rounded-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="aspect-square bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                    <div className="aspect-square bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                  </div>
                  <div className="h-28 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                  <div className="h-10 w-full bg-[#B8924A]/15 border border-[#B8924A]/25 rounded-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="py-16 border-t border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2 space-y-5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="bg-[#B8924A]/10 border border-[#B8924A]/20 p-1.5 rounded-lg">
                <Wrench size={18} className="text-[#B8924A]" />
              </div>
              <span className="text-lg font-black tracking-tighter text-white uppercase">ServiçosJá</span>
            </Link>
            <p className="max-w-sm text-sm font-medium text-white/35 leading-relaxed">
              Transformando a forma como as pessoas contratam serviços locais através de tecnologia e confiança.
            </p>
          </div>
          {[
            { title: 'Empresa', links: ['Sobre nós', 'Carreiras', 'Blog'] },
            { title: 'Suporte', links: ['Centro de Ajuda', 'Segurança', 'Termos de Uso'] },
          ].map(({ title, links }) => (
            <div key={title} className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-white/[0.18]">{title}</h4>
              <ul className="space-y-3">
                {links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm font-bold text-white/35 hover:text-[#B8924A] transition-colors">
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="max-w-[1400px] mx-auto px-6 pt-12 border-t border-white/[0.04] mt-12 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/[0.18]">
            © 2026 ServiçosJá Tecnologia Ltda.
          </span>
          <div className="flex gap-6">
            {['Instagram', 'Twitter', 'LinkedIn'].map((s) => (
              <Link
                key={s}
                href="#"
                className="text-[10px] font-black uppercase tracking-widest text-white/[0.18] hover:text-[#B8924A] transition-colors"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
