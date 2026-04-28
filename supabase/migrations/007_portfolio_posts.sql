-- ============================================================
-- Publicações de portfólio do prestador
-- ============================================================

CREATE TABLE public.portfolio_posts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  media_urls  text[]      NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_portfolio_provider ON public.portfolio_posts (provider_id);

ALTER TABLE public.portfolio_posts ENABLE ROW LEVEL SECURITY;

-- Qualquer visitante pode ver o portfólio de um prestador
CREATE POLICY "portfolio_posts: leitura pública"
  ON public.portfolio_posts FOR SELECT
  USING (true);

-- Prestador gerencia apenas as próprias publicações
CREATE POLICY "portfolio_posts: prestador gerencia próprias"
  ON public.portfolio_posts FOR ALL
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);
