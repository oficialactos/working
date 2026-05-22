import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { Body, Button, Card, Screen, Stat, Title } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { colors } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

export default function ProviderScreen() {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");

      setOpportunities(count || 0);
      setLoading(false);
    };

    load();
  }, []);

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 22, gap: 18 }}>
        <View style={{ gap: 8 }}>
          <Title>Olá, {user?.user_metadata?.full_name?.split(" ")?.[0] || "profissional"}.</Title>
          <Body>Veja oportunidades abertas e acompanhe suas conversas.</Body>
        </View>

        <Card>
          {loading ? (
            <ActivityIndicator color={colors.gold} />
          ) : (
            <View style={{ flexDirection: "row", gap: 14 }}>
              <Stat label="Oportunidades" value={String(opportunities)} />
              <Stat label="Plano" value="Trial" />
            </View>
          )}
        </Card>

        <Card>
          <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>
            Feed de serviços
          </Text>
          <Body>Os pedidos abertos já são lidos do Supabase respeitando as políticas RLS configuradas.</Body>
          <Link href="/requests" asChild>
            <Button>Ver oportunidades</Button>
          </Link>
        </Card>
      </ScrollView>
    </Screen>
  );
}
