import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";

import { Body, Button, Card, Input, Label, Pill, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";
import { colors, radius, useTheme } from "@/lib/theme";

type ServiceRequest = {
  id: string;
  category: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "completed" | "cancelled" | string;
  created_at: string;
  address_text?: string | null;
  city?: string | null;
  state?: string | null;
  media_urls?: string[] | null;
};

function AvatarOptionsModal({
  hasAvatar,
  onChange,
  onClose,
  onPreview,
  onRemove,
  visible
}: {
  hasAvatar: boolean;
  onChange: () => void;
  onClose: () => void;
  onPreview: () => void;
  onRemove: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.62)",
          alignItems: "center",
          justifyContent: "center",
          padding: 22
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            gap: 12,
            padding: 18
          }}
        >
          <View style={{ gap: 4 }}>
            <SectionTitle>Foto de perfil</SectionTitle>
            <Body>Escolha uma nova imagem ou remova a foto atual.</Body>
          </View>

          {hasAvatar ?<Button tone="secondary" onPress={onPreview}>Visualizar foto</Button> : null}
          <Button tone="secondary" onPress={onChange}>Trocar foto</Button>
          {hasAvatar ?<Button tone="danger" onPress={onRemove}>Remover foto</Button> : null}
          <Button onPress={onClose}>Cancelar</Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AvatarPreviewModal({ avatarUrl, onClose, visible }: { avatarUrl: string; onClose: () => void; visible: boolean }) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.82)",
          alignItems: "center",
          justifyContent: "center",
          padding: 22
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            gap: 18,
            alignItems: "center"
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              aspectRatio: 1,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              backgroundColor: colors.card,
              overflow: "hidden"
            }}
          >
            {avatarUrl ?<Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" /> : null}
          </View>
          <Button onPress={onClose}>Fechar</Button>
        </View>
      </View>
    </Modal>
  );
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { role, signOut, user } = useAuth();
  const { mode, toggleMode } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState(user?.user_metadata?.avatar_url || "");
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [phone, setPhone] = useState(user?.user_metadata?.phone || "");
  const [city, setCity] = useState(user?.user_metadata?.city || "");
  const [state, setState] = useState(user?.user_metadata?.state || "");
  const [locationText, setLocationText] = useState(user?.user_metadata?.location_label || "");
  const [cpfCnpj, setCpfCnpj] = useState(user?.user_metadata?.cpf_cnpj || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const locationRequestedRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name,avatar_url,phone,city,state,cpf_cnpj")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setAvatarUrl(data.avatar_url || "");
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setCity(data.city || "");
        setState(data.state || "");
        setCpfCnpj(data.cpf_cnpj || "");
      }

      setLoading(false);
      if (!locationRequestedRef.current) {
        locationRequestedRef.current = true;
        updateDeviceLocation();
      }
    };

    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!historyOpen || !user) return;

    const loadRequests = async () => {
      setRequestsLoading(true);
      const { data, error } = await supabase
        .from("service_requests")
        .select("id,category,title,description,status,created_at,address_text,city,state,media_urls")
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar histórico de pedidos", error);
        setMessage([error.message, error.details, error.hint].filter(Boolean).join(" "));
      } else {
        setRequests((data || []) as ServiceRequest[]);
      }

      setRequestsLoading(false);
    };

    loadRequests();
  }, [historyOpen, user]);

  const updateDeviceLocation = async () => {
    if (!user) return;

    setLocationLoading(true);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({});
      const coordsLabel = `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`;
      const place = Platform.OS === "web" ?await reverseGeocodeWeb(position.coords.latitude, position.coords.longitude) : (await Location.reverseGeocodeAsync(position.coords))[0];
      const deviceCity = place?.city || place?.subregion || "";
      const deviceState = place?.region || "";
      const deviceLocationLabel = [deviceCity, deviceState].filter(Boolean).join(" / ") || coordsLabel;

      setCity(deviceCity);
      setState(deviceState);
      setLocationText(deviceLocationLabel);

      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          role,
          full_name: fullName.trim() || user.user_metadata?.full_name || user.email,
          avatar_url: avatarUrl || user.user_metadata?.avatar_url || null,
          city: deviceCity || null,
          state: deviceState || null
        },
        { onConflict: "id" }
      );

      if (error) {
        console.error("Erro ao salvar localização", error);
      }
    } catch (error) {
      console.error("Erro ao atualizar localização", error);
    } finally {
      setLocationLoading(false);
    }
  };

  const pickAvatar = async () => {
    setAvatarMenuOpen(false);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Permita acesso à galeria para escolher uma foto de perfil.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85
    });

    if (!result.canceled && result.assets[0] && user) {
      setAvatarUploading(true);
      setMessage(null);

      const { publicUrl, error } = await uploadAvatar(result.assets[0].uri, user.id, result.assets[0].mimeType);

      if (error || !publicUrl) {
        setAvatarUploading(false);
        setMessage(error || "Não foi possível salvar a foto de perfil.");
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          role,
          full_name: fullName.trim() || user.user_metadata?.full_name || user.email,
          avatar_url: publicUrl
        },
        { onConflict: "id" }
      );

      if (!profileError) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            role,
            full_name: fullName.trim() || user.user_metadata?.full_name || user.email,
            avatar_url: publicUrl
          }
        });

        if (metadataError) {
          setAvatarUploading(false);
          setMessage(metadataError.message);
          return;
        }
      }

      setAvatarUploading(false);

      if (profileError) {
        console.error("Erro ao salvar foto de perfil", profileError);
        setMessage([profileError.message, profileError.details, profileError.hint].filter(Boolean).join(" "));
        return;
      }

      setAvatarUrl(publicUrl);
      setMessage("Foto atualizada com sucesso.");
    }
  };

  const removeAvatar = async () => {
    if (!user) return;

    setAvatarMenuOpen(false);
    setAvatarUploading(true);
    setMessage(null);

    const storagePath = getAvatarStoragePath(avatarUrl);
    if (storagePath) {
      await supabase.storage.from("avatars").remove([storagePath]);
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        role,
        full_name: fullName.trim() || user.user_metadata?.full_name || user.email,
        avatar_url: null
      },
      { onConflict: "id" }
    );

    if (!profileError) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          role,
          full_name: fullName.trim() || user.user_metadata?.full_name || user.email,
          avatar_url: null
        }
      });

      if (metadataError) {
        setAvatarUploading(false);
        setMessage(metadataError.message);
        return;
      }
    }

    setAvatarUploading(false);

    if (profileError) {
      console.error("Erro ao remover foto de perfil", profileError);
      setMessage([profileError.message, profileError.details, profileError.hint].filter(Boolean).join(" "));
      return;
    }

    setAvatarUrl("");
    setMessage("Foto removida com sucesso.");
  };

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      id: user.id,
      role,
      full_name: fullName.trim(),
      avatar_url: avatarUrl || null,
      phone: phone.trim() || null,
      city: city.trim() || null,
      state: state.trim() || null,
      cpf_cnpj: cpfCnpj.trim() || null
    };

    const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });

    if (!error) {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: payload.full_name,
          avatar_url: payload.avatar_url,
          phone: payload.phone,
          city: payload.city,
          state: payload.state,
          cpf_cnpj: payload.cpf_cnpj,
          role
        }
      });

      if (metadataError) {
        setMessage(metadataError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar perfil", error);
      setMessage([error.message, error.details, error.hint].filter(Boolean).join(" "));
      return;
    }

    setMessage("Perfil atualizado com sucesso.");
  };

  const updatePassword = async () => {
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("As senhas não conferem.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordOpen(false);
    setMessage("Senha alterada com sucesso.");
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const locationLabel = [city, state].filter(Boolean).join(" / ") || locationText || "Não informada";
  return (
    <Screen>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          width: "100%",
          maxWidth: 1180,
          alignSelf: "center",
          gap: isDesktop ?22 : 16,
          paddingLeft: isDesktop ?168 : 16,
          paddingRight: isDesktop ?28 : 16,
          paddingTop: isDesktop ?28 : 14,
          paddingBottom: 118
        }}
      >
        <View style={{ position: "relative" }}>
          <Text selectable style={{ color: colors.gold, fontSize: isDesktop ?32 : 26, fontWeight: "900", letterSpacing: 0 }}>
            Sua conta
          </Text>
          <Body>Atualize sua foto, contato e dados principais usados no atendimento.</Body>
        </View>

        {message ?<StatusMessage message={message} /> : null}

        <View style={{ flexDirection: isDesktop ?"row" : "column", gap: isDesktop ?20 : 16, alignItems: "flex-start" }}>
          <View style={{ width: isDesktop ?330 : "100%", gap: 16 }}>
            <ProfilePanel
              avatarUrl={avatarUrl}
              email={user?.email || ""}
              fullName={fullName}
              location={locationLoading ?"Atualizando..." : locationLabel}
              loading={avatarUploading}
              onOpenAvatarMenu={() => setAvatarMenuOpen(true)}
            />

            {isDesktop ?<Button tone="danger" onPress={handleSignOut}>Sair da conta</Button> : null}
          </View>

          <View style={{ flex: 1, width: "100%", gap: 16 }}>
            <Card>
              {loading ?(
                <View style={{ minHeight: 260, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={colors.gold} />
                </View>
              ) : (
                <View style={{ gap: 18 }}>
                  <Pressable
                    onPress={() => setDetailsOpen((current) => !current)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      opacity: pressed ?0.82 : 1
                    })}
                  >
                    <View style={{ flex: 1, gap: 5 }}>
                    <SectionTitle>Dados do perfil</SectionTitle>
                    <Body>Altere as informações que aparecem no seu perfil de cliente.</Body>
                  </View>
                    <Ionicons name={detailsOpen ?"chevron-up" : "chevron-down"} size={24} color={colors.gold} />
                  </Pressable>

                  {detailsOpen ?(
                    <View style={{ gap: 18 }}>
                  <Input label="Nome completo" value={fullName} onChangeText={setFullName} placeholder="Seu nome" autoCapitalize="words" />
                  <Input label="Telefone / WhatsApp" value={phone} onChangeText={setPhone} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
                  <Input label="CPF ou CNPJ" value={cpfCnpj} onChangeText={setCpfCnpj} placeholder="Documento" keyboardType="number-pad" />

                  <View
                    style={{
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: colors.border,
                      backgroundColor: colors.input,
                      gap: 12,
                      padding: 16
                    }}
                  >
                    <Label>Localização automática</Label>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons name="location-outline" size={20} color={colors.gold} />
                      <Text selectable style={{ flex: 1, color: colors.text, fontSize: 15, fontWeight: "900" }}>
                        {locationLoading ?"Atualizando..." : locationLabel}
                      </Text>
                    </View>
                    <Button tone="secondary" loading={locationLoading} disabled={locationLoading} onPress={updateDeviceLocation}>
                      Atualizar localização
                    </Button>
                  </View>

                  <Button loading={saving} disabled={saving} onPress={saveProfile}>
                    Salvar alterações
                  </Button>
                    </View>
                  ) : null}
                </View>
              )}
            </Card>

            <Card>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <View style={{ flex: 1, gap: 5 }}>
                  <SectionTitle>Aparência</SectionTitle>
                  <Body>{mode === "dark" ? "Modo escuro ativo." : "Modo claro ativo."}</Body>
                </View>
                <Pressable
                  accessibilityRole="switch"
                  accessibilityState={{ checked: mode === "dark" }}
                  onPress={toggleMode}
                  style={({ pressed }) => ({
                    width: 64,
                    height: 36,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: mode === "dark" ? colors.gold : colors.input,
                    justifyContent: "center",
                    padding: 4,
                    opacity: pressed ? 0.78 : 1
                  })}
                >
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      alignSelf: mode === "dark" ? "flex-end" : "flex-start",
                      backgroundColor: mode === "dark" ? colors.background : colors.gold
                    }}
                  >
                    <Ionicons name={mode === "dark" ? "moon" : "sunny"} size={15} color={mode === "dark" ? colors.gold : colors.text} />
                  </View>
                </Pressable>
              </View>
            </Card>

            <Card>
              <View style={{ gap: 18 }}>
                <Pressable
                  onPress={() => setPasswordOpen((current) => !current)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    opacity: pressed ?0.82 : 1
                  })}
                >
                  <View style={{ flex: 1, gap: 5 }}>
                    <SectionTitle>Alterar senha</SectionTitle>
                    <Body>Toque para definir uma nova senha de acesso.</Body>
                  </View>
                  <Ionicons name={passwordOpen ?"chevron-up" : "chevron-down"} size={24} color={colors.gold} />
                </Pressable>

                {passwordOpen ?(
                  <View style={{ gap: 18 }}>
                    <PasswordInput label="Nova senha" value={newPassword} onChangeText={setNewPassword} placeholder="Mínimo 6 caracteres" />
                    <PasswordInput label="Confirmar nova senha" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repita a senha" />
                    <Button loading={saving} disabled={saving} onPress={updatePassword}>
                      Salvar nova senha
                    </Button>
                  </View>
                ) : null}
              </View>
            </Card>

            <Card>
              <View style={{ gap: 18 }}>
                <Pressable
                  onPress={() => setHistoryOpen((current) => !current)}
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    opacity: pressed ? 0.82 : 1
                  })}
                >
                  <View style={{ flex: 1, gap: 5 }}>
                    <SectionTitle>Histórico de pedidos</SectionTitle>
                    <Body>Toque para ver todos os serviços solicitados por você.</Body>
                  </View>
                  <Ionicons name={historyOpen ? "chevron-up" : "chevron-down"} size={24} color={colors.gold} />
                </Pressable>

                {historyOpen ? (
                  <View style={{ gap: 12 }}>
                    {requestsLoading ? (
                      <ActivityIndicator color={colors.gold} />
                    ) : requests.length ? (
                      requests.map((request) => <RequestHistoryItem key={request.id} onPress={() => setSelectedRequest(request)} request={request} />)
                    ) : (
                      <View
                        style={{
                          borderRadius: radius.md,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.input,
                          padding: 16
                        }}
                      >
                        <Body>Você ainda não fez nenhum pedido.</Body>
                      </View>
                    )}
                  </View>
                ) : null}
              </View>
            </Card>

            {!isDesktop ?<Button tone="danger" onPress={handleSignOut}>Sair da conta</Button> : null}
          </View>
        </View>
      </ScrollView>
      <AvatarOptionsModal
        hasAvatar={Boolean(avatarUrl)}
        onChange={pickAvatar}
        onClose={() => setAvatarMenuOpen(false)}
        onPreview={() => {
          setAvatarMenuOpen(false);
          setAvatarPreviewOpen(true);
        }}
        onRemove={removeAvatar}
        visible={avatarMenuOpen}
      />
      <AvatarPreviewModal avatarUrl={avatarUrl} onClose={() => setAvatarPreviewOpen(false)} visible={avatarPreviewOpen} />
      <RequestDetailsModal
        fallbackLocation={locationLabel}
        onClose={() => setSelectedRequest(null)}
        onSaved={(updated) => {
          setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)));
          setSelectedRequest(updated);
        }}
        request={selectedRequest}
        userId={user?.id || ""}
      />
    </Screen>
  );
}

