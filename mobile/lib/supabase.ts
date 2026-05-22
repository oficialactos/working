import "react-native-url-polyfill/auto";

import * as SecureStore from "expo-secure-store";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const isWebRuntime = Platform.OS === "web" || typeof localStorage !== "undefined";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.");
}

const WebStorageAdapter = {
  getItem: async (key: string) => {
    if (typeof localStorage === "undefined") {
      return null;
    }

    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(key);
    }
  }
};

const SecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key)
};

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      storage: isWebRuntime ? WebStorageAdapter : SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

export const supabaseConfig = {
  url: supabaseUrl || "https://placeholder.supabase.co",
  hasAnonKey: Boolean(supabaseAnonKey && supabaseAnonKey !== "placeholder")
};

export async function checkSupabaseConnectivity() {
  const response = await fetch(`${supabaseConfig.url}/auth/v1/health`, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey || "",
      "Content-Type": "application/json"
    }
  });

  return {
    ok: response.ok,
    status: response.status
  };
}

AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
