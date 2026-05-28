import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { AppScroll, Body, Button, Card, PageHeader, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

type RequestField = "category" | "title" | "description" | "address";
type ServiceCategory = {
  name: string;
  examples: string[];
};

type RequestQuestion = {
  field: RequestField;
  title: string;
  helper: string;
  required: boolean;
  placeholder?: string;
};

const categories: ServiceCategory[] = [
  { name: "Elétrica", examples: ["Chuveiro", "Tomadas", "Disjuntores"] },
  { name: "Hidráulica", examples: ["Vazamentos", "Torneiras", "Caixa d'água"] },
  { name: "Limpeza", examples: ["Faxina", "Pós-obra", "Estofados"] },
  { name: "Pintura", examples: ["Parede", "Retoques", "Textura"] },
  { name: "Jardinagem", examples: ["Poda", "Gramado", "Paisagismo"] },
  { name: "Montagem", examples: ["Móveis", "Prateleiras", "Suportes"] },
  { name: "Informática", examples: ["Wi-Fi", "Computador", "Impressora"] },
  { name: "Outro", examples: ["Reparos", "Instalação", "Manutenção"] }
];

const questions: RequestQuestion[] = [
  {
    field: "category",
    title: "Que tipo de serviço você precisa?",
    helper: "Escolha uma categoria para encontrarmos prestadores mais adequados.",
    required: true
  },
  {
    field: "title",
    title: "Dê um nome rápido para o pedido",
    helper: "Use uma frase curta. Ex.: Trocar chuveiro queimado.",
    required: true,
    placeholder: "Ex.: Trocar chuveiro"
  },
  {
    field: "description",
    title: "O que precisa ser feito?",
    helper: "Descreva o problema com detalhes suficientes para o prestador entender.",
    required: true,
    placeholder: "Conte o que aconteceu, urgência e detalhes importantes"
  },
  {
    field: "address",
    title: "Quer informar um endere?o ou refer?ncia?",
    helper: "Opcional. Pode ser bairro, rua ou um ponto de refer?ncia.",
    required: false,
    placeholder: "Ex.: Vila Mariana, proximo ao metro"
  }
];

export default function NewRequestScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const currentQuestion = questions[step];
  const isFinalStep = step === questions.length - 1;
  const progress = ((step + 1) / questions.length) * 100;
  const values: Record<RequestField, string> = useMemo(
    () => ({ category, title, description, address }),
    [address, category, description, title]
  );
  const setters: Record<RequestField, (value: string) => void> = {
    category: setCategory,
    title: setTitle,
    description: setDescription,
    address: setAddress
  };

  const validateStep = () => {
    const value = values[currentQuestion.field]?.trim() ?? "";

    if (currentQuestion.required && !value) {
      setMessage("Responda esta pergunta para continuar.");
      return false;
    }

    setMessage(null);
    return true;
  };

  const submitRequest = async () => {
    if (!user) return;

    setSubmitting(true);
    setMessage(null);

    const { error } = await supabase.from("service_requests").insert({
      client_id: user.id,
      category: category.trim(),
      title: title.trim(),
      description: description.trim(),
      city: user.user_metadata?.city || null,
      state: user.user_metadata?.state || null,
      address_text: address.trim() || null,
      search_radius_km: 20,
      status: "open"
    });

    setSubmitting(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/client");
  };

  const goNext = async () => {
    if (!validateStep()) return;

    if (isFinalStep) {
      await submitRequest();
      return;
    }

    setStep((current) => Math.min(current + 1, questions.length - 1));
  };

  const skip = async () => {
    if (currentQuestion.required) return;

    setMessage(null);
    if (isFinalStep) {
      await submitRequest();
      return;
    }
    setStep((current) => Math.min(current + 1, questions.length - 1));
  };

  return (
    <AppScroll>
      <PageHeader
        eyebrow="Novo pedido"
        title="Solicitar serviço"
        description="Responda uma pergunta por vez. A localização será usada pelo dispositivo quando estiver disponível."
        action={<Button tone="secondary" onPress={() => router.back()}>Cancelar</Button>}
      />

      <Card tone="gold">
        <View style={{ gap: 10 }}>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: colors.goldSoft, overflow: "hidden" }}>
            <View style={{ width: `${progress}%`, height: "100%", backgroundColor: colors.gold }} />
          </View>
          <Text style={{ color: colors.muted, fontSize: 12, fontWeight: "900" }}>
            Pergunta {step + 1} de {questions.length}
          </Text>
        </View>

        {message ?(
          <View
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "rgba(249,112,102,0.25)",
              backgroundColor: "rgba(249,112,102,0.10)",
              padding: 14
            }}
          >
            <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "800", lineHeight: 20 }}>
              {message}
            </Text>
          </View>
        ) : null}

        <View style={{ gap: 8 }}>
          <SectionTitle>{currentQuestion.title}</SectionTitle>
          <Body>{currentQuestion.helper}</Body>
        </View>

        {currentQuestion.field === "category" ?(
          <View style={{ gap: 10 }}>
            {Array.from({ length: Math.ceil(categories.length / 2) }).map((_, rowIndex) => {
              const rowItems = categories.slice(rowIndex * 2, rowIndex * 2 + 2);

              return (
                <View key={rowItems.map((item) => item.name).join("-")} style={{ flexDirection: "row", gap: 10 }}>
                  {rowItems.map((item) => (
                    <CategoryOption
                      key={item.name}
                      item={item}
                      selected={category === item.name}
                      onPress={() => {
                        setCategory(item.name);
                        setMessage(null);
                      }}
                    />
                  ))}
                  {rowItems.length === 1 ?<View style={{ flex: 1 }} /> : null}
                </View>
              );
            })}
          </View>
        ) : (
          <TextInput
            multiline={currentQuestion.field === "description"}
            onChangeText={setters[currentQuestion.field]}
            placeholder={currentQuestion.placeholder}
            placeholderTextColor={colors.mutedDark}
            value={values[currentQuestion.field]}
            style={{
              minHeight: currentQuestion.field === "description" ?120 : 56,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.input,
              color: colors.text,
              fontSize: 16,
              fontWeight: "800",
              paddingHorizontal: 16,
              paddingTop: currentQuestion.field === "description" ?16 : undefined,
              textAlignVertical: currentQuestion.field === "description" ?"top" : "center"
            }}
          />
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {step > 0 ?(
            <View style={{ flex: 0.7 }}>
              <Button tone="secondary" onPress={() => setStep((current) => Math.max(current - 1, 0))}>Voltar</Button>
            </View>
          ) : null}
          {!currentQuestion.required ?<Button tone="secondary" onPress={skip}>Pular</Button> : null}
          <View style={{ flex: 1.6 }}>
            <Button loading={submitting} disabled={submitting} onPress={goNext}>
              {isFinalStep ?"Solicitar serviço" : "Pr?xima"}
            </Button>
          </View>
        </View>
      </Card>
    </AppScroll>
  );
}

function CategoryOption({
  item,
  onPress,
  selected
}: {
  item: ServiceCategory;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 112,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: selected ?colors.gold : colors.border,
        backgroundColor: selected ?colors.goldSoft : colors.card,
        opacity: pressed ?0.82 : 1,
        padding: 14
      })}
    >
      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.gold, fontSize: 15, fontWeight: "900" }}>
          {item.name}
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 11, lineHeight: 17, fontWeight: "800" }}>
          {item.examples.join(", ")}...
        </Text>
      </View>
    </Pressable>
  );
}
