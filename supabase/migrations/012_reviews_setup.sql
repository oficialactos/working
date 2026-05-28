-- ============================================================
-- MIGRACAO 012: Avaliacoes de usuarios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (request_id, reviewer_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON public.reviews (reviewed_id);
CREATE INDEX IF NOT EXISTS idx_reviews_request ON public.reviews (request_id);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT INSERT ON public.reviews TO authenticated;

CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    rating_avg = COALESCE((
      SELECT AVG(rating)::numeric(3,2)
      FROM public.reviews
      WHERE reviewed_id = NEW.reviewed_id
    ), 0),
    rating_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE reviewed_id = NEW.reviewed_id
    ),
    updated_at = now()
  WHERE id = NEW.reviewed_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_rating ON public.reviews;
CREATE TRIGGER trg_update_rating
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'reviews: avaliacoes sao publicas'
  ) THEN
    CREATE POLICY "reviews: avaliacoes sao publicas"
      ON public.reviews FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'reviews: usuario avalia apenas servicos concluidos em que participou'
  ) THEN
    CREATE POLICY "reviews: usuario avalia apenas servicos concluidos em que participou"
      ON public.reviews FOR INSERT
      WITH CHECK (
        auth.uid() = reviewer_id
        AND reviewed_id <> reviewer_id
        AND EXISTS (
          SELECT 1
          FROM public.service_requests sr
          WHERE sr.id = request_id
            AND sr.status = 'completed'
            AND (
              sr.client_id = auth.uid()
              OR EXISTS (
                SELECT 1
                FROM public.proposals p
                WHERE p.request_id = sr.id
                  AND p.provider_id = auth.uid()
                  AND p.status = 'accepted'
              )
            )
            AND (
              sr.client_id = reviewed_id
              OR EXISTS (
                SELECT 1
                FROM public.proposals p
                WHERE p.request_id = sr.id
                  AND p.provider_id = reviewed_id
                  AND p.status = 'accepted'
              )
            )
        )
      );
  END IF;
END $$;
