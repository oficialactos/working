-- ============================================================
-- MIGRACAO 015: Editar e apagar mensagens proprias
-- ============================================================

DROP POLICY IF EXISTS "messages: remetente edita propria mensagem" ON public.messages;
CREATE POLICY "messages: remetente edita propria mensagem"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "messages: remetente apaga propria mensagem" ON public.messages;
CREATE POLICY "messages: remetente apaga propria mensagem"
  ON public.messages FOR DELETE
  USING (auth.uid() = sender_id);
