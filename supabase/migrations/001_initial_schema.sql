-- ============================================================
-- MIGRAÇÃO 001: Schema Inicial da Plataforma de Serviços
-- ============================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE user_role AS ENUM ('client', 'provider');
CREATE TYPE request_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE proposal_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE payment_status AS ENUM ('pending', 'held', 'released', 'refunded');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
CREATE TYPE visit_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

-- ============================================================
-- 3. TABELA: profiles
-- Estende auth.users com dados do negócio
-- ============================================================

CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            user_role NOT NULL,
  full_name       text,
  avatar_url      text,
  phone           text,
  bio             text,
  -- Geolocalização (PostGIS)
  location        geography(POINT, 4326),
  city            text,
  state           text,
  -- Dados fiscais (preenchidos na contratação)
  cpf_cnpj        text,
  -- Status e controle
  is_active       boolean DEFAULT true,
  rating_avg      numeric(3,2) DEFAULT 0.0,
  rating_count    integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- Índice espacial para consultas de geolocalização
CREATE INDEX idx_profiles_location ON public.profiles USING GIST (location);
CREATE INDEX idx_profiles_role ON public.profiles (role);

-- ============================================================
-- 4. TABELA: provider_profiles
-- Dados extras exclusivos do Prestador
-- ============================================================

CREATE TABLE public.provider_profiles (
  id                  uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  categories          text[] NOT NULL DEFAULT '{}',
  service_radius_km   integer DEFAULT 20,
  subscription_status subscription_status DEFAULT 'trialing',
  subscription_id     text,       -- ID externo (Stripe/Pagar.me)
  subscription_end    timestamptz,
  portfolio_urls      text[] DEFAULT '{}',  -- URLs de fotos/vídeos
  is_visible          boolean GENERATED ALWAYS AS (subscription_status = 'active' OR subscription_status = 'trialing') STORED,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_provider_categories ON public.provider_profiles USING GIN (categories);

-- ============================================================
-- 5. TABELA: service_requests
-- Solicitações criadas pelos Clientes
-- ============================================================

CREATE TABLE public.service_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status          request_status DEFAULT 'open',
  category        text NOT NULL,
  title           text NOT NULL,
  description     text NOT NULL,
  media_urls      text[] DEFAULT '{}',          -- Fotos/vídeos enviados pelo cliente
  location_point  geography(POINT, 4326),
  address_text    text,
  city            text,
  state           text,
  search_radius_km integer DEFAULT 20,
  accepted_proposal_id uuid,                   -- Referência após aceite (circular, definida depois)
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_requests_location ON public.service_requests USING GIST (location_point);
CREATE INDEX idx_requests_status ON public.service_requests (status);
CREATE INDEX idx_requests_category ON public.service_requests (category);
CREATE INDEX idx_requests_client ON public.service_requests (client_id);

-- ============================================================
-- 6. TABELA: proposals
-- Propostas enviadas pelos Prestadores
-- ============================================================

CREATE TABLE public.proposals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  provider_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  price           numeric(12,2) NOT NULL,
  description     text,                         -- Detalhes da proposta (PRIVADO)
  deadline_days   integer,                      -- Prazo estimado em dias
  status          proposal_status DEFAULT 'pending',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (request_id, provider_id)              -- Um prestador só pode enviar uma proposta por requisição
);

CREATE INDEX idx_proposals_request ON public.proposals (request_id);
CREATE INDEX idx_proposals_provider ON public.proposals (provider_id);
CREATE INDEX idx_proposals_status ON public.proposals (status);

-- Adicionar referência circular depois de criar proposals
ALTER TABLE public.service_requests
  ADD CONSTRAINT fk_accepted_proposal
  FOREIGN KEY (accepted_proposal_id) REFERENCES public.proposals(id);

-- ============================================================
-- 7. TABELA: chats
-- Uma conversa por par (request + provider)
-- ============================================================

CREATE TABLE public.chats (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.profiles(id),
  provider_id     uuid NOT NULL REFERENCES public.profiles(id),
  is_active       boolean DEFAULT false,        -- Ativado somente após aceite do orçamento (RN03)
  created_at      timestamptz DEFAULT now(),
  UNIQUE (request_id, provider_id)
);

CREATE INDEX idx_chats_client ON public.chats (client_id);
CREATE INDEX idx_chats_provider ON public.chats (provider_id);

-- ============================================================
-- 8. TABELA: messages
-- Mensagens do Chat em Tempo Real
-- ============================================================

CREATE TABLE public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id         uuid NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id),
  content         text NOT NULL,
  is_read         boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_messages_chat ON public.messages (chat_id, created_at DESC);

-- ============================================================
-- 9. TABELA: payments
-- Custódia de Pagamento (Escrow)
-- ============================================================

