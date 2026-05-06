-- Migration: Add DELETE policy to notifications table
-- This allows users to clear/delete their own notifications.

CREATE POLICY "notifications: usuário pode excluir as próprias"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);
