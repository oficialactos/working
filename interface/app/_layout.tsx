import "react-native-gesture-handler";

import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { LogBox } from "react-native";

import { AuthProvider } from "@/context/auth";
import { colors, getStatusBarStyle, ThemeProvider, useTheme } from "@/lib/theme";

LogBox.ignoreLogs(["props.pointerEvents is deprecated. Use style.pointerEvents"]);

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { mode } = useTheme();

  return (
    <>
      <StatusBar style={getStatusBarStyle(mode)} />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "900" }
        }}
      >
        <Stack.Screen name="index" options={{ title: "Working", headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: "modal" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="request/[id]" options={{ title: "Serviço", headerShown: false }} />
      </Stack>
    </>
  );
}