CREATE TABLE public.payments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          uuid NOT NULL REFERENCES public.service_requests(id),
  proposal_id         uuid NOT NULL REFERENCES public.proposals(id),
  client_id           uuid NOT NULL REFERENCES public.profiles(id),
  provider_id         uuid NOT NULL REFERENCES public.profiles(id),
  amount              numeric(12,2) NOT NULL,
  platform_fee        numeric(12,2) DEFAULT 0,
  provider_amount     numeric(12,2) GENERATED ALWAYS AS (amount - platform_fee) STORED,
  status              payment_status DEFAULT 'pending',
  payment_method      text,                       -- 'pix' | 'credit_card'
  external_payment_id text,                       -- ID no gateway (Stripe/Pagar.me)
  held_at             timestamptz,
  released_at         timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_payments_request ON public.payments (request_id);
CREATE INDEX idx_payments_status ON public.payments (status);

-- ============================================================
-- 10. TABELA: scheduled_visits
-- Visitas técnicas agendadas (RF04)
-- ============================================================

CREATE TABLE public.scheduled_visits (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES public.service_requests(id),
  provider_id     uuid NOT NULL REFERENCES public.profiles(id),
  client_id       uuid NOT NULL REFERENCES public.profiles(id),
  scheduled_at    timestamptz NOT NULL,
  status          visit_status DEFAULT 'pending',
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- 11. TABELA: reviews
-- Avaliações mútuas após conclusão (RF06)
-- ============================================================

CREATE TABLE public.reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES public.service_requests(id),
  reviewer_id     uuid NOT NULL REFERENCES public.profiles(id),
  reviewed_id     uuid NOT NULL REFERENCES public.profiles(id),
  rating          smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (request_id, reviewer_id)              -- Uma avaliação por par por serviço
);

CREATE INDEX idx_reviews_reviewed ON public.reviews (reviewed_id);

-- ============================================================
-- 12. TABELA: notifications
-- Notificações push/in-app
-- ============================================================

CREATE TABLE public.notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type            text NOT NULL,                -- 'new_request', 'new_proposal', 'proposal_accepted', etc.
  title           text NOT NULL,
  body            text,
  data            jsonb,
  is_read         boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications (user_id, is_read, created_at DESC);

-- ============================================================
-- 13. FUNÇÃO: Atualizar rating médio do perfil
-- ============================================================

CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    rating_avg   = (SELECT AVG(rating)::numeric(3,2) FROM public.reviews WHERE reviewed_id = NEW.reviewed_id),
    rating_count = (SELECT COUNT(*) FROM public.reviews WHERE reviewed_id = NEW.reviewed_id),
    updated_at   = now()
  WHERE id = NEW.reviewed_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION update_profile_rating();

-- ============================================================
-- 14. FUNÇÃO: Rejeitar propostas concorrentes (RN02)
-- Quando uma proposta é aceita, as demais viram 'rejected'
-- ============================================================

CREATE OR REPLACE FUNCTION reject_competing_proposals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Rejeitar todas as outras propostas desta requisição
    UPDATE public.proposals
    SET status = 'rejected', updated_at = now()
    WHERE request_id = NEW.request_id
      AND id <> NEW.id
      AND status = 'pending';

    -- Atualizar status da requisição para em andamento
    UPDATE public.service_requests
    SET
      status = 'in_progress',
      accepted_proposal_id = NEW.id,
      updated_at = now()
    WHERE id = NEW.request_id;

    -- Ativar o chat correspondente
    UPDATE public.chats
    SET is_active = true
    WHERE request_id = NEW.request_id
      AND provider_id = NEW.provider_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reject_competing_proposals
  AFTER UPDATE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION reject_competing_proposals();

-- ============================================================
-- 15. FUNÇÃO: Atualizar timestamp updated_at automaticamente
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 16. FUNÇÃO GEOESPACIAL: Buscar prestadores próximos
-- ============================================================

CREATE OR REPLACE FUNCTION get_nearby_providers(
  p_lat           float,
  p_lng           float,
  p_radius_km     float DEFAULT 20,
  p_category      text DEFAULT NULL
)
RETURNS TABLE (
  provider_id     uuid,
  full_name       text,
  avatar_url      text,
  bio             text,
  rating_avg      numeric,
  rating_count    integer,
  categories      text[],
  distance_km     float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.rating_avg,
    p.rating_count,
    pp.categories,
    ST_Distance(p.location, ST_MakePoint(p_lng, p_lat)::geography) / 1000 AS distance_km
  FROM public.profiles p
  JOIN public.provider_profiles pp ON pp.id = p.id
  WHERE
    p.role = 'provider'
    AND p.is_active = true
    AND pp.is_visible = true
    AND ST_DWithin(p.location, ST_MakePoint(p_lng, p_lat)::geography, p_radius_km * 1000)
    AND (p_category IS NULL OR p_category = ANY(pp.categories))
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 17. FUNÇÃO: Criação automática de perfil após signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Se for prestador, também cria o provider_profile
  IF (NEW.raw_user_meta_data->>'role') = 'provider' THEN
    INSERT INTO public.provider_profiles (id, categories)
    VALUES (NEW.id, '{}');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
