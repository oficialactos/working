import React from "react";
import {
  ActivityIndicator,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputContentSizeChangeEventData,
  type TextInputProps,
  useWindowDimensions,
  View
} from "react-native";

import { colors, radius, useTheme } from "@/lib/theme";

export function Screen({ children }: { children: React.ReactNode }) {
  useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {children}
    </View>
  );
}

export function AppScroll({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          width: "100%",
          maxWidth: 1180,
          alignSelf: "center",
          gap: 20,
          paddingLeft: width >= 900 ? 168 : 18,
          paddingRight: width >= 900 ? 28 : 18,
          paddingTop: width >= 900 ? 32 : 22,
          paddingBottom: 96
        }}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}

export function Card({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "gold" }) {
  useTheme();

  return (
    <View
      style={{
        backgroundColor: tone === "gold" ? "rgba(184,146,74,0.10)" : colors.card,
        borderColor: tone === "gold" ? "rgba(184,146,74,0.24)" : colors.border,
        borderCurve: "continuous",
        borderRadius: radius.lg,
        borderWidth: 1,
        gap: 14,
        padding: 18
      }}
    >
      {children}
    </View>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={{ gap: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 18 }}>
        <View style={{ flex: 1, gap: 10 }}>
          {eyebrow ? <Badge>{eyebrow}</Badge> : null}
          <Title>{title}</Title>
          <Body>{description}</Body>
        </View>
        {action ? <View style={{ alignSelf: "flex-start" }}>{action}</View> : null}
      </View>
    </View>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: colors.goldSoft,
        borderColor: "rgba(184,146,74,0.24)",
        borderRadius: 999,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 7
      }}
    >
      <Text selectable style={{ color: colors.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" }}>
        {children}
      </Text>
    </View>
  );
}

export function Pill({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "muted" | "success" | "danger" }) {
  const color = tone === "success" ? colors.success : tone === "danger" ? colors.danger : tone === "muted" ? colors.muted : colors.gold;

  return (
    <Text selectable style={{ alignSelf: "flex-start", color, fontSize: 12, fontWeight: "900", textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  useTheme();

  return (
    <Text selectable style={{ color: colors.gold, fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: 0 }}>
      {children}
    </Text>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  useTheme();

  return (
    <Text selectable style={{ color: colors.text, fontSize: 20, lineHeight: 25, fontWeight: "900", letterSpacing: 0 }}>
      {children}
    </Text>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  useTheme();

  return (
    <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "900", letterSpacing: 0, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}

export function Body({ children }: { children: React.ReactNode }) {
  useTheme();

  return (
    <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 23, fontWeight: "700" }}>
      {children}
    </Text>
  );
}

export function Input(props: TextInputProps & { label: string; autoGrow?: boolean }) {
  useTheme();

  const { label, autoGrow = false, onContentSizeChange, style, ...inputProps } = props;
  const { width } = useWindowDimensions();
  const [contentHeight, setContentHeight] = React.useState(0);
  const flattenedStyle = StyleSheet.flatten(style);
  const minHeight = typeof flattenedStyle?.minHeight === "number" ? flattenedStyle.minHeight : 52;
  const inputValue = typeof inputProps.value === "string" ? inputProps.value : typeof inputProps.defaultValue === "string" ? inputProps.defaultValue : "";
  const webEstimatedHeight = React.useMemo(() => {
    if (!autoGrow || !inputProps.multiline || Platform.OS !== "web") return undefined;

    const charsPerLine = width < 380 ? 26 : width < 520 ? 34 : 44;
    const lineCount = inputValue
      .split("\n")
      .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);

    return Math.max(minHeight, lineCount * 24 + 24);
  }, [autoGrow, inputProps.multiline, inputValue, minHeight, width]);
  const dynamicHeight =
    autoGrow && inputProps.multiline
      ? webEstimatedHeight ?? (contentHeight > 0 ? Math.max(minHeight, contentHeight + 24) : undefined)
      : undefined;

  const handleContentSizeChange = (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
    if (autoGrow && Platform.OS !== "web") {
      const nextHeight = Math.ceil(event.nativeEvent.contentSize.height);
      setContentHeight((currentHeight) => (Math.abs(currentHeight - nextHeight) > 1 ? nextHeight : currentHeight));
    }
    onContentSizeChange?.(event);
  };

  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.mutedDark}
        {...inputProps}
        onContentSizeChange={handleContentSizeChange}
        scrollEnabled={autoGrow ? false : inputProps.scrollEnabled}
        style={[
          {
            backgroundColor: colors.input,
            borderColor: colors.border,
            borderCurve: "continuous",
            borderRadius: radius.md,
            borderWidth: 1,
            color: colors.text,
            fontSize: 16,
            fontWeight: "800",
            minHeight: 52,
            paddingHorizontal: 16
          },
          style,
          dynamicHeight ? { height: dynamicHeight } : null
        ]}
      />
    </View>
  );
}

export function Button({
  children,
  disabled,
  loading,
  onPress,
  tone = "primary"
}: {
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  tone?: "primary" | "secondary" | "danger";
}) {
  useTheme();

  const backgroundColor = tone === "primary" ? colors.gold : tone === "danger" ? "rgba(249,112,102,0.14)" : colors.cardElevated;
  const borderColor = tone === "primary" ? colors.gold : tone === "danger" ? "rgba(249,112,102,0.28)" : colors.border;
  const textColor = tone === "primary" ? "#FFFFFF" : tone === "danger" ? colors.danger : colors.text;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: "center",
        backgroundColor,
        borderColor,
        borderCurve: "continuous",
        borderRadius: radius.md,
        borderWidth: 1,
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        minHeight: 54,
        opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
        paddingHorizontal: 18
      })}
    >
      {loading ? <ActivityIndicator color={textColor} /> : null}
      <Text style={{ color: textColor, fontSize: 15, fontWeight: "900" }}>{children}</Text>
    </Pressable>
  );
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 150,
        backgroundColor: "rgba(255,255,255,0.035)",
        borderColor: colors.border,
        borderCurve: "continuous",
        borderRadius: radius.lg,
        borderWidth: 1,
        gap: 8,
        padding: 16
      }}
    >
      <Label>{label}</Label>
      <Text style={{ color: colors.gold, fontSize: 28, fontVariant: ["tabular-nums"], fontWeight: "900" }}>{value}</Text>
      {detail ? <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>{detail}</Text> : null}
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return <MetricCard label={label} value={value} />;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <View style={{ gap: 8 }}>
        <SectionTitle>{title}</SectionTitle>
        <Body>{description}</Body>
      </View>
    </Card>
  );
}
