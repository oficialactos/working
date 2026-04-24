-- ============================================================
-- MIGRAÇÃO 005: Sistema de Notificações e Gatilhos
-- ============================================================

-- 1. Consolidar a tabela de notificações (Garantir que as colunas corretas existam)
-- Usaremos o padrão esperado pelo DashboardLayout e NotificationsPage
DO $$ 
BEGIN
    -- Se a tabela não existe, cria com a estrutura correta
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        CREATE TABLE public.notifications (
            id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            type            text NOT NULL DEFAULT 'info', -- 'message', 'success', 'info', 'warning'
            title           text NOT NULL,
            body            text,
            link            text,
            is_read         boolean DEFAULT false,
            created_at      timestamptz DEFAULT now()
        );
    ELSE
        -- Se existe, garante que as colunas necessárias existam
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'body') THEN
            ALTER TABLE public.notifications RENAME COLUMN content TO body;
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
            ALTER TABLE public.notifications ADD COLUMN link text;
        END IF;

        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
            ALTER TABLE public.notifications ADD COLUMN is_read boolean DEFAULT false;
            -- Se existia read_at, podemos migrar os dados se necessário, mas simplificaremos
        END IF;
    END IF;
END $$;

-- 2. Adicionar preferências de notificação ao perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notif_new_leads boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_messages boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notif_status_updates boolean DEFAULT true;

-- 3. GATILHO: Nova Mensagem
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    recipient_id UUID;
    sender_name TEXT;
    notif_enabled BOOLEAN;
BEGIN
    -- Obter o destinatário (a outra pessoa no chat)
    SELECT CASE 
        WHEN NEW.sender_id = client_id THEN provider_id 
        ELSE client_id 
    END INTO recipient_id
    FROM public.chats
    WHERE id = NEW.chat_id;

    -- Verificar se o destinatário quer receber notificações de mensagens
    SELECT notif_messages INTO notif_enabled FROM public.profiles WHERE id = recipient_id;

    IF notif_enabled THEN
        -- Obter nome do remetente
        SELECT full_name INTO sender_name
        FROM public.profiles
        WHERE id = NEW.sender_id;

        -- Inserir notificação
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
            recipient_id,
            'message',
            'Nova mensagem de ' || COALESCE(sender_name, 'Alguém'),
            NEW.content,
            '/dashboard/chat?id=' || NEW.chat_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 4. GATILHO: Nova Proposta
CREATE OR REPLACE FUNCTION public.notify_new_proposal()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_request_title TEXT;
    v_provider_name TEXT;
    v_notif_enabled BOOLEAN;
BEGIN
    -- Obter cliente e título da requisição
    SELECT sr.client_id, sr.title INTO v_client_id, v_request_title
    FROM public.service_requests sr
    WHERE sr.id = NEW.request_id;

    -- Verificar preferência do cliente
    SELECT notif_status_updates INTO v_notif_enabled FROM public.profiles WHERE id = v_client_id;

    IF v_notif_enabled THEN
        -- Obter nome do prestador
        SELECT full_name INTO v_provider_name
        FROM public.profiles
        WHERE id = NEW.provider_id;

        -- Inserir notificação
        INSERT INTO public.notifications (user_id, type, title, body, link)
        VALUES (
            v_client_id,
            'success',
            'Nova proposta recebida!',
            COALESCE(v_provider_name, 'Um profissional') || ' enviou uma proposta para "' || v_request_title || '".',
            '/dashboard/client/request/' || NEW.request_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_proposal ON public.proposals;
CREATE TRIGGER trg_notify_new_proposal
AFTER INSERT ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_new_proposal();

-- 5. GATILHO: Proposta Aceita
CREATE OR REPLACE FUNCTION public.notify_proposal_accepted()
RETURNS TRIGGER AS $$
DECLARE
    v_request_title TEXT;
    v_chat_id UUID;
    v_notif_enabled BOOLEAN;
BEGIN
    IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status <> 'accepted') THEN
        -- Verificar preferência do prestador
        SELECT notif_status_updates INTO v_notif_enabled FROM public.profiles WHERE id = NEW.provider_id;

        IF v_notif_enabled THEN
            -- Obter título da requisição
            SELECT title INTO v_request_title
            FROM public.service_requests
            WHERE id = NEW.request_id;

            -- Obter ID do chat
            SELECT id INTO v_chat_id
            FROM public.chats
            WHERE request_id = NEW.request_id AND provider_id = NEW.provider_id;

            -- Inserir notificação para o prestador
            INSERT INTO public.notifications (user_id, type, title, body, link)
            VALUES (
                NEW.provider_id,
                'success',
                'Sua proposta foi aceita!',
                'O cliente aceitou sua proposta para "' || v_request_title || '". O chat já está disponível.',
                CASE WHEN v_chat_id IS NOT NULL THEN '/dashboard/chat?id=' || v_chat_id ELSE '/dashboard/chat' END
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_proposal_accepted ON public.proposals;
CREATE TRIGGER trg_notify_proposal_accepted
AFTER UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION public.notify_proposal_accepted();

-- 6. GATILHO: Novo Pedido (Leads para Prestadores)
CREATE OR REPLACE FUNCTION public.notify_new_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar prestadores da mesma categoria que têm notificações de leads ativas
    INSERT INTO public.notifications (user_id, type, title, body, link)
    SELECT 
        p.id,
        'info',
        'Novo serviço disponível!',
        'Um novo pedido de "' || NEW.category || '" foi postado' || 
        CASE WHEN NEW.city IS NOT NULL THEN ' em ' || NEW.city ELSE '' END || '.',
        '/dashboard/provider/feed'
    FROM public.profiles p
    JOIN public.provider_profiles pp ON pp.id = p.id
    WHERE p.role = 'provider'
      AND p.notif_new_leads = true
      AND NEW.category = ANY(pp.categories)
      AND p.id <> NEW.client_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_new_request ON public.service_requests;
CREATE TRIGGER trg_notify_new_request
AFTER INSERT ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_new_request();
