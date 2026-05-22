import { Link, router } from "expo-router";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  type DimensionValue,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";

import { Screen } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { colors } from "@/lib/theme";

const categories = [
  { label: "Elétrica", items: 120, icon: "⚡", color: "#EAB308" },
  { label: "Hidráulica", items: 85, icon: "◇", color: "#3B82F6" },
  { label: "Pintura", items: 156, icon: "◒", color: "#EC4899" },
  { label: "Limpeza", items: 340, icon: "✦", color: "#10B981" },
  { label: "Jardinagem", items: 42, icon: "⌁", color: "#22C55E" },
  { label: "Mecânica", items: 67, icon: "⌘", color: "#94A3B8" },
  { label: "Montagem", items: 210, icon: "▣", color: "#F97316" },
  { label: "Informática", items: 98, icon: "▱", color: "#8B5CF6" }
];

const values = [
  {
    icon: "24h",
    title: "Suporte 24h",
    desc: "Nossa equipe está sempre disponível para ajudar você em qualquer etapa do atendimento."
  },
  {
    icon: "VIP",
    title: "Profissionais VIP",
    desc: "Realizamos a verificação rigorosa de antecedentes de todos os prestadores parceiros."
  }
];

const trustItems = ["Elétrica", "Construção", "Hidráulica", "Pintura", "Limpeza"];

