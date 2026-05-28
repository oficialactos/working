-- ============================================================
-- MIGRACAO 017: Permitir marcar mensagens recebidas como lidas
-- ============================================================

DROP POLICY IF EXISTS "messages: participante marca recebidas como lidas" ON public.messages;
CREATE POLICY "messages: participante marca recebidas como lidas"
  ON public.messages FOR UPDATE
  USING (
    auth.uid() <> sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
        AND c.is_active = true
    )
  )
  WITH CHECK (
    auth.uid() <> sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
        AND c.is_active = true
    )
  );
