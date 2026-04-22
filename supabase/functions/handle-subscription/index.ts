import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@15";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

const MONTHLY_PRICE_ID = Deno.env.get("STRIPE_MONTHLY_PRICE_ID")!;

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Webhook do Stripe para sincronizar assinaturas
  if (req.method === "POST" && req.url.includes("/webhook")) {
    const sig = req.headers.get("stripe-signature")!;
    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        sig,
        Deno.env.get("STRIPE_WEBHOOK_SECRET")!
      );
    } catch (err) {
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        const providerId = subscription.metadata?.provider_id;
        if (!providerId) break;

        await supabase
          .from("provider_profiles")
          .update({
            subscription_status: subscription.status,
            subscription_id: subscription.id,
            subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("id", providerId);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const providerId = subscription.metadata?.provider_id;
        if (!providerId) break;

        await supabase
          .from("provider_profiles")
          .update({ subscription_status: "cancelled" })
          .eq("id", providerId);

        // Notificar o prestador
        await supabase.from("notifications").insert({
          user_id: providerId,
          type: "subscription_cancelled",
          title: "Assinatura cancelada",
          body: "Sua assinatura foi cancelada. Renove para continuar recebendo leads.",
          data: {},
        });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscription = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        );
        const providerId = subscription.metadata?.provider_id;
        if (!providerId) break;

        await supabase
          .from("provider_profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", providerId);

        await supabase.from("notifications").insert({
          user_id: providerId,
          type: "payment_failed",
          title: "Pagamento da mensalidade falhou",
          body: "Atualize seu método de pagamento para continuar visível na plataforma.",
          data: {},
        });
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Endpoint para criar checkout de assinatura
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action } = await req.json();

    if (action === "create_checkout") {
      // Buscar perfil do prestador
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      // Criar ou buscar customer Stripe
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      let customerId = customers.data[0]?.id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email!,
          name: profile?.full_name ?? user.email,
          metadata: { provider_id: user.id },
        });
        customerId = customer.id;
      }

      // Criar sessão de checkout
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: MONTHLY_PRICE_ID, quantity: 1 }],
        subscription_data: {
          metadata: { provider_id: user.id },
          trial_period_days: 7,
        },
        success_url: `${Deno.env.get("APP_URL")}/subscription/success`,
        cancel_url: `${Deno.env.get("APP_URL")}/subscription`,
      });

      return new Response(
        JSON.stringify({ checkout_url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "create_portal") {
      const { data: providerProfile } = await supabase
        .from("provider_profiles")
        .select("subscription_id")
        .eq("id", user.id)
        .single();

      if (!providerProfile?.subscription_id) {
        return new Response(JSON.stringify({ error: "Nenhuma assinatura ativa" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const subscription = await stripe.subscriptions.retrieve(
        providerProfile.subscription_id
      );

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.customer as string,
        return_url: `${Deno.env.get("APP_URL")}/subscription`,
      });

      return new Response(
        JSON.stringify({ portal_url: session.url }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Ação inválida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Erro em handle-subscription:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
