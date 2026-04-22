import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@15";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

const PLATFORM_FEE_PERCENT = 0.10; // 10% de taxa da plataforma

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Autenticar usuário via JWT
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { proposal_id, payment_method } = await req.json();

    if (!proposal_id || !payment_method) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar dados da proposta e validar que o usuário é o cliente
    const { data: proposal, error: proposalError } = await supabase
      .from("proposals")
      .select(`
        id, price, status, provider_id,
        service_requests!inner(id, client_id, status)
      `)
      .eq("id", proposal_id)
      .single();

    if (proposalError || !proposal) {
      return new Response(JSON.stringify({ error: "Proposta não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se o usuário é o cliente da requisição
    if (proposal.service_requests.client_id !== user.id) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se a proposta está pendente
    if (proposal.status !== "pending") {
      return new Response(JSON.stringify({ error: "Esta proposta já foi processada" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = proposal.price;
    const platformFee = Number((amount * PLATFORM_FEE_PERCENT).toFixed(2));
    const amountInCents = Math.round(amount * 100);
    const feeInCents = Math.round(platformFee * 100);

    // Criar PaymentIntent no Stripe com captura manual (hold/custódia)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "brl",
      capture_method: "manual", // Não captura automaticamente → custódia
      payment_method: payment_method,
      confirmation_method: "manual",
      confirm: true,
      metadata: {
        proposal_id,
        request_id: proposal.service_requests.id,
        client_id: user.id,
        provider_id: proposal.provider_id,
      },
      application_fee_amount: feeInCents,
    });

    if (paymentIntent.status !== "requires_capture") {
      return new Response(
        JSON.stringify({ error: "Falha no pagamento", details: paymentIntent.status }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Registrar o pagamento em custódia no banco
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        request_id: proposal.service_requests.id,
        proposal_id,
        client_id: user.id,
        provider_id: proposal.provider_id,
        amount,
        platform_fee: platformFee,
        status: "held",
        payment_method: payment_method.startsWith("pm_") ? "credit_card" : "pix",
        external_payment_id: paymentIntent.id,
        held_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      throw new Error(`Erro ao registrar pagamento: ${paymentError.message}`);
    }

    // Aceitar a proposta (trigger dispara rejeição das demais + ativa chat)
    await supabase
      .from("proposals")
      .update({ status: "accepted" })
      .eq("id", proposal_id);

    // Notificar prestador
    await supabase.from("notifications").insert({
      user_id: proposal.provider_id,
      type: "proposal_accepted",
      title: "Sua proposta foi aceita! 🎉",
      body: "O cliente aceitou sua proposta. O pagamento está em custódia.",
      data: { request_id: proposal.service_requests.id, proposal_id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        status: "held",
        message: "Pagamento em custódia. Conclua o serviço para liberar.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro em process-payment:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
