'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationProps {
  show: boolean;
  type: NotificationType;
  title: string;
  message: string;
  onClose: () => void;
  duration?: number;
}

const config = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-green-400',
    bar: 'bg-green-500',
    border: 'border-green-500/20',
    bg: 'bg-green-500/[0.06]',
  },
  error: {
    icon: AlertCircle,
    iconColor: 'text-red-400',
    bar: 'bg-red-500',
    border: 'border-red-500/25',
    bg: 'bg-red-500/[0.07]',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    bar: 'bg-blue-500',
    border: 'border-blue-500/20',
    bg: 'bg-blue-500/[0.06]',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    bar: 'bg-amber-500',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/[0.06]',
  },
};

export const Notification = ({
  show,
  type,
  title,
  message,
  onClose,
  duration = 5000,
}: NotificationProps) => {
  const [progress, setProgress] = useState(100);
  const { icon: Icon, iconColor, bar, border, bg } = config[type];

  useEffect(() => {
    if (!show || duration <= 0) return;
    setProgress(100);
    const step = 100 / (duration / 50);
    const interval = setInterval(() => {
      setProgress(p => {
        if (p <= 0) { clearInterval(interval); return 0; }
        return p - step;
      });
    }, 50);
    const timer = setTimeout(onClose, duration);
    return () => { clearInterval(interval); clearTimeout(timer); };
  }, [show, duration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 60, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={cn(
            'fixed top-4 right-4 z-[200] w-[calc(100%-2rem)] max-w-sm',
            'rounded-2xl border backdrop-blur-xl overflow-hidden',
            'shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
            border, bg,
          )}
        >
          {/* progress bar */}
          <div
            className={cn('h-[2px] transition-none', bar)}
            style={{ width: `${progress}%` }}
          />

          <div className="flex items-start gap-3.5 p-4">
            <div className={cn('mt-0.5 shrink-0', iconColor)}>
              <Icon size={18} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-xs uppercase tracking-widest text-foreground">{title}</p>
              <p className="text-xs font-bold text-muted-foreground leading-relaxed mt-0.5">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1 rounded-lg hover:bg-foreground/8 transition-colors text-muted-foreground/50 hover:text-muted-foreground"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
