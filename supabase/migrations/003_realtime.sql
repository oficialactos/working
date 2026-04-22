-- ============================================================
-- MIGRAÇÃO 003: Realtime para Chat e Notificações
-- ============================================================

-- Habilitar publicação Realtime nas tabelas necessárias
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chats;
