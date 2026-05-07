'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'primary',
  isLoading = false
}: ConfirmDialogProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "relative w-full max-w-sm rounded-[32px] border border-border bg-card p-6 shadow-2xl overflow-hidden",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-foreground/[0.02] before:to-transparent before:pointer-events-none"
            )}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground/50 hover:text-foreground"
            >
              <X size={16} />
            </button>

            <div className="flex flex-col items-center text-center space-y-4">
              {/* Icon */}
              <div className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border",
                variant === 'danger' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                variant === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                "bg-[#B8924A]/10 border-[#B8924A]/20 text-[#B8924A]"
              )}>
                <AlertTriangle size={24} strokeWidth={2.5} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black tracking-tight text-foreground">{title}</h3>
                <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 pt-2">
                <Button
                  onClick={onConfirm}
                  disabled={isLoading}
                  variant={variant === 'danger' ? 'destructive' : 'glow'}
                  className={cn(
                    "w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest",
                    variant === 'danger' && "bg-red-500 hover:bg-red-600 border-none shadow-[0_4px_16px_rgba(239,68,68,0.3)] text-white"
                  )}
                >
                  {isLoading ? 'Processando...' : confirmLabel}
                </Button>
                <button
                  onClick={onClose}
                  className="w-full h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  {cancelLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