function ProfilePanel({
  avatarUrl,
  email,
  fullName,
  location,
  loading,
  onOpenAvatarMenu
}: {
  avatarUrl: string;
  email: string;
  fullName: string;
  location: string;
  loading: boolean;
  onOpenAvatarMenu: () => void;
}) {
  return (
    <View
      style={{
        borderRadius: radius.xl,
        borderWidth: 1,
        borderColor: "rgba(184,146,74,0.28)",
        backgroundColor: colors.card,
        overflow: "hidden"
      }}
    >
      <View
        style={{
          minHeight: 190,
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          backgroundColor: colors.gold,
          paddingHorizontal: 22,
          paddingTop: 30,
          paddingBottom: 28
        }}
      >
        <Pressable disabled={loading} onPress={onOpenAvatarMenu} style={({ pressed }) => ({ opacity: loading ?0.72 : pressed ?0.84 : 1 })}>
          <View
            style={{
              width: 104,
              height: 104,
              borderRadius: 52,
              borderWidth: 4,
              borderColor: colors.text,
              backgroundColor: colors.card,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {loading ?(
              <ActivityIndicator color={colors.gold} />
            ) : avatarUrl ?(
              <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
            ) : (
              <Text style={{ color: colors.gold, fontSize: 34, fontWeight: "900" }}>
                {(fullName || email || "U").slice(0, 1).toUpperCase()}
              </Text>
            )}
          </View>
          <View
            style={{
              position: "absolute",
              right: -2,
              bottom: 2,
              width: 34,
              height: 34,
              borderRadius: 17,
              borderWidth: 3,
              borderColor: colors.gold,
              backgroundColor: colors.text,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Ionicons name="camera" size={17} color={colors.gold} />
          </View>
        </Pressable>

        <View style={{ alignItems: "center", gap: 5 }}>
          <Text selectable style={{ color: colors.text, fontSize: 22, fontWeight: "900", textAlign: "center" }}>
            {fullName || "Seu nome"}
          </Text>
          <Text selectable style={{ color: "rgba(247,242,232,0.78)", fontSize: 12, fontWeight: "800", textAlign: "center" }}>
            {email}
          </Text>
        </View>
      </View>

      <View style={{ gap: 14, padding: 18 }}>
        <InfoLine icon="location-outline" label="Localização" value={location} />
      </View>
    </View>
  );
}

function PasswordInput({
  label,
  onChangeText,
  placeholder,
  value
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <View>
        <TextInput
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedDark}
          secureTextEntry={!visible}
          value={value}
          style={{
            backgroundColor: colors.input,
            borderColor: colors.border,
            borderRadius: radius.md,
            borderWidth: 1,
            color: colors.text,
            fontSize: 16,
            fontWeight: "800",
            minHeight: 52,
            paddingLeft: 16,
            paddingRight: 54
          }}
        />
        <Pressable
          accessibilityLabel={visible ?"Ocultar senha" : "Mostrar senha"}
          onPress={() => setVisible((current) => !current)}
          style={({ pressed }) => ({
            position: "absolute",
            right: 10,
            top: 0,
            bottom: 0,
            width: 40,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ?0.72 : 1
          })}
        >
          <Ionicons name={visible ?"eye-off-outline" : "eye-outline"} size={22} color={colors.gold} />
        </Pressable>
      </View>
    </View>
  );
}

function RequestHistoryItem({ onPress, request }: { onPress: () => void; request: ServiceRequest }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.input,
        gap: 10,
        opacity: pressed ? 0.82 : 1,
        padding: 16
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
            {request.title}
          </Text>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
            {request.category} • {formatRequestDate(request.created_at)}
          </Text>
        </View>
        <Pill tone={request.status === "completed" ? "success" : request.status === "cancelled" ? "danger" : "gold"}>
          {statusLabel(request.status)}
        </Pill>
      </View>
      <Text selectable numberOfLines={2} style={{ color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: "700" }}>
        {request.description}
      </Text>
    </Pressable>
  );
}

function RequestDetailsModal({
  fallbackLocation,
  onClose,
  onSaved,
  request,
  userId
}: {
  fallbackLocation?: string;
  onClose: () => void;
  onSaved: (request: ServiceRequest) => void;
  request: ServiceRequest | null;
  userId: string;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [media, setMedia] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const profileLocation = fallbackLocation && fallbackLocation !== "Não informada" ? fallbackLocation : "";
  const requestLocation = [
    request?.address_text,
    request?.city && request?.state ? `${request.city} / ${request.state}` : request?.city || request?.state
  ]
    .filter(Boolean)
    .join(" - ");
  const location = sanitizeLocation(requestLocation || profileLocation);

  useEffect(() => {
    setTitle(request?.title || "");
    setCategory(request?.category || "");
    setDescription(request?.description || "");
    setMedia(request?.media_urls?.filter(Boolean) || []);
    setFeedback(null);
  }, [request]);

  const pickMedia = async () => {
    if (!request || !userId) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      videoMaxDuration: 60
    });

    if (result.canceled) return;
    setSaving(true);
    try {
      const uploaded = await uploadRequestMediaAssets(result.assets, userId, request.id);
      setMedia((current) => [...current, ...uploaded]);
    } finally {
      setSaving(false);
    }
  };

  const saveRequest = async () => {
    if (!request) return;

    setSaving(true);
    const payload = {
      title: title.trim(),
      category: category.trim(),
      description: description.trim(),
      media_urls: media
    };
    const { error } = await supabase.from("service_requests").update(payload).eq("id", request.id);
    setSaving(false);

    if (error) {
      console.error("Erro ao atualizar pedido", error);
      setFeedback({
        tone: "danger",
        message: [error.message, error.details, error.hint].filter(Boolean).join(" ") || "Não foi possível salvar as alterações."
      });
      return;
    }

    onSaved({ ...request, ...payload });
    setFeedback({ tone: "success", message: "Alterações salvas com sucesso." });
  };

  return (
    <Modal animationType="fade" transparent visible={Boolean(request)} onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.72)",
          alignItems: "center",
          justifyContent: "center",
          padding: 18
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 440,
            maxHeight: "86%",
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            overflow: "hidden"
          }}
        >
          <ScrollView contentContainerStyle={{ gap: 16, padding: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <SectionTitle>{request?.title || "Pedido"}</SectionTitle>
                {request ? (
                  <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
                    {request.category} • {formatRequestDate(request.created_at)}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel="Fechar"
                onPress={onClose}
                style={({ pressed }) => ({
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.72 : 1
                })}
              >
                <Ionicons name="close" size={24} color={colors.gold} />
              </Pressable>
            </View>

            {feedback ? <RequestFeedback tone={feedback.tone} message={feedback.message} /> : null}

            <Input label="Título" value={title} onChangeText={setTitle} placeholder="Título do pedido" />
            <Input label="Categoria" value={category} onChangeText={setCategory} placeholder="Categoria" />
            <View style={{ gap: 8 }}>
              <Label>Descrição</Label>
              <TextInput
                multiline
                onChangeText={setDescription}
                placeholder="Descrição do pedido"
                placeholderTextColor={colors.mutedDark}
                value={description}
                style={{
                  minHeight: 110,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.input,
                  color: colors.text,
                  fontSize: 15,
                  fontWeight: "800",
                  padding: 14,
                  textAlignVertical: "top"
                }}
              />
            </View>
            <DetailBlock label="Localização" value={location || "Não informada."} />

            <View style={{ gap: 8 }}>
              <Label>Mídias anexadas</Label>
              {media.length ? (
                <View style={{ gap: 10 }}>
                  {media.map((url, index) => (
                    <View key={`${url}-${index}`} style={{ position: "relative" }}>
                      {isImageUrl(url) ? (
                        <Image source={{ uri: url }} style={{ width: "100%", height: 180, borderRadius: radius.md, backgroundColor: colors.input }} contentFit="cover" />
                      ) : (
                        <Text selectable style={{ color: colors.gold, fontSize: 13, fontWeight: "800" }}>
                          Arquivo {index + 1}: {url}
                        </Text>
                      )}
                      <Pressable
                        accessibilityLabel="Remover m?dia"
                        onPress={() => setMedia((current) => current.filter((item) => item !== url))}
                        style={({ pressed }) => ({
                          position: "absolute",
                          right: 10,
                          top: 10,
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: colors.danger,
                          alignItems: "center",
                          justifyContent: "center",
                          opacity: pressed ? 0.78 : 1
                        })}
                      >
                        <Ionicons name="close" size={20} color={colors.text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Body>Nenhuma mídia anexada.</Body>
              )}
              <Button tone="secondary" loading={saving} disabled={saving} onPress={pickMedia}>
                Anexar imagens ou vídeos
              </Button>
            </View>

            <Button loading={saving} disabled={saving} onPress={saveRequest}>Salvar alterações do pedido</Button>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Label>{label}</Label>
      <Text selectable style={{ color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: "800" }}>
        {value}
      </Text>
    </View>
  );
}

function RequestFeedback({ message, tone }: { message: string; tone: "success" | "danger" }) {
  const isSuccess = tone === "success";

  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: isSuccess ? "rgba(50,213,131,0.42)" : "rgba(255,117,117,0.42)",
        backgroundColor: isSuccess ? "rgba(50,213,131,0.12)" : "rgba(255,117,117,0.12)",
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 13
      }}
    >
      <Ionicons name={isSuccess ? "checkmark-circle" : "alert-circle"} size={20} color={isSuccess ? colors.success : colors.danger} />
      <Text selectable style={{ color: colors.text, flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "800" }}>
        {message}
      </Text>
    </View>
  );
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

function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function sanitizeLocation(value: string) {
  const trimmed = value.trim();
  const coordinatePattern = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
  return coordinatePattern.test(trimmed) ? "" : trimmed;
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(url);
}

async function uploadRequestMediaAssets(assets: ImagePicker.ImagePickerAsset[], userId: string, requestId: string) {
  const urls: string[] = [];

  for (const [index, asset] of assets.entries()) {
    const response = await fetch(asset.uri);
    const fileData = await response.arrayBuffer();
    const contentType = asset.mimeType || response.headers.get("content-type") || (asset.type === "video" ? "video/mp4" : "image/jpeg");
    const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || (asset.type === "video" ? "mp4" : "jpg");
    const path = `${userId}/${requestId}-${Date.now()}-${index}.${extension}`;
    const { error } = await supabase.storage.from("request-media").upload(path, fileData, { contentType, upsert: true });

    if (error) throw error;
    const { data } = supabase.storage.from("request-media").getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

async function uploadAvatar(uri: string, userId: string, mimeType?: string | null) {
  try {
    const contentType = mimeType || "image/jpeg";
    const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const path = `${userId}/avatar-${Date.now()}.${extension}`;
    const response = await fetch(uri);
    const blob = await response.blob();

    const { error } = await supabase.storage.from("avatars").upload(path, blob, {
      contentType,
      upsert: true
    });

    if (error) {
      return {
        publicUrl: null,
        error: [error.message, "Verifique se o bucket avatars existe no Supabase Storage."].filter(Boolean).join(" ")
      };
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    return { publicUrl: data.publicUrl, error: null };
  } catch (error) {
    return {
      publicUrl: null,
      error: error instanceof Error ?error.message : "Não foi possível enviar a foto."
    };
  }
}

async function reverseGeocodeWeb(latitude: number, longitude: number) {
  try {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "pt"
    });
    const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      city: data.city || data.locality || data.principalSubdivision || "",
      subregion: data.locality || "",
      region: data.principalSubdivision || data.countryName || ""
    };
  } catch (error) {
    console.error("Erro ao buscar cidade pela coordenada", error);
    return null;
  }
}

function getAvatarStoragePath(publicUrl: string) {
  const marker = "/storage/v1/object/public/avatars/";
  const index = publicUrl.indexOf(marker);

  if (index < 0) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(index + marker.length).split("?")[0]);
}

function InfoLine({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.goldSoft,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Ionicons name={icon} size={17} color={colors.gold} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text selectable style={{ color: colors.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase" }}>
          {label}
        </Text>
        <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function StatusMessage({ message }: { message: string }) {
  const isSuccess = message.includes("sucesso");

  return (
    <Card tone={isSuccess ?"gold" : "default"}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Ionicons name={isSuccess ?"checkmark-circle" : "alert-circle"} size={20} color={isSuccess ?colors.success : colors.danger} />
        <Text selectable style={{ flex: 1, color: isSuccess ?colors.success : colors.danger, fontSize: 14, fontWeight: "900", lineHeight: 20 }}>
          {message}
        </Text>
      </View>
    </Card>
  );
}