export default function Index() {
  const { loading, session, role } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const isTablet = width >= 720;
  const categoryCols = width >= 1200 ? 8 : width >= 980 ? 6 : width >= 720 ? 4 : 2;

  useEffect(() => {
    if (!loading && session) {
      router.replace(role === "provider" ? "/requests" : "/client");
    }
  }, [loading, role, session]);

  if (loading || session) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.gold} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 56 }}>
        <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center", paddingHorizontal: 24 }}>
          <NavBar isWide={isTablet} />

          <View
            style={{
              minHeight: isWide ? 760 : undefined,
              paddingTop: isWide ? 112 : 58,
              paddingBottom: 70,
              flexDirection: isWide ? "row" : "column",
              alignItems: "center",
              gap: isWide ? 64 : 36
            }}
          >
            <View style={{ flex: 1, width: "100%", gap: 28 }}>
              <Badge>A maior plataforma de serviços do Brasil</Badge>

              <View style={{ gap: 4 }}>
                <HeroLine>A solução que</HeroLine>
                <HeroLine>você precisa,</HeroLine>
                <Text
                  selectable
                  style={{
                    color: "#D7B46A",
                    fontSize: isWide ? 82 : 48,
                    lineHeight: isWide ? 82 : 50,
                    fontWeight: "900",
                    letterSpacing: 0
                  }}
                >
                  no seu tempo.
                </Text>
              </View>

              <Text
                selectable
                style={{
                  color: "rgba(247,242,232,0.48)",
                  fontSize: isWide ? 18 : 16,
                  lineHeight: isWide ? 30 : 25,
                  fontWeight: "700",
                  maxWidth: 590
                }}
              >
                Conectamos você aos melhores profissionais locais para resolver qualquer problema em minutos.
                Seguro, rápido e transparente.
              </Text>

              <View style={{ flexDirection: isTablet ? "row" : "column", gap: 14, maxWidth: 620 }}>
                <View
                  style={{
                    flex: 1,
                    minHeight: 56,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.08)",
                    backgroundColor: "rgba(255,255,255,0.035)",
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 18,
                    gap: 12
                  }}
                >
                  <Text style={{ color: "rgba(247,242,232,0.35)", fontSize: 18 }}>⌕</Text>
                  <TextInput
                    placeholder="Qual serviço você precisa?"
                    placeholderTextColor="rgba(247,242,232,0.28)"
                    onSubmitEditing={() => router.push("/auth")}
                    style={{
                      flex: 1,
                      color: colors.text,
                      fontSize: 15,
                      fontWeight: "800"
                    }}
                  />
                </View>

                <Pressable
                  onPress={() => router.push("/auth")}
                  style={({ pressed }) => ({
                    minHeight: 56,
                    borderRadius: 18,
                    backgroundColor: colors.gold,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 30,
                    opacity: pressed ? 0.82 : 1
                  })}
                >
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>Pedir agora →</Text>
                </Pressable>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <View style={{ flexDirection: "row" }}>
                  {["A", "B", "C", "D"].map((item, index) => (
                    <View
                      key={item}
                      style={{
                        width: 36,
                        height: 36,
                        marginLeft: index === 0 ? 0 : -10,
                        borderRadius: 18,
                        borderWidth: 2,
                        borderColor: colors.background,
                        backgroundColor: index % 2 === 0 ? "rgba(184,146,74,0.22)" : "rgba(255,255,255,0.10)",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: "900" }}>{item}</Text>
                    </View>
                  ))}
                </View>
                <Text selectable style={{ color: "rgba(247,242,232,0.38)", fontSize: 14, fontWeight: "800" }}>
                  <Text style={{ color: colors.gold, fontWeight: "900" }}>4.9/5</Text> · +10k clientes satisfeitos
                </Text>
              </View>
            </View>

            <HeroImage />
          </View>
        </View>

        <TrustStrip />

        <SectionShell>
          <View style={{ flexDirection: isTablet ? "row" : "column", justifyContent: "space-between", gap: 28, marginBottom: 42 }}>
            <View style={{ gap: 18 }}>
              <Badge>Categorias</Badge>
              <View>
                <SectionTitle>Explore as</SectionTitle>
                <SectionTitle muted>categorias.</SectionTitle>
              </View>
            </View>
            <Pressable onPress={() => router.push("/auth")} style={{ alignSelf: isTablet ? "flex-end" : "flex-start" }}>
              <Text style={{ color: "rgba(247,242,232,0.42)", fontSize: 13, fontWeight: "900" }}>Explorar tudo ↗</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {categories.map((category) => (
              <CategoryCard key={category.label} category={category} columns={categoryCols} />
            ))}
          </View>
        </SectionShell>

        <SectionShell compact>
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.07)",
              backgroundColor: "rgba(255,255,255,0.025)",
              padding: isTablet ? 54 : 26,
              gap: 32
            }}
          >
            <View style={{ flexDirection: isTablet ? "row" : "column", gap: 28 }}>
              {values.map((value) => (
                <ValueCard key={value.title} value={value} />
              ))}
            </View>
          </View>
        </SectionShell>

        <SectionShell>
          <View
            style={{
              borderRadius: 28,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.07)",
              backgroundColor: "rgba(255,255,255,0.025)",
              padding: isTablet ? 54 : 26,
              flexDirection: isWide ? "row" : "column",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 44
            }}
          >
            <View style={{ flex: 1, gap: 24 }}>
              <Badge>Em breve</Badge>
              <View>
                <SectionTitle>A experiência completa</SectionTitle>
                <SectionTitle muted>no seu bolso.</SectionTitle>
              </View>
              <Text selectable style={{ color: "rgba(247,242,232,0.42)", fontSize: 16, lineHeight: 25, fontWeight: "700", maxWidth: 470 }}>
                Acompanhe serviços em tempo real, agende horários e converse com profissionais pelo app.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <SmallStoreButton label="▯ App Store" primary />
                <SmallStoreButton label="Google Play" />
              </View>
            </View>

            <PhoneMock />
          </View>
        </SectionShell>

        <Footer />
      </ScrollView>
    </Screen>
  );
}

function NavBar({ isWide }: { isWide: boolean }) {
  return (
    <View
      style={{
        minHeight: 76,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16
      }}
    >
      <Text selectable style={{ color: colors.text, fontSize: 21, fontWeight: "900", letterSpacing: 0 }}>
        <Text style={{ color: colors.gold }}>W</Text>ORKING
      </Text>

      <View style={{ flexDirection: "row", alignItems: "center", gap: isWide ? 28 : 14 }}>
        {isWide ? (
          <>
            {["Para você", "Para trabalhar", "Empresas"].map((item) => (
              <Text key={item} selectable style={{ color: "rgba(247,242,232,0.42)", fontSize: 13, fontWeight: "800" }}>
                {item}
              </Text>
            ))}
          </>
        ) : null}
        <Link href="/auth" asChild>
          <Pressable>
            <Text style={{ color: "rgba(247,242,232,0.48)", fontSize: 13, fontWeight: "900" }}>Entrar</Text>
          </Pressable>
        </Link>
        <Link href={{ pathname: "/auth", params: { mode: "register" } }} asChild>
          <Pressable style={{ backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 }}>
            <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>Cadastrar</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(184,146,74,0.24)",
        backgroundColor: "rgba(184,146,74,0.10)",
        paddingHorizontal: 14,
        paddingVertical: 8
      }}
    >
      <Text selectable style={{ color: colors.gold, fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0 }}>
        {children}
      </Text>
    </View>
  );
}

