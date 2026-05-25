import React from "react";
import { Image } from "expo-image";
import { Text, View } from "react-native";

import { colors } from "@/lib/theme";

export type ServiceRequest = {
  id: string;
  title: string;
  category: string;
  status: string;
  city?: string | null;
  state?: string | null;
  created_at?: string | null;
  media_urls?: string[] | null;
};

export function RequestCard({ request }: { request: ServiceRequest }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const place = [request.city, request.state].filter(Boolean).join(" / ");
  const imageUrl = getPrimaryImageUrl(request.media_urls);
  const showImage = imageUrl && !imageFailed;

  React.useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <View style={{ width: "100%", minHeight: 236, gap: 9 }}>
      <View
        style={{
          width: "100%",
          aspectRatio: 1,
          borderRadius: 10,
          overflow: "hidden",
          backgroundColor: colors.cardElevated,
          borderWidth: 1,
          borderColor: colors.border
        }}
      >
        {showImage ? (
          <Image
            source={{ uri: imageUrl }}
            onError={() => setImageFailed(true)}
            contentFit="cover"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(184,146,74,0.10)",
              padding: 14
            }}
          >
            <Text style={{ color: colors.gold, fontSize: 13, fontWeight: "900", textAlign: "center" }}>
              {request.category}
            </Text>
          </View>
        )}
      </View>

      <View style={{ width: "100%", minHeight: 55, gap: 5 }}>
        <Text selectable numberOfLines={2} style={{ color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: "900", textAlign: "left" }}>
          {request.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <Text selectable numberOfLines={1} style={{ color: colors.muted, flex: 1, fontSize: 11, lineHeight: 15, fontWeight: "800", textAlign: "left" }}>
            {request.category}
          </Text>
          {request.created_at ? (
            <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: "800", textAlign: "right" }}>
              {formatRequestDate(request.created_at)}
            </Text>
          ) : null}
        </View>
        {place ? (
          <Text selectable numberOfLines={1} style={{ color: colors.mutedDark, fontSize: 11, lineHeight: 15, fontWeight: "800", textAlign: "left" }}>
            {place}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function getPrimaryImageUrl(mediaUrls?: string[] | null) {
  if (!mediaUrls?.length) return null;

  return (
    mediaUrls.find((url) => /\.(jpg|jpeg|png|webp|heic|heif)(\?|$)/i.test(url)) ||
    mediaUrls.find((url) => url.includes("/storage/v1/object/") && !/\.(mp4|mov|webm)(\?|$)/i.test(url)) ||
    null
  );
}

function formatRequestDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short"
  })
    .format(new Date(value))
    .replace(".", "");
}
