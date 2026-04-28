-- ============================================================
-- Fix: cliente pode aceitar/rejeitar propostas das próprias requisições
-- ============================================================

-- Permite que o cliente atualize o status de propostas
-- vinculadas às suas service_requests (ex: aceitar/rejeitar)
CREATE POLICY "proposals: cliente pode aceitar ou rejeitar"
  ON public.proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = request_id AND sr.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = request_id AND sr.client_id = auth.uid()
    )
  );