function HeroLine({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;

  return (
    <Text
      selectable
      style={{
        color: colors.text,
        fontSize: isWide ? 82 : 48,
        lineHeight: isWide ? 82 : 50,
        fontWeight: "900",
        letterSpacing: 0
      }}
    >
      {children}
    </Text>
  );
}

function HeroImage() {
  return (
    <View style={{ flex: 0.78, width: "100%", maxWidth: 520 }}>
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1400" }}
        imageStyle={{ borderRadius: 32 }}
        style={{
          aspectRatio: 0.8,
          overflow: "hidden",
          borderRadius: 32,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.08)",
          justifyContent: "flex-end",
          backgroundColor: colors.card
        }}
      >
        <View style={{ ...StyleSheetAbsoluteFill, backgroundColor: "rgba(0,0,0,0.55)" }} />
        <View style={{ padding: 22 }}>
          <View
            style={{
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(7,9,14,0.78)",
              padding: 18,
              gap: 12
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
              <View style={{ gap: 4 }}>
                <Text selectable style={{ color: "rgba(247,242,232,0.38)", fontSize: 9, fontWeight: "900", textTransform: "uppercase" }}>
                  Destaque do mês
                </Text>
                <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>João Paulo</Text>
                <Text selectable style={{ color: "rgba(247,242,232,0.44)", fontSize: 12, fontWeight: "800" }}>Eletricista Certificado</Text>
              </View>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: "rgba(184,146,74,0.28)",
                  backgroundColor: "rgba(184,146,74,0.16)",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.gold, fontSize: 14, fontWeight: "900" }}>JP</Text>
              </View>
            </View>
            <View style={{ borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", paddingTop: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ color: colors.gold, fontSize: 12 }}>★★★★★</Text>
              <Text selectable style={{ color: "rgba(247,242,232,0.44)", fontSize: 11, fontWeight: "800" }}>4.9 · 120 serviços</Text>
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0
};

function TrustStrip() {
  return (
    <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.045)", paddingVertical: 32 }}>
      <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center", paddingHorizontal: 24, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 22 }}>
        {trustItems.map((item) => (
          <Text key={item} selectable style={{ color: "rgba(247,242,232,0.14)", fontSize: 22, fontWeight: "900" }}>
            {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

function SectionShell({ children, compact }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center", paddingHorizontal: 24, paddingTop: compact ? 28 : 78 }}>
      {children}
    </View>
  );
}

function SectionTitle({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  const { width } = useWindowDimensions();

  return (
    <Text
      selectable
      style={{
        color: muted ? "rgba(247,242,232,0.18)" : colors.text,
        fontSize: width >= 900 ? 58 : 40,
        lineHeight: width >= 900 ? 62 : 44,
        fontWeight: "900",
        letterSpacing: 0
      }}
    >
      {children}
    </Text>
  );
}

function CategoryCard({
  category,
  columns
}: {
  category: (typeof categories)[number];
  columns: number;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const containerWidth = Math.min(screenWidth, 1400) - 48;
  const cardWidth = (containerWidth - 12 * (columns - 1)) / columns;

  return (
    <Pressable
      onPress={() => router.push("/auth")}
      style={({ pressed }) => ({
        width: cardWidth,
        opacity: pressed ? 0.82 : 1
      })}
    >
      <View
        style={{
          aspectRatio: 1,
          margin: 0,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.06)",
          backgroundColor: "rgba(255,255,255,0.025)",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: 14
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.07)",
            backgroundColor: "rgba(255,255,255,0.035)",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ color: category.color, fontSize: 20, fontWeight: "900" }}>{category.icon}</Text>
        </View>
        <View style={{ alignItems: "center", gap: 4 }}>
          <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "900", textAlign: "center" }}>
            {category.label}
          </Text>
          <Text selectable style={{ color: "rgba(247,242,232,0.28)", fontSize: 8, fontWeight: "900", textTransform: "uppercase", textAlign: "center" }}>
            {category.items} profissionais
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function ValueCard({ value }: { value: (typeof values)[number] }) {
  return (
    <View style={{ flex: 1, gap: 16 }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: "rgba(184,146,74,0.24)",
          backgroundColor: "rgba(184,146,74,0.10)",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "900" }}>{value.icon}</Text>
      </View>
      <Text selectable style={{ color: colors.text, fontSize: 24, fontWeight: "900" }}>{value.title}</Text>
      <Text selectable style={{ color: "rgba(247,242,232,0.42)", fontSize: 14, lineHeight: 22, fontWeight: "700" }}>
        {value.desc}
      </Text>
    </View>
  );
}

function SmallStoreButton({ label, primary }: { label: string; primary?: boolean }) {
  return (
    <Pressable
      style={{
        minHeight: 52,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: primary ? colors.gold : "rgba(255,255,255,0.09)",
        backgroundColor: primary ? colors.gold : "transparent",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 22
      }}
    >
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function PhoneMock() {
  return (
    <View
      style={{
        width: 260,
        height: 480,
        borderRadius: 42,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.11)",
        backgroundColor: "rgba(255,255,255,0.035)",
        padding: 18,
        gap: 14
      }}
    >
      <View style={{ alignSelf: "center", width: 82, height: 20, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 16 }} />
      <View style={{ width: "68%", height: 28, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.07)" }} />
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1, aspectRatio: 1, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.035)" }} />
        <View style={{ flex: 1, aspectRatio: 1, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.035)" }} />
      </View>
      <View style={{ height: 120, borderRadius: 22, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.035)" }} />
      <View style={{ height: 48, borderRadius: 16, borderWidth: 1, borderColor: "rgba(184,146,74,0.26)", backgroundColor: "rgba(184,146,74,0.15)" }} />
    </View>
  );
}

function Footer() {
  return (
    <View style={{ marginTop: 62, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.05)", paddingVertical: 46 }}>
      <View style={{ width: "100%", maxWidth: 1400, alignSelf: "center", paddingHorizontal: 24, gap: 32 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 44, justifyContent: "space-between" }}>
          <View style={{ gap: 16, maxWidth: 390 }}>
            <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>
              <Text style={{ color: colors.gold }}>W</Text>ORKING
            </Text>
            <Text selectable style={{ color: "rgba(247,242,232,0.36)", fontSize: 14, lineHeight: 22, fontWeight: "700" }}>
              Transformando a forma como as pessoas contratam serviços locais através de tecnologia e confiança.
            </Text>
          </View>
          {[
            { title: "Empresa", links: ["Sobre nós", "Carreiras", "Blog"] },
            { title: "Suporte", links: ["Centro de Ajuda", "Segurança", "Termos de Uso"] }
          ].map((group) => (
            <View key={group.title} style={{ gap: 14, minWidth: 150 }}>
              <Text selectable style={{ color: "rgba(247,242,232,0.22)", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
                {group.title}
              </Text>
              {group.links.map((link) => (
                <Text key={link} selectable style={{ color: "rgba(247,242,232,0.38)", fontSize: 14, fontWeight: "800" }}>
                  {link}
                </Text>
              ))}
            </View>
          ))}
        </View>
        <View style={{ borderTopWidth: 1, borderColor: "rgba(255,255,255,0.045)", paddingTop: 28, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 16 }}>
          <Text selectable style={{ color: "rgba(247,242,232,0.22)", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
            © 2026 Working Tecnologia Ltda.
          </Text>
          <Text selectable style={{ color: "rgba(247,242,232,0.22)", fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
            Instagram · Twitter · LinkedIn
          </Text>
        </View>
      </View>
    </View>
  );
}
