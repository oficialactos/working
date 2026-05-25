import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, Platform } from "react-native";

type ThemeMode = "light" | "dark";
type ThemeColors = {
  background: string;
  card: string;
  cardElevated: string;
  border: string;
  gold: string;
  goldSoft: string;
  text: string;
  muted: string;
  mutedDark: string;
  success: string;
  danger: string;
  input: string;
};

const THEME_STORAGE_KEY = "actos-theme-mode";

const themeColors: Record<ThemeMode, ThemeColors> = {
  dark: {
    background: "#07090E",
    card: "#0D1118",
    cardElevated: "#121822",
    border: "rgba(255,255,255,0.08)",
    gold: "#B8924A",
    goldSoft: "rgba(184,146,74,0.14)",
    text: "#F7F2E8",
    muted: "#9AA0AA",
    mutedDark: "#5E6572",
    success: "#32D583",
    danger: "#F97066",
    input: "#111722"
  },
  light: {
    background: "#F7F4EE",
    card: "#FFFFFF",
    cardElevated: "#F0E8DA",
    border: "rgba(27,24,19,0.12)",
    gold: "#9C7535",
    goldSoft: "rgba(156,117,53,0.14)",
    text: "#191713",
    muted: "#6F716F",
    mutedDark: "#9A9388",
    success: "#15803D",
    danger: "#C2410C",
    input: "#FFFFFF"
  }
};

let activeThemeMode: ThemeMode = Appearance.getColorScheme() === "light" ? "light" : "dark";

function getActiveColors() {
  return themeColors[activeThemeMode];
}

export const colors = Object.defineProperties(
  {},
  Object.fromEntries(
    Object.keys(themeColors.dark).map((key) => [
      key,
      {
        enumerable: true,
        get: () => getActiveColors()[key as keyof ThemeColors]
      }
    ])
  )
) as ThemeColors;

type ThemeContextValue = {
  colors: ThemeColors;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  colors: getActiveColors(),
  mode: activeThemeMode,
  setMode: () => undefined,
  toggleMode: () => undefined
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(activeThemeMode);

  useEffect(() => {
    let mounted = true;

    const loadTheme = async () => {
      const savedMode = await readStoredThemeMode();
      if (!mounted || (savedMode !== "light" && savedMode !== "dark")) return;

      activeThemeMode = savedMode;
      setModeState(savedMode);
    };

    loadTheme();

    return () => {
      mounted = false;
    };
  }, []);

  const setMode = (nextMode: ThemeMode) => {
    activeThemeMode = nextMode;
    setModeState(nextMode);
    void writeStoredThemeMode(nextMode);
  };

  const value = useMemo(
    () => ({
      colors: themeColors[mode],
      mode,
      setMode,
      toggleMode: () => setMode(mode === "dark" ? "light" : "dark")
    }),
    [mode]
  );

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeSubscription() {
  useTheme();
}

export function getStatusBarStyle(mode: ThemeMode) {
  if (Platform.OS === "web") return mode === "dark" ? "light" : "dark";
  return mode === "dark" ? "light" : "dark";
}

async function readStoredThemeMode() {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
  }

  return SecureStore.getItemAsync(THEME_STORAGE_KEY);
}

async function writeStoredThemeMode(mode: ThemeMode) {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    return;
  }

  await SecureStore.setItemAsync(THEME_STORAGE_KEY, mode);
}

export const radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 14
};
