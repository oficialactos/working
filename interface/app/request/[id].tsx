import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { Body, Button, Card, Input, Label, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { colors, radius } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

const actosLogo = require("../../assets/actos-logo-cropped.png");
const ACTOS_WEBSITE_URL = "https://www.oficialactos.com.br/";

type ServiceRequestDetails = {
  id: string;
  title: string;
  category: string;
  description: string;
  status: string;
  address_text?: string | null;
  city?: string | null;
  state?: string | null;
  created_at?: string | null;
  media_urls?: string[] | null;
  client_id: string;
};

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loading: authLoading, session, role, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ServiceRequestDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Prestador action panel states
  const [existingProposal, setExistingProposal] = useState<any>(null);
  const [existingChat, setExistingChat] = useState<any>(null);
  const [checkingProposal, setCheckingProposal] = useState(true);
  const [activeTab, setActiveTab] = useState<"visit" | "quote">("visit");
  const [visitMessage, setVisitMessage] = useState(
    "Olá! Para te passar um orçamento preciso e detalhado, gostaria de agendar uma visita técnica sem compromisso para avaliar o local. Quais dias e horários ficariam melhores para você?"
  );
  const [price, setPrice] = useState("");
  const [proposalDescription, setProposalDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handlePriceChange = (value: string) => {
    setPrice(formatCurrencyInput(value));
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;

      setError(null);
      setLoading(true);
      const { data, error: queryError } = await supabase
        .from("service_requests")
        .select("id,title,category,description,status,address_text,city,state,created_at,media_urls,client_id")
        .eq("id", id)
        .single();

      if (queryError) {
        setError(queryError.message);
        setRequest(null);
      } else {
        setRequest(data as ServiceRequestDetails);
      }

      setLoading(false);
    };

    load();
  }, [id]);

  useEffect(() => {
    const checkProposalAndChat = async () => {
      if (!id || !user) {
        setCheckingProposal(false);
        return;
      }

      setCheckingProposal(true);
      try {
        const { data: proposalData, error: proposalError } = await supabase
          .from("proposals")
          .select("id,price,description,status")
          .eq("request_id", id)
          .eq("provider_id", user.id)
          .maybeSingle();

        if (!proposalError && proposalData) {
          setExistingProposal(proposalData);
        } else {
          setExistingProposal(null);
        }

        const { data: chatData, error: chatError } = await supabase
          .from("chats")
          .select("id,is_active")
          .eq("request_id", id)
          .eq("provider_id", user.id)
          .maybeSingle();

        if (!chatError && chatData) {
          setExistingChat(chatData);
        } else {
          setExistingChat(null);
        }
      } catch (err) {
        console.error("Erro ao checar proposta e chat:", err);
      } finally {
        setCheckingProposal(false);
      }
    };

    checkProposalAndChat();
  }, [id, user]);

  const handleSendVisitRequest = async () => {
    if (!request || !user) return;
    if (!visitMessage.trim()) {
      setError("Por favor, digite uma mensagem para a visita.");
      return;
    }

    setSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Check or Upsert chat
      const { data: existingChatData, error: chatCheckError } = await supabase
        .from("chats")
        .select("id")
        .eq("request_id", request.id)
        .eq("provider_id", user.id)
        .maybeSingle();

      if (chatCheckError) throw new Error(chatCheckError.message);

      let chatId = existingChatData?.id;

      if (!chatId) {
        const { data: newChat, error: chatCreateError } = await supabase
          .from("chats")
          .insert({
            request_id: request.id,
            client_id: request.client_id,
            provider_id: user.id,
            is_active: true // Force to true to bypass messages RLS policy
          })
          .select("id")
          .single();

        if (chatCreateError) throw new Error(chatCreateError.message);
        chatId = newChat.id;
      }

      // 2. Insert message into messages table
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: visitMessage.trim()
        });

      if (msgError) throw new Error(msgError.message);

      setSuccessMessage("Solicitação de visita enviada com sucesso no chat do cliente!");
      setExistingChat({ id: chatId, is_active: true });
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao enviar a solicitação.");
    } finally {
      setSending(false);
    }
  };

  const handleSendProposal = async () => {
    if (!request || !user) return;
    const parsedPrice = parseCurrencyValue(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setError("Por favor, digite um valor de orçamento válido.");
      return;
    }

    setSending(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Insert proposal
      const { data: newProposal, error: propError } = await supabase
        .from("proposals")
        .insert({
          request_id: request.id,
          provider_id: user.id,
          price: parsedPrice,
          description: proposalDescription.trim() || null,
          status: "pending"
        })
        .select("id")
        .single();

      if (propError) throw new Error(propError.message);

      // 2. Check or Upsert chat
      const { data: existingChatData, error: chatCheckError } = await supabase
        .from("chats")
        .select("id")
        .eq("request_id", request.id)
        .eq("provider_id", user.id)
        .maybeSingle();

      if (chatCheckError) throw new Error(chatCheckError.message);

      let chatId = existingChatData?.id;

      if (!chatId) {
        const { data: newChat, error: chatCreateError } = await supabase
          .from("chats")
          .insert({
            request_id: request.id,
            client_id: request.client_id,
            provider_id: user.id,
            is_active: true
          })
          .select("id")
          .single();

        if (chatCreateError) throw new Error(chatCreateError.message);
        chatId = newChat.id;
      }

      // 3. Send formatted budget message to the chat
      const formattedMessage = `[ORÇAMENTO ENVIADO]\nValor: R$ ${formatCurrencyValue(parsedPrice)}\nDescrição: ${proposalDescription.trim() || "Sem descrição adicional."}`;
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: formattedMessage
        });

      if (msgError) throw new Error(msgError.message);

      setSuccessMessage("Orçamento direto enviado com sucesso no chat do cliente!");
      setExistingProposal({
        id: newProposal.id,
        price: parsedPrice,
        description: proposalDescription.trim() || null,
        status: "pending"
      });
      setExistingChat({ id: chatId, is_active: true });
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao enviar o orçamento.");
    } finally {
      setSending(false);
    }
  };

  if (!authLoading && !session) {
    return <Redirect href="/" />;
  }

  const imageUrls = request?.media_urls?.filter(isImageUrl) || [];
  const otherMedia = request?.media_urls?.filter((url) => !isImageUrl(url)) || [];
  let location = "";
  if (request) {
    const addressText = request.address_text;
    const city = request.city;
    const state = request.state;

    if (addressText) {
      if (addressText.includes(" - ")) {
        const parts = addressText.split(" - ").map((p) => p.trim());
        if (parts.length >= 3) {
          const neighborhood = parts[1]; // Index 1 is the neighborhood/district
          const parsedCity = parts[2] || city;
          const parsedState = parts[3] || state;
          location = [neighborhood, [parsedCity, parsedState].filter(Boolean).join(" / ")].filter(Boolean).join(" - ");
        } else {
          location = [city, state].filter(Boolean).join(" / ") || "Não informada.";
        }
      } else if (addressText.includes(",")) {
        const parts = addressText.split(",").map((p) => p.trim());
        const neighborhood = parts[0];
        const isStreet = /^(rua|av\.|avenida|alameda|travessa|pça|praça|r\.)/i.test(neighborhood) || /\d+/.test(neighborhood);
        if (!isStreet) {
          location = [neighborhood, [city, state].filter(Boolean).join(" / ")].filter(Boolean).join(" - ");
        } else {
          location = [city, state].filter(Boolean).join(" / ") || "Não informada.";
        }
      } else {
        const isStreet = /^(rua|av\.|avenida|alameda|travessa|pça|praça|r\.)/i.test(addressText) || /\d+/.test(addressText);
        if (!isStreet && addressText.length < 40) {
          location = [addressText, [city, state].filter(Boolean).join(" / ")].filter(Boolean).join(" - ");
        } else {
          location = [city, state].filter(Boolean).join(" / ") || "Não informada.";
        }
      }
    } else {
      location = [city, state].filter(Boolean).join(" / ") || "Não informada.";
    }
  }

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          width: "100%",
          maxWidth: 920,
          alignSelf: "center",
          gap: 16,
          paddingHorizontal: 18,
          paddingTop: 18,
          paddingBottom: 40
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: pressed ? 0.72 : 1,
            paddingVertical: 6
          })}
        >
          <Ionicons name="arrow-back" size={20} color={colors.gold} />
          <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "900" }}>Voltar</Text>
        </Pressable>

        {loading ? (
          <View style={{ minHeight: 260, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : null}

        {error ? (
          <Card>
            <Text selectable style={{ color: colors.danger, fontSize: 14, lineHeight: 20, fontWeight: "800" }}>
              {error}
            </Text>
          </Card>
        ) : null}

        {request ? (
          <>
            {imageUrls[0] ? (
              <Pressable onPress={() => openViewer(0)} style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}>
                <Image
                  source={{ uri: imageUrls[0] }}
                  contentFit="cover"
                  style={{
                    width: "100%",
                    aspectRatio: 1.38,
                    borderRadius: radius.lg,
                    backgroundColor: colors.cardElevated
                  }}
                />
              </Pressable>
            ) : (
              <View
                style={{
                  width: "100%",
                  aspectRatio: 1.38,
                  borderRadius: radius.lg,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.cardElevated
                }}
              >
                <Text selectable style={{ color: colors.gold, fontSize: 18, fontWeight: "900" }}>
                  {request.category}
                </Text>
              </View>
            )}

            <View style={{ gap: 8 }}>
              <Text selectable style={{ color: colors.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>
                {request.title}
              </Text>
              <Body>
                {request.category}
                {request.created_at ? ` · ${formatDate(request.created_at)}` : ""}
              </Body>
            </View>

            <Card>
              <InfoBlock label="Localização" value={location || "Não informada."} />
              <InfoBlock label="Descrição" value={request.description || "Sem descrição."} />
            </Card>

            <Card>
              <SectionTitle>Mídias anexadas</SectionTitle>
              {imageUrls.length || otherMedia.length ? (
                <View style={{ gap: 12 }}>
                  {imageUrls.map((url, index) => (
                    <Pressable
                      key={`${url}-${index}`}
                      onPress={() => openViewer(index)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                    >
                      <Image
                        source={{ uri: url }}
                        contentFit="cover"
                        style={{
                          width: "100%",
                          aspectRatio: 1.45,
                          borderRadius: radius.md,
                          backgroundColor: colors.cardElevated
                        }}
                      />
                    </Pressable>
                  ))}
                  {otherMedia.map((url, index) => (
                    <Text key={`${url}-${index}`} selectable style={{ color: colors.gold, fontSize: 13, lineHeight: 18, fontWeight: "800" }}>
                      Mídia {index + 1}: {url}
                    </Text>
                  ))}
                </View>
              ) : (
                <Body>Nenhuma mídia anexada.</Body>
              )}
            </Card>

            {role === "provider" && request.status === "open" ? (
              <Card tone="gold">
                <View style={{ gap: 14 }}>
                  <SectionTitle>Negociar Serviço</SectionTitle>
                  
                  {checkingProposal ? (
                    <ActivityIndicator color={colors.gold} style={{ marginVertical: 10 }} />
                  ) : successMessage ? (
                    <View style={{ gap: 12 }}>
                      <Text selectable style={{ color: colors.success, fontSize: 15, fontWeight: "800", lineHeight: 22 }}>
                        {successMessage}
                      </Text>
                      <View style={{ flexDirection: "row", gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Button onPress={() => router.push("/chat")}>Ir para Conversas</Button>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Button tone="secondary" onPress={() => router.push("/requests")}>Pedidos</Button>
                        </View>
                      </View>
                    </View>
                  ) : existingProposal ? (
                    <View style={{ gap: 12 }}>
                      <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "800", lineHeight: 22 }}>
                        Você já enviou uma proposta para este pedido. Acompanhe os detalhes abaixo:
                      </Text>
                      <View style={{ backgroundColor: "rgba(255,255,255,0.03)", padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, gap: 8 }}>
                        <Text selectable style={{ color: colors.gold, fontSize: 12, fontWeight: "900", textTransform: "uppercase" }}>
                          Valor da Proposta
                        </Text>
                        <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>
                          R$ {formatCurrencyValue(Number(existingProposal.price))}
                        </Text>
                        {existingProposal.description ? (
                          <>
                            <Text selectable style={{ color: colors.gold, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginTop: 6 }}>
                              Descrição
                            </Text>
                            <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "800", lineHeight: 20 }}>
                              {existingProposal.description}
                            </Text>
                          </>
                        ) : null}
                        <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800", marginTop: 4 }}>
                          Status: {existingProposal.status === "pending" ? "Pendente de aprovação" : existingProposal.status === "accepted" ? "Aceito" : "Rejeitado"}
                        </Text>
                      </View>
                      <Button onPress={() => router.push("/chat")}>Acessar Chat com Cliente</Button>
                    </View>
                  ) : existingChat ? (
                    <View style={{ gap: 12 }}>
                      <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "800", lineHeight: 22 }}>
                        Você já iniciou contato com o cliente para este pedido.
                      </Text>
                      <Button onPress={() => router.push("/chat")}>Acessar Chat com Cliente</Button>
                    </View>
                  ) : (
                    <View style={{ gap: 16 }}>
                      {/* Segmented Control Tabs */}
                      <View
                        style={{
                          flexDirection: "row",
                          backgroundColor: colors.input,
                          borderRadius: radius.md,
                          padding: 4,
                          borderWidth: 1,
                          borderColor: colors.border
                        }}
                      >
                        <Pressable
                          onPress={() => setActiveTab("visit")}
                          style={{
                            flex: 1,
                            backgroundColor: activeTab === "visit" ? colors.gold : "transparent",
                            paddingVertical: 10,
                            borderRadius: radius.sm,
                            alignItems: "center"
                          }}
                        >
                          <Text
                            style={{
                              color: activeTab === "visit" ? colors.background : colors.text,
                              fontWeight: "900",
                              fontSize: 14
                            }}
                          >
                            Solicitar visita
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setActiveTab("quote")}
                          style={{
                            flex: 1,
                            backgroundColor: activeTab === "quote" ? colors.gold : "transparent",
                            paddingVertical: 10,
                            borderRadius: radius.sm,
                            alignItems: "center"
                          }}
                        >
                          <Text
                            style={{
                              color: activeTab === "quote" ? colors.background : colors.text,
                              fontWeight: "900",
                              fontSize: 14
                            }}
                          >
                            Enviar orçamento
                          </Text>
                        </Pressable>
                      </View>

                      {/* Tab Contents */}
                      {activeTab === "visit" ? (
                        <View style={{ gap: 14 }}>
                          <Input
                            label="Mensagem de solicitação de visita"
                            value={visitMessage}
                            onChangeText={setVisitMessage}
                            multiline
                            autoGrow
                            numberOfLines={4}
                            style={{
                              fontSize: 14,
                              fontWeight: "600",
                              lineHeight: 21,
                              minHeight: 100,
                              paddingTop: 12,
                              paddingBottom: 12,
                              textAlignVertical: "top"
                            }}
                          />
                          <Button loading={sending} disabled={sending} onPress={handleSendVisitRequest}>
                            Enviar solicitação
                          </Button>
                        </View>
                      ) : (
                        <View style={{ gap: 14 }}>
                          <Input
                            label="Valor do Orçamento (R$)"
                            value={price}
                            onChangeText={handlePriceChange}
                            placeholder="0,00"
                            keyboardType="numeric"
                          />
                          <Input
                            label="Descrição / Detalhes do orçamento"
                            value={proposalDescription}
                            onChangeText={setProposalDescription}
                            placeholder="Ex: Inclui mão de obra completa e materiais básicos de acabamento..."
                            multiline
                            autoGrow
                            numberOfLines={4}
                            style={{
                              minHeight: 100,
                              paddingTop: 12,
                              paddingBottom: 12,
                              textAlignVertical: "top"
                            }}
                          />
                          <Button loading={sending} disabled={sending} onPress={handleSendProposal}>
                            Enviar orçamento
                          </Button>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </Card>
            ) : null}

            <View style={{ alignItems: "center", gap: 6, opacity: 0.42, paddingTop: 8 }}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Abrir site da Actos"
                onPress={() => Linking.openURL(ACTOS_WEBSITE_URL)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              >
                <Image source={actosLogo} contentFit="contain" style={{ width: 62, height: 15 }} />
              </Pressable>
              <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "600", textAlign: "center" }}>
                © 2026 Actos. Todos os direitos reservados.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <ImageViewerModal
        visible={viewerVisible}
        images={imageUrls}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      />
    </Screen>
  );
}

function ImageViewerModal({
  visible,
  images,
  initialIndex,
  onClose
}: {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const listRef = React.useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.96)" }}>
        {/* Header/Close button */}
        <View
          style={{
            position: "absolute",
            top: Platform.OS === "ios" ? 54 : 40,
            left: 20,
            right: 20,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10
          }}
        >
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
            {currentIndex + 1} / {images.length}
          </Text>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => ({
              backgroundColor: "rgba(255,255,255,0.12)",
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.75 : 1
            })}
          >
            <Ionicons name="close" size={24} color={colors.gold} />
          </Pressable>
        </View>

        {/* FlatList of images */}
        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: width,
            offset: width * index,
            index
          })}
          onScrollToIndexFailed={(info) => {
            setTimeout(() => {
              listRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 100);
          }}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            if (index >= 0 && index < images.length) {
              setCurrentIndex(index);
            }
          }}
          keyExtractor={(item, index) => `${item}-${index}`}
          renderItem={({ item }) => (
            <View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
              <Image
                source={{ uri: item }}
                contentFit="contain"
                style={{
                  width: width,
                  height: height * 0.85,
                  backgroundColor: "transparent"
                }}
              />
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 6 }}>
      <Text selectable style={{ color: colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" }}>
        {label}
      </Text>
      <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp|heic|heif)(\?|$)/i.test(url) || (url.includes("/storage/v1/object/") && !/\.(mp4|mov|webm)(\?|$)/i.test(url));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(value));
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const amount = Number(digits) / 100;
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function parseCurrencyValue(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  return Number(normalized);
}

function formatCurrencyValue(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    open: "Aberto",
    in_progress: "Em andamento",
    completed: "Concluído",
    cancelled: "Cancelado"
  };

  return labels[status] || status;
}
