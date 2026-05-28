-- ============================================================
-- MIGRACAO 018: Bloqueio entre usuarios no chat
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks (blocked_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blocks: participantes visualizam bloqueios proprios" ON public.user_blocks;
CREATE POLICY "user_blocks: participantes visualizam bloqueios proprios"
  ON public.user_blocks FOR SELECT
  USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

DROP POLICY IF EXISTS "user_blocks: usuario cria seus bloqueios" ON public.user_blocks;
CREATE POLICY "user_blocks: usuario cria seus bloqueios"
  ON public.user_blocks FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "user_blocks: usuario remove seus bloqueios" ON public.user_blocks;
CREATE POLICY "user_blocks: usuario remove seus bloqueios"
  ON public.user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "messages: apenas participantes enviam" ON public.messages;
CREATE POLICY "messages: apenas participantes enviam"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
        AND c.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM public.user_blocks ub
          WHERE (ub.blocker_id = c.client_id AND ub.blocked_id = c.provider_id)
             OR (ub.blocker_id = c.provider_id AND ub.blocked_id = c.client_id)
        )
    )
  );
