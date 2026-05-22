import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";

import { useAuth } from "@/context/auth";
import { colors, useTheme } from "@/lib/theme";

type TabIconName = React.ComponentProps<typeof Ionicons>["name"];

export default function TabsLayout() {
  const { loading, role, session } = useAuth();
  useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  if (!loading && !session) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      tabBar={(props) => <ResponsiveTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.muted
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Mensagens",
          tabBarLabel: "Mensagens",
          tabBarIcon: ({ color, focused, size }) => <TabIcon color={color} focused={focused} name="chatbubbles" outlineName="chatbubbles-outline" size={size} />
        }}
      />
      <Tabs.Screen
        name="client"
        options={{
          href: role === "client" ? undefined : null,
          title: "Cliente",
          tabBarLabel: "Solicitar",
          tabBarIcon: ({ focused, size }) => <FeaturedTabIcon focused={focused} icon="construct" isDesktop={isDesktop} outlineIcon="construct-outline" size={size} />
        }}
      />
      <Tabs.Screen
        name="provider"
        options={{
          href: null,
          title: "Prestador",
          tabBarLabel: "Inicio",
          tabBarIcon: ({ color, focused, size }) => <TabIcon color={color} focused={focused} name="briefcase" outlineName="briefcase-outline" size={size} />
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          href: role === "provider" ? undefined : null,
          title: "Pedidos",
          tabBarLabel: "Pedidos",
          tabBarIcon: ({ focused, size }) => <FeaturedTabIcon focused={focused} icon="clipboard" isDesktop={isDesktop} outlineIcon="clipboard-outline" size={size} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
          tabBarIcon: ({ color, focused, size }) => <TabIcon color={color} focused={focused} name="person-circle" outlineName="person-circle-outline" size={size} />
        }}
      />
      <Tabs.Screen name="new-request" options={{ href: null }} />
    </Tabs>
  );
}

function ResponsiveTabBar({ descriptors, navigation, state }: BottomTabBarProps) {
  const { role, user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const activeOptions = descriptors[state.routes[state.index]?.key]?.options as { tabBarHidden?: boolean };
  const visibleRoutes = state.routes.filter((route) => {
    if (route.name === "new-request") return false;
    if (role === "client") return ["chat", "client", "profile"].includes(route.name);
    if (role === "provider") return ["chat", "requests", "profile"].includes(route.name);
    return false;
  });

  if (activeOptions?.tabBarHidden) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderRadius: isDesktop ? 12 : 12,
        borderWidth: 1,
        flexDirection: isDesktop ? "column" : "row",
        alignItems: "center",
        justifyContent: "space-around",
        gap: isDesktop ? 8 : 0,
        left: isDesktop ? 18 : 14,
        right: isDesktop ? undefined : 14,
        top: isDesktop ? 24 : undefined,
        bottom: isDesktop ? 24 : 10,
        width: isDesktop ? 124 : undefined,
        minHeight: isDesktop ? 360 : 78,
        paddingHorizontal: isDesktop ? 10 : 8,
        paddingVertical: isDesktop ? 14 : 8,
        zIndex: 20,
        elevation: 20
      }}
    >
      {visibleRoutes.map((route) => {
        const descriptor = descriptors[route.key];
        const options = descriptor.options;
        const focused = state.index === state.routes.findIndex((item) => item.key === route.key);
        const color = focused ? colors.gold : colors.muted;
        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : typeof options.title === "string"
              ? options.title
              : route.name;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true
              });

              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            style={({ pressed }) => ({
              width: isDesktop ? "100%" : undefined,
              flex: isDesktop ? undefined : 1,
              minHeight: isDesktop ? 76 : 58,
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              borderRadius: 8,
              opacity: pressed ? 0.74 : 1
            })}
          >
            {route.name === "profile" ? (
              <ProfileTabIcon avatarUrl={avatarUrl} focused={focused} size={24} />
            ) : (
              options.tabBarIcon?.({ focused, color, size: 24 })
            )}
            <Text style={{ color, fontSize: 12, fontWeight: "900", lineHeight: 16 }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TabIcon({
  color,
  focused,
  name,
  outlineName,
  size
}: {
  color: string;
  focused: boolean;
  name: TabIconName;
  outlineName: TabIconName;
  size: number;
}) {
  return <Ionicons color={color} name={focused ? name : outlineName} size={size + 1} />;
}

function ProfileTabIcon({ avatarUrl, focused, size }: { avatarUrl?: string; focused: boolean; size: number }) {
  const iconSize = size + 8;

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        contentFit="cover"
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize / 2,
          borderWidth: 2,
          borderColor: focused ? colors.gold : colors.muted,
          backgroundColor: colors.cardElevated
        }}
      />
    );
  }

  return <Ionicons color={focused ? colors.gold : colors.muted} name={focused ? "person-circle" : "person-circle-outline"} size={size + 1} />;
}

function FeaturedTabIcon({
  focused,
  icon,
  isDesktop,
  outlineIcon,
  size
}: {
  focused: boolean;
  icon: TabIconName;
  isDesktop: boolean;
  outlineIcon: TabIconName;
  size: number;
}) {
  return (
    <View
      style={{
        width: isDesktop ? 48 : 52,
        height: isDesktop ? 48 : 52,
        borderRadius: isDesktop ? 24 : 26,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? colors.gold : colors.cardElevated,
        borderColor: focused ? colors.gold : "rgba(184,146,74,0.32)",
        borderWidth: 1,
        marginTop: isDesktop ? 0 : -34
      }}
    >
      <Ionicons color={focused ? colors.text : colors.gold} name={focused ? icon : outlineIcon} size={size + 6} />
    </View>
  );
}
