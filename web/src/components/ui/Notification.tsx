'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, X, Info, Zap } from 'lucide-react';
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

export const Notification = ({ 
  show, 
  type, 
  title, 
  message, 
  onClose, 
  duration = 5000 
}: NotificationProps) => {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const icons = {
    success: <CheckCircle2 className="text-green-500" size={24} />,
    error: <AlertCircle className="text-red-500" size={24} />,
    info: <Info className="text-blue-500" size={24} />,
    warning: <Zap className="text-amber-500" size={24} />,
  };

  const colors = {
    success: "border-green-500/20 bg-green-500/5",
    error: "border-red-500/20 bg-red-500/5",
    info: "border-blue-500/20 bg-blue-500/5",
    warning: "border-amber-500/20 bg-amber-500/5",
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, x: '-50%', y: '-40%', scale: 0.9 }}
          animate={{ opacity: 1, x: '-50%', y: '-50%', scale: 1 }}
          exit={{ opacity: 0, x: '-50%', y: '-40%', scale: 0.9 }}
          className={cn(
            "fixed top-1/2 left-1/2 z-[200] max-w-sm w-[calc(100%-2rem)] p-6 rounded-[2.5rem] border backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] flex items-start gap-4",
            colors[type]
          )}
        >
          <div className="mt-1">{icons[type]}</div>
          <div className="flex-1 space-y-1">
            <h4 className="font-black text-sm text-foreground uppercase tracking-wider">{title}</h4>
            <p className="text-xs font-bold text-muted-foreground leading-relaxed">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground/50"
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
