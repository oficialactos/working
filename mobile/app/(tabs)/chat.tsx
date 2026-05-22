import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { AppScroll, Body, Card, EmptyState, PageHeader, Pill, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type Chat = {
  id: string;
  created_at: string;
  request?: { title?: string | null } | null;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data } = await supabase
        .from("chats")
        .select("id,created_at,request:service_requests(title)")
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20);

      setChats((data || []) as Chat[]);
      setLoading(false);
    };

    load();
  }, [user]);

  return (
    <AppScroll>
      <PageHeader
        title="Conversas"
        description="Acompanhe os contatos com prestadores quando uma proposta for aceita."
      />

      {loading ?(
        <Card>
          <ActivityIndicator color={colors.gold} />
        </Card>
      ) : null}

      {!loading && chats.length === 0 ?(
        <EmptyState
          title="Nenhuma conversa ativa"
          description="As mensagens aparecem aqui quando você aceitar uma proposta de um prestador."
        />
      ) : null}

      {chats.map((chat) => (
        <Card key={chat.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 14 }}>
            <View style={{ flex: 1, gap: 6 }}>
              <SectionTitle>{chat.request?.title || "Conversa"}</SectionTitle>
              <Body>Canal aberto para combinar detalhes do atendimento.</Body>
            </View>
            <Pill>Ativa</Pill>
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
            {chat.id}
          </Text>
        </Card>
      ))}
    </AppScroll>
  );
}
