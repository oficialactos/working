import { CameraView, useCameraPermissions, type CameraMode, type CameraType } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Image } from "expo-image";
import { useNavigation } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Platform, Pressable, Text, TextInput, View } from "react-native";

import { AppScroll, Body, Button, Card, Pill, Screen, SectionTitle } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";
import { colors, useTheme } from "@/lib/theme";

type RequestField = "category" | "title" | "description" | "media";
type ServiceCategory = {
  name: string;
  examples: string[];
};
type MediaAsset = {
  fileName?: string | null;
  mimeType?: string | null;
  type?: "image" | "video" | "livePhoto" | "pairedVideo" | undefined;
  uri: string;
};
type PendingMediaSource = "camera" | "gallery";
type DeviceAddress = {
  addressText: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
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
    field: "media",
    title: "Tem imagens ou vídeos do serviço?",
    helper: "Opcional. Escolha da galeria ou registre agora pelo celular.",
    required: false
  }
];

function SuccessModal({ message, onClose }: { message: string | null; onClose: () => void }) {
  const { mode } = useTheme();
  const isLight = mode === "light";

  return (
    <Modal animationType="fade" transparent visible={Boolean(message)} onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: isLight ? "rgba(25,23,19,0.42)" : "rgba(0,0,0,0.72)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 380,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(50,213,131,0.34)",
            backgroundColor: colors.card,
            gap: 18,
            padding: 22
          }}
        >
          <View style={{ gap: 8 }}>
            <Text selectable style={{ color: colors.success, fontSize: 20, lineHeight: 26, fontWeight: "900" }}>
              Pedido criado
            </Text>
            <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: "800" }}>
              {message}
            </Text>
          </View>
          <Button onPress={onClose}>OK</Button>
        </View>
      </View>
    </Modal>
  );
}

