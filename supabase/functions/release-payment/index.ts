import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@15";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-12-18.acacia",
});

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

    const { request_id } = await req.json();

    if (!request_id) {
      return new Response(JSON.stringify({ error: "ID da requisição é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar a requisição e validar que o usuário autenticado é o cliente
    const { data: serviceRequest, error: requestError } = await supabase
      .from("service_requests")
      .select("id, client_id, status")
      .eq("id", request_id)
      .single();

    if (requestError || !serviceRequest) {
      return new Response(JSON.stringify({ error: "Requisição não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (serviceRequest.client_id !== user.id) {
      return new Response(JSON.stringify({ error: "Apenas o cliente pode confirmar a conclusão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (serviceRequest.status !== "in_progress") {
      return new Response(JSON.stringify({ error: "Serviço não está em andamento" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar o pagamento em custódia
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("request_id", request_id)
      .eq("status", "held")
      .single();

    if (paymentError || !payment) {
      return new Response(JSON.stringify({ error: "Pagamento em custódia não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Capturar o PaymentIntent no Stripe (libera o pagamento ao prestador)
    const capturedIntent = await stripe.paymentIntents.capture(
      payment.external_payment_id
    );

    if (capturedIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ error: "Falha ao liberar pagamento", details: capturedIntent.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Atualizar status do pagamento para liberado
    await supabase
      .from("payments")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // Marcar requisição como concluída
    await supabase
      .from("service_requests")
      .update({ status: "completed" })
      .eq("id", request_id);

    // Notificar o prestador
    await supabase.from("notifications").insert({
      user_id: payment.provider_id,
      type: "payment_released",
      title: "Pagamento liberado! 💰",
      body: `R$ ${payment.provider_amount.toFixed(2)} foram liberados para sua conta.`,
      data: { request_id, payment_id: payment.id },
    });

    // Notificar o cliente para avaliar
    await supabase.from("notifications").insert({
      user_id: user.id,
      type: "request_completed",
      title: "Serviço concluído!",
      body: "Avalie o prestador para ajudar outros clientes.",
      data: { request_id, provider_id: payment.provider_id },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Pagamento liberado com sucesso ao prestador.",
        released_amount: payment.provider_amount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro em release-payment:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
