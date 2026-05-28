import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, type GestureResponderEvent, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";

import { RequestCard, type ServiceRequest } from "@/components/request-card";
import { Body, Card, Screen, Title } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { colors, radius, useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

type Coordinates = {
  latitude: number;
  longitude: number;
};

export default function RequestsScreen() {
  const { role, user } = useAuth();
  useTheme();
  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const gridGap = 16;
  const gridColumns = isDesktop ? 3 : 2;
  const filterWidth = isDesktop ? 430 : width - 36;
  const contentWidth = isDesktop ? Math.min(width - 168 - 28 - filterWidth - 36, 860) : width - 36;
  const cardWidth = Math.floor((contentWidth - gridGap * (gridColumns - 1)) / gridColumns);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState("Todas");
  const [distanceFilter, setDistanceFilter] = useState(100);
  const [dateFilter, setDateFilter] = useState("Todas");
  const [mediaFilter, setMediaFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortFilter, setSortFilter] = useState("Mais recentes");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const categoryOptions = useMemo(() => ["Todos", ...uniqueValues(requests.map((request) => request.category))], [requests]);
  const filteredRequests = useMemo(() => {
    const normalizedSearch = normalizeText(searchFilter);
    const userCity = normalizeText(user?.user_metadata?.city || "");
    const userState = normalizeText(user?.user_metadata?.state || "");

    return requests.filter((request) => {
      const location = [request.city, request.state].filter(Boolean).join(" / ");
      const distanceRange = getDistanceRange(locationFilter);
      const searchable = normalizeText([request.title, request.category, location].filter(Boolean).join(" "));
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(request.category);
      const matchesLocation =
        locationFilter === "Todas" ||
        (locationFilter === "Na cidade" && userCity && normalizeText(request.city || "") === userCity) ||
        (locationFilter === "Na região" && userState && normalizeText(request.state || "") === userState);
      const matchesRadius =
        typeof request.distance_km === "number" && request.distance_km >= distanceRange.min && request.distance_km <= distanceFilter;
      const matchesDate = matchesDateFilter(request.created_at, dateFilter);
      const hasMedia = Boolean(request.media_urls?.length);
      const matchesMedia = mediaFilter === "Todos" || (mediaFilter === "Com foto" && hasMedia) || (mediaFilter === "Sem foto" && !hasMedia);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(request.status);

      return matchesSearch && matchesCategory && matchesLocation && matchesRadius && matchesDate && matchesMedia && matchesStatus;
    }).sort((a, b) => {
      if (sortFilter === "Mais próximos") {
        return (a.distance_km ?? Number.MAX_SAFE_INTEGER) - (b.distance_km ?? Number.MAX_SAFE_INTEGER);
      }

      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sortFilter === "Mais antigas" ? aTime - bTime : bTime - aTime;
    });
  }, [categoryFilter, dateFilter, distanceFilter, locationFilter, mediaFilter, requests, searchFilter, sortFilter, statusFilter, user?.user_metadata?.city, user?.user_metadata?.state]);

  const clearFilters = () => {
    setSearchFilter("");
    setCategoryFilter([]);
    setLocationFilter("Todas");
    setDistanceFilter(100);
    setDateFilter("Todas");
    setMediaFilter("Todos");
    setStatusFilter([]);
    setSortFilter("Mais recentes");
  };

  const updateLocationFilter = (value: string) => {
    const nextRange = getDistanceRange(value);
    setLocationFilter(value);
    setDistanceFilter((current) => Math.min(nextRange.max, Math.max(nextRange.min, current)));
  };

  const load = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);

    let nextProviderLocation: Coordinates | null = null;
    if (role === "provider") {
      const { data: profileData, error: profileError } = await supabase.from("profiles").select("location").eq("id", user.id).maybeSingle();

      if (!profileError && profileData?.location) {
        nextProviderLocation = parsePoint(profileData.location);
      }

    }

    let query = supabase
      .from("service_requests")
      .select("id,title,category,status,city,state,created_at,media_urls,location_point,client:profiles!service_requests_client_id_fkey(full_name,avatar_url)")
      .order("created_at", { ascending: false })
      .limit(30);

    if (role === "client") {
      query = query.eq("client_id", user.id);
    } else {
      query = query.eq("status", "open");
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
    } else {
      const nextRequests = ((data || []) as ServiceRequest[]).map((request) => {
        const requestLocation = parsePoint(request.location_point);
        const distance = nextProviderLocation && requestLocation ? getDistanceKm(nextProviderLocation, requestLocation) : null;

        return {
          ...request,
          distance_km: distance
        };
      });

      setRequests(nextRequests);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [role, user?.id]);

  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingLeft: isDesktop ? 168 : 18,
          paddingRight: isDesktop ? 28 : 18,
          paddingTop: isDesktop ? 28 : 18,
          paddingBottom: 116,
          gap: 18
        }}
        refreshControl={<RefreshControl refreshing={loading} tintColor={colors.gold} onRefresh={load} />}
      >
        <View style={{ gap: 8 }}>
          <Title>{role === "client" ? "Meus pedidos" : "Oportunidades"}</Title>
          <Body>{role === "client" ? "Acompanhe seus pedidos ativos." : "Pedidos abertos para envio de proposta."}</Body>
        </View>

        {error ? (
          <Card>
            <Text selectable style={{ color: colors.danger, fontWeight: "800" }}>{error}</Text>
          </Card>
        ) : null}

        {loading && requests.length === 0 ? <ActivityIndicator color={colors.gold} /> : null}

        {!loading && requests.length === 0 ? (
          <Card>
            <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Nada por aqui ainda</Text>
            <Body>Quando houver pedidos disponíveis, eles aparecerão nesta lista.</Body>
          </Card>
        ) : null}

        {requests.length ? (
          <View style={{ flexDirection: isDesktop ? "row" : "column", gap: isDesktop ? 36 : 18, alignItems: "flex-start" }}>
            <View style={{ width: contentWidth, maxWidth: "100%", gap: 18 }}>
              {!isDesktop ? (
                <View style={{ gap: 10 }}>
                  <Pressable
                    onPress={() => setMobileFiltersOpen((current) => !current)}
                    style={({ pressed }) => ({
                      minHeight: 52,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      opacity: pressed ? 0.82 : 1,
                      paddingHorizontal: 16
                    })}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name="filter" size={20} color={colors.gold} />
                      <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>Filtros</Text>
                    </View>
                    <Ionicons name={mobileFiltersOpen ? "chevron-up" : "chevron-down"} size={22} color={colors.gold} />
                  </Pressable>
                  {mobileFiltersOpen ? (
                    <FilterPanel
                      categoryFilter={categoryFilter}
                      categoryOptions={categoryOptions}
                      clearFilters={clearFilters}
                      dateFilter={dateFilter}
                      distanceFilter={distanceFilter}
                      locationFilter={locationFilter}
                      mediaFilter={mediaFilter}
                      searchFilter={searchFilter}
                      setCategoryFilter={setCategoryFilter}
                      setDateFilter={setDateFilter}
                      setDistanceFilter={setDistanceFilter}
                      setLocationFilter={updateLocationFilter}
                      setMediaFilter={setMediaFilter}
                      setSearchFilter={setSearchFilter}
                      setSortFilter={setSortFilter}
                      setStatusFilter={setStatusFilter}
                      sortFilter={sortFilter}
                      statusFilter={statusFilter}
                    />
                  ) : null}
                </View>
              ) : null}

              {filteredRequests.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: gridGap, alignItems: "flex-start" }}>
                  {filteredRequests.map((request) => (
                    <View key={request.id} style={{ width: cardWidth }}>
                      <Link href={{ pathname: "/request/[id]", params: { id: request.id } }} asChild>
                        <Pressable style={({ pressed }) => ({ width: "100%", opacity: pressed ? 0.78 : 1 })}>
                          <RequestCard request={request} />
                        </Pressable>
                      </Link>
                    </View>
                  ))}
                </View>
              ) : (
                <Card>
                  <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>Nenhuma oportunidade encontrada</Text>
                  <Body>Altere os filtros para ver outros pedidos disponíveis.</Body>
                </Card>
              )}
            </View>

            {isDesktop ? (
              <View style={{ width: filterWidth, minHeight: Math.max(520, height - 180) }}>
                <FilterPanel
                  categoryFilter={categoryFilter}
                  categoryOptions={categoryOptions}
                  clearFilters={clearFilters}
                  dateFilter={dateFilter}
                  distanceFilter={distanceFilter}
                  locationFilter={locationFilter}
                  mediaFilter={mediaFilter}
                  searchFilter={searchFilter}
                  setCategoryFilter={setCategoryFilter}
                  setDateFilter={setDateFilter}
                  setDistanceFilter={setDistanceFilter}
                  setLocationFilter={updateLocationFilter}
                  setMediaFilter={setMediaFilter}
                  setSearchFilter={setSearchFilter}
                  setSortFilter={setSortFilter}
                  setStatusFilter={setStatusFilter}
                  sortFilter={sortFilter}
                  statusFilter={statusFilter}
                />
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function FilterPanel({
  categoryFilter,
  categoryOptions,
  clearFilters,
  dateFilter,
  distanceFilter,
  locationFilter,
  mediaFilter,
  searchFilter,
  setCategoryFilter,
  setDateFilter,
  setDistanceFilter,
  setLocationFilter,
  setMediaFilter,
  setSearchFilter,
  setSortFilter,
  setStatusFilter,
  sortFilter,
  statusFilter
}: {
  categoryFilter: string[];
  categoryOptions: string[];
  clearFilters: () => void;
  dateFilter: string;
  distanceFilter: number;
  locationFilter: string;
  mediaFilter: string;
  searchFilter: string;
  setCategoryFilter: (value: string[]) => void;
  setDateFilter: (value: string) => void;
  setDistanceFilter: (value: number) => void;
  setLocationFilter: (value: string) => void;
  setMediaFilter: (value: string) => void;
  setSearchFilter: (value: string) => void;
  setSortFilter: (value: string) => void;
  setStatusFilter: (value: string[]) => void;
  sortFilter: string;
  statusFilter: string[];
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        gap: 14,
        padding: 16
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>Filtros</Text>
        <Pressable onPress={clearFilters} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1, paddingVertical: 6 })}>
          <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "900" }}>Limpar</Text>
        </Pressable>
      </View>

      <TextInput
        autoCapitalize="none"
        onChangeText={setSearchFilter}
        placeholder="Buscar por serviço, título ou local"
        placeholderTextColor={colors.mutedDark}
        value={searchFilter}
        style={{
          minHeight: 48,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.input,
          color: colors.text,
          fontSize: 14,
          fontWeight: "800",
          paddingHorizontal: 14
        }}
      />

      <MultiFilterChips label="Categoria" options={categoryOptions} selected={categoryFilter} onChange={setCategoryFilter} />
      <DistanceFilter max={getDistanceRange(locationFilter).max} min={getDistanceRange(locationFilter).min} value={distanceFilter} onChange={setDistanceFilter} />
      <FilterChips label="Data" options={["Todas", "Hoje", "Últimos 7 dias", "Últimos 30 dias"]} selected={dateFilter} onSelect={setDateFilter} />
      <FilterChips label="Região" options={["Todas", "Na cidade", "Na região"]} selected={locationFilter} onSelect={setLocationFilter} />
      <FilterChips label="Mídia" options={["Todos", "Com foto", "Sem foto"]} selected={mediaFilter} onSelect={setMediaFilter} />
      <MultiFilterChips
        label="Status"
        options={[
          { label: "Todos", value: "Todos" },
          { label: "Aberto", value: "open" },
          { label: "Em progresso", value: "in_progress" },
          { label: "Concluído", value: "completed" },
          { label: "Cancelado", value: "cancelled" }
        ]}
        selected={statusFilter}
        onChange={setStatusFilter}
      />
      <FilterChips label="Ordenar" options={["Mais recentes", "Mais antigas", "Mais próximos"]} selected={sortFilter} onSelect={setSortFilter} />
    </View>
  );
}