export default function ClientScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [pendingAsset, setPendingAsset] = useState<MediaAsset | null>(null);
  const [pendingSource, setPendingSource] = useState<PendingMediaSource | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const currentQuestion = questions[step];
  const isFinalStep = step === questions.length - 1;

  useEffect(() => {
    navigation.setOptions({ tabBarHidden: cameraOpen });

    return () => {
      navigation.setOptions({ tabBarHidden: false });
    };
  }, [cameraOpen, navigation]);
  const progress = ((step + 1) / questions.length) * 100;
  const firstName = user?.user_metadata?.full_name?.split(" ")?.[0] || "cliente";
  const values: Record<RequestField, string> = useMemo(
    () => ({ category, title, description, media: mediaAssets.map((asset) => asset.uri).join(",") }),
    [category, description, mediaAssets, title]
  );
  const setters: Partial<Record<RequestField, (value: string) => void>> = {
    category: setCategory,
    title: setTitle,
    description: setDescription
  };

  const resetFlow = () => {
    setStep(0);
    setCategory("");
    setTitle("");
    setDescription("");
    setMediaAssets([]);
    setPendingAsset(null);
    setPendingSource(null);
    setCameraOpen(false);
  };

  const addAssets = (assets: ImagePicker.ImagePickerAsset[]) => {
    setMediaAssets((current) => [
      ...current,
      ...assets.map((asset) => ({
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        type: asset.type ?? undefined,
        uri: asset.uri
      }))
    ]);
    setMessage(null);
  };

  const getDeviceAddress = async (): Promise<DeviceAddress> => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permita o acesso à localização para criar o pedido.");
    }

    const position = await Location.getCurrentPositionAsync({});
    let place: Partial<Location.LocationGeocodedAddress> | null = (await Location.reverseGeocodeAsync(position.coords))[0] ?? null;
    if (!place && Platform.OS === "web") {
      place = await reverseGeocodeWeb(position.coords.latitude, position.coords.longitude);
    }

    const fallbackLocation = "Localização atual do dispositivo";

    if (!place) {
      return {
        addressText: fallbackLocation,
        city: null,
        state: null,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    }

    const streetLine = [place.street, place.streetNumber].filter(Boolean).join(", ");
    const district = place.district || place.subregion;
    const city = place.city || place.subregion || null;
    const state = place.region || null;
    const postalCode = place.postalCode;
    const addressText = [streetLine, district, city, state, postalCode].filter(Boolean).join(" - ");

    return {
      addressText: addressText || fallbackLocation,
      city,
      state,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
  };

  const uploadRequestMedia = async (assets = mediaAssets) => {
    if (!user || !assets.length) return [];

    const urls: string[] = [];
    for (const [index, asset] of assets.entries()) {
      const response = await fetch(asset.uri);
      const fileData = await response.arrayBuffer();
      const contentType = asset.mimeType || response.headers.get("content-type") || (asset.type === "video" ? "video/mp4" : "image/jpeg");
      const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") || (asset.type === "video" ? "mp4" : "jpg");
      const path = `${user.id}/${Date.now()}-${index}.${extension}`;
      const { error } = await supabase.storage.from("request-media").upload(path, fileData, { contentType, upsert: true });

      if (error) throw error;
      const { data } = supabase.storage.from("request-media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    return urls;
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Permita acesso à galeria para anexar fotos ou vídeos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
      videoMaxDuration: 60
    });

    if (!result.canceled && result.assets.length > 1) {
      addAssets(result.assets);
      setPendingAsset(null);
      setPendingSource(null);
      return;
    }

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setPendingAsset({
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        type: asset.type ?? undefined,
        uri: asset.uri
      });
      setPendingSource("gallery");
      setMessage(null);
    }
  };

  const captureMedia = () => {
    setCameraOpen(true);
  };

  if (cameraOpen) {
    return (
      <CameraCaptureScreen
        onCancel={() => setCameraOpen(false)}
        onCaptured={(asset) => {
          setPendingAsset(asset);
          setPendingSource("camera");
          setCameraOpen(false);
          setMessage(null);
        }}
      />
    );
  }

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
    let deviceAddress: DeviceAddress;

    try {
      deviceAddress = await getDeviceAddress();
    } catch (error) {
      setSubmitting(false);
      setMessage(error instanceof Error ? error.message : "Não foi possível obter sua localização.");
      return;
    }

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        role: "client",
        full_name: user.user_metadata?.full_name || user.email || "",
        avatar_url: user.user_metadata?.avatar_url || null,
        phone: user.user_metadata?.phone || null,
        city: deviceAddress.city,
        state: deviceAddress.state
      },
      { onConflict: "id" }
    );

    if (profileError) {
      setSubmitting(false);
      console.error("Erro ao sincronizar perfil", profileError);
      setMessage([profileError.message, profileError.details, profileError.hint].filter(Boolean).join(" "));
      return;
    }

    let mediaUrls: string[] = [];
    try {
      const assetsToUpload = pendingAsset ? [...mediaAssets, pendingAsset] : mediaAssets;
      mediaUrls = await uploadRequestMedia(assetsToUpload);
    } catch (error) {
      setSubmitting(false);
      setMessage(error instanceof Error ? error.message : "Não foi possível enviar as mídias do pedido.");
      return;
    }

    const requestPayload = {
      client_id: user.id,
      category: category.trim(),
      title: title.trim(),
      description: description.trim(),
      address_text: deviceAddress.addressText,
      city: deviceAddress.city,
      state: deviceAddress.state,
      media_urls: mediaUrls
    };
    const locationPoint =
      deviceAddress.latitude !== null && deviceAddress.longitude !== null
        ? `POINT(${deviceAddress.longitude} ${deviceAddress.latitude})`
        : null;
    let { error } = await supabase.from("service_requests").insert({
      ...requestPayload,
      location_point:
        locationPoint
    });

    if (error?.code === "PGRST204" && error.message.includes("location_point")) {
      const retry = await supabase.from("service_requests").insert(requestPayload);
      error = retry.error;
    }

    setSubmitting(false);

    if (error) {
      console.error("Erro ao criar pedido", error);
      setMessage([error.message, error.details, error.hint].filter(Boolean).join(" "));
      return;
    }

    resetFlow();
    setSuccessMessage("Pedido criado. Agora os prestadores poderao enviar propostas.");
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
      <SuccessModal message={successMessage} onClose={() => setSuccessMessage(null)} />

      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontSize: 34, lineHeight: 38, fontWeight: "900", letterSpacing: 0 }}>
          Olá, {firstName}!
        </Text>
      </View>

      <View style={{ gap: 16 }}>
        {step > 0 ?(
          <Pressable
            onPress={() => setStep((current) => Math.max(current - 1, 0))}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              opacity: pressed ?0.72 : 1,
              paddingVertical: 2
            })}
          >
            <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "900" }}>← Voltar</Text>
          </Pressable>
        ) : null}

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
              borderColor: message.includes("criado") ?"rgba(50,213,131,0.25)" : "rgba(249,112,102,0.25)",
              backgroundColor: message.includes("criado") ?"rgba(50,213,131,0.10)" : "rgba(249,112,102,0.10)",
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
          {currentQuestion.field !== "media" ?<Body>{currentQuestion.helper}</Body> : null}
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
                </View>
              );
            })}
          </View>
        ) : currentQuestion.field === "media" ?(
          <MediaPickerStep
            assets={mediaAssets}
            onCapture={captureMedia}
            onPick={pickFromGallery}
            onRemove={(uri) => setMediaAssets((current) => current.filter((asset) => asset.uri !== uri))}
            onReplace={pendingSource === "gallery" ?pickFromGallery : captureMedia}
            onUsePending={() => {
              if (!pendingAsset) return;
              setMediaAssets((current) => [...current, pendingAsset]);
              setPendingAsset(null);
              setPendingSource(null);
            }}
            pendingAsset={pendingAsset}
            pendingSource={pendingSource}
          />
        ) : (
          <TextInput
            multiline={currentQuestion.field === "description"}
            onChangeText={setters[currentQuestion.field] ?? (() => {})}
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
          {!currentQuestion.required ?(
            <View style={{ flex: 0.7 }}>
              <Button tone="secondary" onPress={skip}>Pular</Button>
            </View>
          ) : null}
          <View style={{ flex: 1.6 }}>
            <Button loading={submitting} disabled={submitting} onPress={goNext}>
              {isFinalStep ? "Solicitar serviço" : "Próxima"}
            </Button>
          </View>
        </View>
      </View>

      <Card>
        <View style={{ gap: 10 }}>
          <Pill tone="muted">Como funciona</Pill>
          <SectionTitle>Depois de solicitar</SectionTitle>
          <Body>Seu pedido usa sua localização para encontrar prestadores próximos. Quando surgirem propostas, você acompanha tudo em Mensagens.</Body>
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

function CameraCaptureScreen({
  onCancel,
  onCaptured
}: {
  onCancel: () => void;
  onCaptured: (asset: MediaAsset) => void;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [recording, setRecording] = useState(false);
  const [cameraMessage, setCameraMessage] = useState<string | null>(null);
  const canRecordVideo = Platform.OS !== "web";

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ isImageMirror: false, mirror: false, quality: 0.85 });
    if (!photo?.uri) return;

    onCaptured({
      fileName: `foto-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      type: "image",
      uri: photo.uri
    });
  };

  const toggleRecording = async () => {
    if (!canRecordVideo) {
      setCameraMessage("Gravação de vídeo não é suportada no navegador. Abra no Expo Go para gravar vídeos pelo dispositivo.");
      return;
    }

    if (recording) {
      cameraRef.current?.stopRecording();
      return;
    }

    setRecording(true);
    const video = await cameraRef.current?.recordAsync({ maxDuration: 60 });
    setRecording(false);

    if (!video?.uri) return;
    onCaptured({
      fileName: `video-${Date.now()}.mp4`,
      mimeType: "video/mp4",
      type: "video",
      uri: video.uri
    });
  };

  if (!permission?.granted) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", gap: 18, padding: 24 }}>
          <SectionTitle>Permitir câmera</SectionTitle>
          <Body>Precisamos acessar a câmera para tirar fotos ou gravar vídeos do serviço.</Body>
          <Button onPress={requestPermission}>Permitir acesso</Button>
          <Button tone="secondary" onPress={onCancel}>Voltar</Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <CameraView
          ref={cameraRef}
          facing={facing}
          mirror={false}
          mode={mode}
          style={{ flex: 1 }}
          videoQuality="720p"
        />

        <View
          style={{
            position: "absolute",
            top: 18,
            left: 18,
            right: 18,
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12
          }}
        >
          <Pressable onPress={onCancel} style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>Fechar</Text>
          </Pressable>
          <Pressable onPress={() => setFacing((current) => (current === "back" ?"front" : "back"))} style={{ paddingVertical: 10, paddingHorizontal: 4 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>Virar</Text>
          </Pressable>
        </View>

        <View
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 24,
            gap: 16
          }}
        >
          <View
            style={{
              alignSelf: "center",
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.18)",
              backgroundColor: "rgba(0,0,0,0.38)",
              flexDirection: "row",
              padding: 4
            }}
          >
            <Pressable
              onPress={() => setMode("picture")}
              style={{
                borderRadius: 999,
                backgroundColor: mode === "picture" ?colors.gold : "transparent",
                paddingHorizontal: 18,
                paddingVertical: 10
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>Foto</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!canRecordVideo) {
                  setCameraMessage("Gravação de vídeo não é suportada no navegador. Abra no Expo Go para gravar vídeos pelo dispositivo.");
                  return;
                }
                setCameraMessage(null);
                setMode("video");
              }}
              style={{
                borderRadius: 999,
                backgroundColor: mode === "video" ?colors.gold : "transparent",
                opacity: canRecordVideo ?1 : 0.45,
                paddingHorizontal: 18,
                paddingVertical: 10
              }}
            >
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>Video</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={mode === "picture" ?takePhoto : toggleRecording}
            style={({ pressed }) => ({
              alignSelf: "center",
              width: 76,
              height: 76,
              borderRadius: 38,
              borderWidth: 5,
              borderColor: colors.text,
              backgroundColor: mode === "video" && recording ?colors.danger : "rgba(255,255,255,0.22)",
              opacity: pressed ?0.82 : 1
            })}
          />
          {mode === "video" ?(
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: "900", textAlign: "center" }}>
              {recording ?"Gravando... toque para parar" : "Toque para gravar"}
            </Text>
          ) : null}
          {cameraMessage ?(
            <Text selectable style={{ color: colors.gold, fontSize: 12, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>
              {cameraMessage}
            </Text>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

function MediaPickerStep({
  assets,
  onCapture,
  onPick,
  onRemove,
  onReplace,
  onUsePending,
  pendingAsset,
  pendingSource
}: {
  assets: MediaAsset[];
  onCapture: () => void;
  onPick: () => void;
  onRemove: (uri: string) => void;
  onReplace: () => void;
  onUsePending: () => void;
  pendingAsset: MediaAsset | null;
  pendingSource: PendingMediaSource | null;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button tone="secondary" onPress={onPick}>Galeria</Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button tone="secondary" onPress={onCapture}>Camera</Button>
        </View>
      </View>

      {pendingAsset ?(
        <MediaPreview asset={pendingAsset} onReplace={onReplace} onUse={onUsePending} replaceLabel={pendingSource === "gallery" ?"Trocar" : "Refazer"} />
      ) : null}

      {assets.length > 0 ?(
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "900" }}>
            {assets.length} arquivo{assets.length > 1 ?"s" : ""} anexado{assets.length > 1 ?"s" : ""}
          </Text>
          {assets.map((asset, index) => (
            <View
              key={`${asset.uri}-${index}`}
              style={{
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: "rgba(255,255,255,0.035)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: 12
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text selectable style={{ color: colors.text, fontSize: 13, fontWeight: "900" }}>
                  {asset.type === "video" ?"Video" : "Foto"} {index + 1}
                </Text>
                <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 11, fontWeight: "700" }}>
                  {asset.fileName || asset.uri}
                </Text>
              </View>
              <Pressable onPress={() => onRemove(asset.uri)} style={{ padding: 6 }}>
                <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "900" }}>Remover</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <Text selectable style={{ color: "rgba(247,242,232,0.42)", fontSize: 12, lineHeight: 18, fontWeight: "800" }}>
          Adicione fotos ou vídeos se quiser mostrar melhor o problema. Você também pode pular esta etapa.
        </Text>
      )}
    </View>
  );
}

async function reverseGeocodeWeb(latitude: number, longitude: number): Promise<Partial<Location.LocationGeocodedAddress> | null> {
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
      city: data.city || data.locality || data.principalSubdivision || null,
      district: data.locality || null,
      region: data.principalSubdivision || data.countryName || null,
      street: null,
      streetNumber: null,
      postalCode: data.postcode || null,
      subregion: data.locality || null
    };
  } catch (error) {
    console.error("Erro ao buscar endereço pela localização", error);
    return null;
  }
}

function MediaPreview({
  asset,
  onReplace,
  onUse,
  replaceLabel
}: {
  asset: MediaAsset;
  onReplace: () => void;
  onUse: () => void;
  replaceLabel: string;
}) {
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "rgba(184,146,74,0.32)",
        backgroundColor: "rgba(255,255,255,0.035)",
        gap: 12,
        overflow: "hidden",
        padding: 12
      }}
    >
      <Text selectable style={{ color: colors.gold, fontSize: 12, fontWeight: "900", textTransform: "uppercase" }}>
        Pre-visualizacao
      </Text>
      {asset.type === "video" ?(
        <VideoPreview uri={asset.uri} />
      ) : (
        <Image
          source={{ uri: asset.uri }}
          style={{
            width: "100%",
            aspectRatio: 1.25,
            borderRadius: 8,
            backgroundColor: colors.input
          }}
          contentFit="cover"
        />
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button tone="secondary" onPress={onReplace}>{replaceLabel}</Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button onPress={onUse}>Usar</Button>
        </View>
      </View>
    </View>
  );
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = true;
  });

  return (
    <VideoView
      allowsFullscreen
      contentFit="cover"
      nativeControls
      player={player}
      style={{
        width: "100%",
        aspectRatio: 1.25,
        borderRadius: 8,
        backgroundColor: colors.input
      }}
    />
  );
}
