-- Persist signup profile fields copied from auth metadata.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name, avatar_url, phone, cpf_cnpj, city, state)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf_cnpj',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'state'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    phone = EXCLUDED.phone,
    cpf_cnpj = EXCLUDED.cpf_cnpj,
    city = EXCLUDED.city,
    state = EXCLUDED.state;

  IF (NEW.raw_user_meta_data->>'role') = 'provider' THEN
    INSERT INTO public.provider_profiles (id, categories)
    VALUES (NEW.id, '{}')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