function FilterChips({ label, onSelect, options, selected }: { label: string; onSelect: (value: string) => void; options: string[]; selected: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const active = option === selected;

          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              style={({ pressed }) => ({
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? colors.gold : colors.border,
                backgroundColor: active ? colors.goldSoft : colors.input,
                opacity: pressed ? 0.78 : 1,
                paddingHorizontal: 12,
                paddingVertical: 8
              })}
            >
              <Text style={{ color: active ? colors.gold : colors.text, fontSize: 12, fontWeight: "900" }}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MultiFilterChips({
  label,
  onChange,
  options,
  selected
}: {
  label: string;
  onChange: (value: string[]) => void;
  options: Array<string | { label: string; value: string }>;
  selected: string[];
}) {
  const toggleOption = (value: string) => {
    if (value === "Todos") {
      onChange([]);
      return;
    }

    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text selectable style={{ color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" }}>{label}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {options.map((option) => {
          const chip = typeof option === "string" ? { label: option, value: option } : option;
          const active = chip.value === "Todos" ? selected.length === 0 : selected.includes(chip.value);

          return (
            <Pressable
              key={chip.value}
              onPress={() => toggleOption(chip.value)}
              style={({ pressed }) => ({
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? colors.gold : colors.border,
                backgroundColor: active ? colors.goldSoft : colors.input,
                opacity: pressed ? 0.78 : 1,
                paddingHorizontal: 12,
                paddingVertical: 8
              })}
            >
              <Text style={{ color: active ? colors.gold : colors.text, fontSize: 12, fontWeight: "900" }}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function DistanceFilter({ max, min, onChange, value }: { max: number; min: number; onChange: (value: number) => void; value: number }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const percentage = ((value - min) / (max - min)) * 100;

  const updateFromEvent = (event: GestureResponderEvent) => {
    if (!trackWidth) return;

    const nextRatio = Math.min(1, Math.max(0, event.nativeEvent.locationX / trackWidth));
    const rawValue = min + nextRatio * (max - min);
    const nextValue = rawValue < 5 ? Math.round(rawValue * 2) / 2 : Math.round(rawValue);
    onChange(Math.min(max, Math.max(min, nextValue)));
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "800" }}>Alcance da busca</Text>
        <Text selectable style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>{formatDistanceValue(value)}</Text>
      </View>
      <View
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={updateFromEvent}
        onResponderMove={updateFromEvent}
        style={{
          height: 32,
          justifyContent: "center"
        }}
      >
        <View style={{ height: 4, borderRadius: 999, backgroundColor: colors.border, overflow: "hidden" }}>
          <View style={{ width: `${percentage}%`, height: "100%", backgroundColor: colors.gold }} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: `${percentage}%`,
            width: 28,
            height: 28,
            marginLeft: -14,
            borderRadius: 14,
            backgroundColor: colors.gold,
            borderWidth: 3,
            borderColor: colors.card
          }}
        />
      </View>
    </View>
  );
}

function uniqueValues(values: string[]) {
  return values.filter((value, index, list) => value && list.findIndex((item) => normalizeText(item) === normalizeText(value)) === index);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesDateFilter(value: string | null | undefined, filter: string) {
  if (filter === "Todas") return true;
  if (!value) return false;

  const createdAt = new Date(value).getTime();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  if (filter === "Hoje") {
    return new Date(value).toDateString() === new Date().toDateString();
  }

  if (filter === "Últimos 7 dias") {
    return now - createdAt <= 7 * oneDay;
  }

  if (filter === "Últimos 30 dias") {
    return now - createdAt <= 30 * oneDay;
  }

  return true;
}

function formatDistanceValue(value: number) {
  if (value <= 0) return "0 m";
  if (value < 1) return `${Math.round(value * 1000)} m`;
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(".", ",")} Km`;
}

function getDistanceRange(locationFilter: string) {
  if (locationFilter === "Na cidade") {
    return { min: 0, max: 8 };
  }

  if (locationFilter === "Na região") {
    return { min: 9, max: 100 };
  }

  return { min: 0, max: 100 };
}

function getDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const fromLat = toRadians(from.latitude);
  const toLat = toRadians(to.latitude);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function parsePoint(value: unknown): Coordinates | null {
  if (!value) return null;

  if (typeof value === "string") {
    const pointMatch = value.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
    if (pointMatch) {
      return {
        longitude: Number(pointMatch[1]),
        latitude: Number(pointMatch[2])
      };
    }

    return parseWkbPoint(value);
  }

  if (typeof value === "object") {
    const point = value as { coordinates?: unknown; type?: string; longitude?: unknown; latitude?: unknown };
    if (Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
      return {
        longitude: Number(point.coordinates[0]),
        latitude: Number(point.coordinates[1])
      };
    }

    if (typeof point.longitude === "number" && typeof point.latitude === "number") {
      return {
        longitude: point.longitude,
        latitude: point.latitude
      };
    }
  }

  return null;
}

function parseWkbPoint(value: string): Coordinates | null {
  const hex = value.startsWith("\\x") ? value.slice(2) : value;
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length < 42) return null;

  const bytes = new Uint8Array(hex.match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  const view = new DataView(bytes.buffer);
  const littleEndian = view.getUint8(0) === 1;
  const geometryType = view.getUint32(1, littleEndian);
  const hasSrid = (geometryType & 0x20000000) !== 0;
  const baseType = geometryType & 0xff;
  if (baseType !== 1) return null;

  const offset = hasSrid ? 9 : 5;
  if (bytes.length < offset + 16) return null;

  return {
    longitude: view.getFloat64(offset, littleEndian),
    latitude: view.getFloat64(offset + 8, littleEndian)
  };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
