-- ============================================================
-- MIGRAÇÃO 002: Row Level Security (RLS) - Segurança e Privacidade
-- ============================================================

-- ============================================================
-- profiles: Cada usuário vê seu próprio perfil + prestadores públicos
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: leitura pública de dados básicos"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "profiles: edição apenas pelo próprio usuário"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles: inserção pelo próprio usuário"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- provider_profiles
-- ============================================================

ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "provider_profiles: leitura pública"
  ON public.provider_profiles FOR SELECT
  USING (true);

CREATE POLICY "provider_profiles: edição apenas pelo próprio prestador"
  ON public.provider_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "provider_profiles: inserção pelo próprio prestador"
  ON public.provider_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- service_requests
-- Clientes: veem apenas suas requisições
-- Prestadores: veem requisições abertas dentro do raio (geofiltro na query)
-- ============================================================

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

-- Cliente vê as próprias requisições
CREATE POLICY "requests: cliente vê as próprias"
  ON public.service_requests FOR SELECT
  USING (auth.uid() = client_id);

-- Prestador com assinatura ativa vê requisições abertas
CREATE POLICY "requests: prestador vê requisições abertas"
  ON public.service_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.id = auth.uid()
        AND pp.is_visible = true
    )
    AND status = 'open'
  );

CREATE POLICY "requests: cliente cria as próprias requisições"
  ON public.service_requests FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "requests: cliente atualiza as próprias requisições"
  ON public.service_requests FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "requests: cliente cancela as próprias requisições"
  ON public.service_requests FOR DELETE
  USING (auth.uid() = client_id AND status = 'open');

-- ============================================================
-- proposals (RN01 + RN02)
-- REGRA CRÍTICA: Prestador jamais vê proposta de outro prestador
-- ============================================================

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Cliente vê todas as propostas das suas requisições (mas sem preço de outros — filtrado no app)
CREATE POLICY "proposals: cliente vê propostas das suas requisições"
  ON public.proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = request_id AND sr.client_id = auth.uid()
    )
  );

-- Prestador vê APENAS as suas próprias propostas (RN01)
CREATE POLICY "proposals: prestador vê apenas as próprias"
  ON public.proposals FOR SELECT
  USING (auth.uid() = provider_id);

-- Prestador com assinatura ativa pode enviar propostas (RN05)
CREATE POLICY "proposals: prestador com assinatura pode enviar"
  ON public.proposals FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.id = auth.uid() AND pp.is_visible = true
    )
  );

-- Prestador pode atualizar sua própria proposta (enquanto pendente)
CREATE POLICY "proposals: prestador atualiza própria proposta pendente"
  ON public.proposals FOR UPDATE
  USING (auth.uid() = provider_id AND status = 'pending');

-- ============================================================
-- chats
-- Apenas os dois participantes da negociação têm acesso
-- ============================================================

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chats: apenas participantes visualizam"
  ON public.chats FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "chats: sistema cria (via function)"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);

-- ============================================================
-- messages (RN - Chat restrito aos dois participantes)
-- ============================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Apenas participantes do chat leem as mensagens
CREATE POLICY "messages: apenas participantes do chat leem"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
        AND c.is_active = true
    )
  );

-- Apenas participantes do chat enviam mensagens
CREATE POLICY "messages: apenas participantes enviam"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats c
      WHERE c.id = chat_id
        AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
        AND c.is_active = true
    )
  );

-- ============================================================
-- payments
-- ============================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments: cliente vê seus próprios pagamentos"
  ON public.payments FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "payments: prestador vê pagamentos que receberá"
  ON public.payments FOR SELECT
  USING (auth.uid() = provider_id);

CREATE POLICY "payments: apenas sistema insere (via Edge Function)"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = client_id);

-- ============================================================
-- scheduled_visits
-- ============================================================

ALTER TABLE public.scheduled_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits: participantes visualizam"
  ON public.scheduled_visits FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "visits: prestador cria visita"
  ON public.scheduled_visits FOR INSERT
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "visits: participantes atualizam"
  ON public.scheduled_visits FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- ============================================================
-- reviews
-- ============================================================

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews: avaliações são públicas"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews: usuário avalia apenas serviços concluídos em que participou"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.service_requests sr
      WHERE sr.id = request_id
        AND sr.status = 'completed'
        AND (sr.client_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.proposals p
          WHERE p.request_id = sr.id AND p.provider_id = auth.uid() AND p.status = 'accepted'
        ))
    )
  );

-- ============================================================
-- notifications
-- ============================================================

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications: usuário vê apenas as próprias"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notifications: usuário marca como lida"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);
