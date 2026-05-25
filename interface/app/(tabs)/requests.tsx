import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, useWindowDimensions, View } from "react-native";

import { RequestCard, type ServiceRequest } from "@/components/request-card";
import { Body, Card, Screen, Title } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function RequestsScreen() {
  const { role, user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const contentWidth = isDesktop ? Math.min(width - 168 - 28, 1180) : width - 36;
  const cardWidth = Math.floor((contentWidth - 16) / 2);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);

    let query = supabase
      .from("service_requests")
      .select("id,title,category,status,city,state,created_at,media_urls")
      .order("created_at", { ascending: false })
      .limit(30);

    if (role === "client") {
      query = query.eq("client_id", user.id);
    } else {
      query = query.eq("status", "open");
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
    } else {
      setRequests((data || []) as ServiceRequest[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [role, user?.id]);

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingLeft: isDesktop ? 168 : 18,
          paddingRight: isDesktop ? 28 : 18,
          paddingTop: isDesktop ? 28 : 18,
          paddingBottom: 116,
          gap: 18
        }}
        refreshControl={<RefreshControl refreshing={loading} tintColor={colors.gold} onRefresh={load} />}
      >
        <View style={{ gap: 8 }}>
          <Title>{role === "client" ? "Meus pedidos" : "Oportunidades"}</Title>
          <Body>{role === "client" ? "Acompanhe seus pedidos ativos." : "Pedidos abertos para envio de proposta."}</Body>
        </View>

        {error ? (
          <Card>
            <Text selectable style={{ color: colors.danger, fontWeight: "800" }}>{error}</Text>
          </Card>
        ) : null}

        {loading && requests.length === 0 ? <ActivityIndicator color={colors.gold} /> : null}

        {!loading && requests.length === 0 ? (
          <Card>
            <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Nada por aqui ainda</Text>
            <Body>Quando houver pedidos disponíveis, eles aparecerão nesta lista.</Body>
          </Card>
        ) : null}

        {requests.length ? (
          <View style={{ flexDirection: "row", gap: 16, alignItems: "flex-start" }}>
            {/* Coluna esquerda */}
            <View style={{ flex: 1, gap: 16 }}>
              {requests.filter((_, i) => i % 2 === 0).map((request) => (
                <Link key={request.id} href={{ pathname: "/request/[id]", params: { id: request.id } }} asChild>
                  <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
                    <RequestCard request={request} />
                  </Pressable>
                </Link>
              ))}
            </View>
            {/* Coluna direita */}
            <View style={{ flex: 1, gap: 16 }}>
              {requests.filter((_, i) => i % 2 === 1).map((request) => (
                <Link key={request.id} href={{ pathname: "/request/[id]", params: { id: request.id } }} asChild>
                  <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
                    <RequestCard request={request} />
                  </Pressable>
                </Link>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
