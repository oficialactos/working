import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { colors, radius, useTheme } from "@/lib/theme";

export const presetServices = [
  "Elétrica",
  "Hidráulica",
  "Pintura",
  "Limpeza",
  "Jardinagem",
  "Montagem de móveis",
  "Ar-condicionado",
  "Marcenaria",
  "Pedreiro",
  "Informática"
];

type ServiceSelectorProps = {
  selectedServices: string[];
  onChange: (services: string[]) => void;
};

export function normalizeServices(services: string[]) {
  return services
    .map((service) => service.trim())
    .filter(Boolean)
    .filter((service, index, list) => list.findIndex((item) => item.toLowerCase() === service.toLowerCase()) === index);
}

export function ServiceSelector({ selectedServices, onChange }: ServiceSelectorProps) {
  const { mode } = useTheme();
  const isLight = mode === "light";
  const [showOther, setShowOther] = useState(false);
  const [customService, setCustomService] = useState("");
  const customServices = useMemo(
    () => selectedServices.filter((service) => !presetServices.some((preset) => preset.toLowerCase() === service.toLowerCase())),
    [selectedServices]
  );
  const shouldShowOtherInput = showOther || customServices.length > 0;

  const toggleService = (service: string) => {
    const exists = selectedServices.some((item) => item.toLowerCase() === service.toLowerCase());
    onChange(exists ? selectedServices.filter((item) => item.toLowerCase() !== service.toLowerCase()) : normalizeServices([...selectedServices, service]));
  };

  const addCustomService = () => {
    const nextService = customService.trim();
    if (!nextService) return;

    onChange(normalizeServices([...selectedServices, nextService]));
    setCustomService("");
    setShowOther(false);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {presetServices.map((service) => {
          const active = selectedServices.some((item) => item.toLowerCase() === service.toLowerCase());

          return (
            <ServiceChip key={service} active={active} label={service} onPress={() => toggleService(service)} />
          );
        })}
        <ServiceChip active={shouldShowOtherInput} label="Outros" onPress={() => setShowOther((current) => !current)} />
      </View>

      {shouldShowOtherInput ? (
        <View style={{ gap: 10 }}>
          {customServices.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {customServices.map((service) => (
                <ServiceChip key={service} active label={service} onPress={() => toggleService(service)} />
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TextInput
              autoCapitalize="words"
              onChangeText={setCustomService}
              onSubmitEditing={addCustomService}
              placeholder="Adicionar outro serviço"
              placeholderTextColor={isLight ? "#7E7669" : "rgba(247,242,232,0.25)"}
              value={customService}
              style={{
                flex: 1,
                minHeight: 52,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isLight ? "rgba(156,117,53,0.30)" : "rgba(255,255,255,0.08)",
                backgroundColor: isLight ? "#FFFDF8" : "rgba(255,255,255,0.04)",
                color: isLight ? "#2F291F" : colors.text,
                fontSize: 15,
                fontWeight: "800",
                paddingHorizontal: 16
              }}
            />
            <Pressable
              onPress={addCustomService}
              style={({ pressed }) => ({
                minHeight: 52,
                borderRadius: 8,
                backgroundColor: colors.gold,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.82 : 1,
                paddingHorizontal: 16
              })}
            >
              <Text style={{ color: isLight ? "#1F1A12" : colors.text, fontSize: 14, fontWeight: "900" }}>Adicionar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ServiceChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  const { mode } = useTheme();
  const isLight = mode === "light";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? "rgba(184,146,74,0.72)" : isLight ? "rgba(156,117,53,0.20)" : "rgba(255,255,255,0.08)",
        backgroundColor: active ? colors.goldSoft : isLight ? "rgba(255,255,255,0.72)" : "rgba(255,255,255,0.04)",
        minHeight: 42,
        opacity: pressed ? 0.82 : 1,
        paddingHorizontal: 14,
        paddingVertical: 10
      })}
    >
      <Text style={{ color: active ? colors.gold : isLight ? "#2F291F" : colors.text, fontSize: 13, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}
