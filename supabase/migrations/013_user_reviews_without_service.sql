-- ============================================================
-- MIGRACAO 013: Avaliacoes vinculadas ao usuario, nao ao servico
-- ============================================================

ALTER TABLE public.reviews
  ALTER COLUMN request_id DROP NOT NULL;

DROP POLICY IF EXISTS "reviews: usuario avalia apenas servicos concluidos em que participou" ON public.reviews;
DROP POLICY IF EXISTS "reviews: usuario avalia apenas servicos concluidos em que parti" ON public.reviews;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND indexname = 'idx_reviews_reviewer_reviewed_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_reviews_reviewer_reviewed_unique
      ON public.reviews (reviewer_id, reviewed_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reviews'
      AND policyname = 'reviews: usuario avalia outro usuario'
  ) THEN
    CREATE POLICY "reviews: usuario avalia outro usuario"
      ON public.reviews FOR INSERT
      WITH CHECK (
        auth.uid() = reviewer_id
        AND reviewed_id <> reviewer_id
      );
  END IF;
END $$;
