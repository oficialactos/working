import { Image } from "expo-image";
import { CameraView, useCameraPermissions, type CameraMode, type CameraType } from "expo-camera";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as SecureStore from "expo-secure-store";
import * as Sharing from "expo-sharing";
import { useNavigation } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  Ban,
  Camera,
  CameraIcon,
  Check,
  Copy,
  Download,
  FileText,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Mic,
  MoreVertical,
  Pause,
  Phone,
  Play,
  Plus,
  Search,
  Send,
  Star,
  SwitchCamera,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  X,
  Zap,
  ZapOff
} from "lucide-react-native";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent
} from "react-native";

import { Body, EmptyState, Screen } from "@/components/ui";
import { useAuth } from "@/context/auth";
import { supabase } from "@/lib/supabase";
import { colors, radius, useTheme } from "@/lib/theme";

type LucideIcon = React.ComponentType<{
  color?: string;
  fill?: string;
  size?: number | string;
  strokeWidth?: number;
}>;

const CHAT_MEDIA_PREFIX = "__chat_media__:";
const REMOTE_USER_BLOCKS_ENABLED = process.env.EXPO_PUBLIC_ENABLE_REMOTE_USER_BLOCKS === "true";

type WebAudioRecordingState = {
  audioContext: AudioContext;
  chunks: Float32Array[];
  processor: ScriptProcessorNode;
  sampleRate: number;
  source: MediaStreamAudioSourceNode;
  startedAt: number;
  pauseStartedAt: number | null;
  pausedMillis: number;
  stream: MediaStream;
  timer: ReturnType<typeof setInterval>;
};

type ProfileSummary = {
  avatar_url?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

type Chat = {
  id: string;
  client_id: string;
  provider_id: string;
  request_id: string;
  created_at: string;
  client?: ProfileSummary | null;
  provider?: ProfileSummary | null;
  request?: { title?: string | null } | null;
};

type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read?: boolean | null;
};

type ChatMediaAsset = {
  fileName?: string | null;
  mimeType?: string | null;
  type?: "image" | "video" | "audio" | "document" | "livePhoto" | "pairedVideo" | null | undefined;
  uri: string;
};

type ChatMediaType = "audio" | "document" | "image" | "video";

type ContactProfile = ProfileSummary & {
  city?: string | null;
  phone?: string | null;
  role?: string | null;
  serviceCount: number;
  state?: string | null;
  categories: string[];
  reviewAverage: number | null;
  reviewCount: number;
};

type ChatRowAction = {
  chatId: string;
  x: number;
  y: number;
};

type ImagePreview = {
  name?: string | null;
  url: string;
};

type SaveRemoteAssetInput = {
  fileName?: string | null;
  type: "document" | "image";
  url: string;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const navigation = useNavigation() as { setOptions: (options: { tabBarHidden?: boolean }) => void };
  const { mode } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isLight = mode === "light";
  const [keyboardInset, setKeyboardInset] = useState(0);
  const maxViewportHeightRef = useRef(0);
  const messagesScrollRef = useRef<ScrollView>(null);
  const ignoreNextChatPressRef = useRef(false);
  const webAudioRecordingRef = useRef<WebAudioRecordingState | null>(null);
  const webAudioPausedRef = useRef(false);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder, 250);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCountByChatId, setUnreadCountByChatId] = useState<Record<string, number>>({});
  const [chatSelectionMode, setChatSelectionMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState("");
  const [pendingMedia, setPendingMedia] = useState<ChatMediaAsset | null>(null);
  const [attachmentOptionsOpen, setAttachmentOptionsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [chatListOptionsOpen, setChatListOptionsOpen] = useState(false);
  const [chatOptionsOpen, setChatOptionsOpen] = useState(false);
  const [chatRowAction, setChatRowAction] = useState<ChatRowAction | null>(null);
  const [hiddenChatIds, setHiddenChatIds] = useState<Set<string>>(() => new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(() => new Set());
  const [blockedByUserIds, setBlockedByUserIds] = useState<Set<string>>(() => new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchTextByChatId, setMessageSearchTextByChatId] = useState<Record<string, string>>({});
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [contactProfile, setContactProfile] = useState<ContactProfile | null>(null);
  const [imagePreview, setImagePreview] = useState<ImagePreview | null>(null);
  const [selectedMessageAction, setSelectedMessageAction] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editingText, setEditingText] = useState("");
  const [messageActionError, setMessageActionError] = useState<string | null>(null);
  const [audioRecordingActive, setAudioRecordingActive] = useState(false);
  const [audioRecordingPaused, setAudioRecordingPaused] = useState(false);
  const [audioRecordingError, setAudioRecordingError] = useState<string | null>(null);
  const [documentUploadProgress, setDocumentUploadProgress] = useState<number | null>(null);
  const [webAudioRecordingDurationMillis, setWebAudioRecordingDurationMillis] = useState(0);
  const [sending, setSending] = useState(false);

  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedChatId) || null, [chats, selectedChatId]);
  const selectedContact = selectedChat && user ? getContact(selectedChat, user.id) : null;
  const selectedContactId = selectedChat && user ? getContactId(selectedChat, user.id) : null;
  const selectedContactBlockedByMe = Boolean(selectedContactId && blockedUserIds.has(selectedContactId));
  const selectedContactBlockedMe = Boolean(selectedContactId && blockedByUserIds.has(selectedContactId));
  const selectedChatBlocked = selectedContactBlockedByMe || selectedContactBlockedMe;
  const visibleChats = useMemo(() => chats.filter((chat) => !hiddenChatIds.has(chat.id)), [chats, hiddenChatIds]);
  const filteredChats = useMemo(() => {
    const query = normalizeSearch(searchQuery);
    if (!query || !user) return visibleChats;

    return visibleChats.filter((chat) => {
      const contact = getContact(chat, user.id);
      return normalizeSearch(`${contact?.full_name || ""} ${chat.request?.title || ""} ${messageSearchTextByChatId[chat.id] || ""}`).includes(query);
    });
  }, [messageSearchTextByChatId, searchQuery, user, visibleChats]);
  const showConversation = isDesktop || Boolean(selectedChat);
  const isConversationFullscreen = !isDesktop && Boolean(selectedChat);
  const useFixedMobileComposer = !isDesktop && isConversationFullscreen;
  const composerKeyboardInset = useFixedMobileComposer ? keyboardInset : 0;
  const mobileComposerHeight = 76;
  const messagesBottomPadding = useFixedMobileComposer
    ? mobileComposerHeight + (composerKeyboardInset > 0 ? 58 : 24)
    : 16;
  const audioRecordingDurationMillis = Platform.OS === "web" ? webAudioRecordingDurationMillis : recorderState.durationMillis;

  const updateMobileKeyboardInset = (useFallback: boolean) => {
    if (Platform.OS !== "web" || isDesktop || typeof window === "undefined") {
      setKeyboardInset(0);
      return;
    }

    const virtualKeyboard = (navigator as any).virtualKeyboard;
    const virtualKeyboardHeight = Math.round(virtualKeyboard?.boundingRect?.height || 0);
    if (virtualKeyboardHeight > 24) {
      setKeyboardInset(virtualKeyboardHeight);
      return;
    }

    const viewport = window.visualViewport;
    const currentHeight = viewport?.height || window.innerHeight;
    maxViewportHeightRef.current = Math.max(maxViewportHeightRef.current || 0, window.innerHeight, currentHeight);
    let inset = Math.max(0, maxViewportHeightRef.current - currentHeight - (viewport?.offsetTop || 0));

    if (useFallback && inset <= 24) {
      inset = Math.min(340, Math.max(220, Math.round(window.innerHeight * 0.42)));
    }

    setKeyboardInset(inset > 24 ? inset : 0);
  };

  useEffect(() => {
    navigation.setOptions({ tabBarHidden: isConversationFullscreen });

    return () => {
      navigation.setOptions({ tabBarHidden: false });
    };
  }, [isConversationFullscreen, navigation]);

  useEffect(() => {
    if (Platform.OS !== "web" || isDesktop || typeof window === "undefined") {
      return;
    }

    const updateKeyboardInset = () => updateMobileKeyboardInset(false);

    const virtualKeyboard = (navigator as any).virtualKeyboard;
    if (virtualKeyboard) {
      virtualKeyboard.overlaysContent = true;
      virtualKeyboard.addEventListener("geometrychange", updateKeyboardInset);
    }

    updateKeyboardInset();
    window.visualViewport?.addEventListener("resize", updateKeyboardInset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardInset);
    window.addEventListener("resize", updateKeyboardInset);

    return () => {
      virtualKeyboard?.removeEventListener("geometrychange", updateKeyboardInset);
      window.visualViewport?.removeEventListener("resize", updateKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardInset);
      window.removeEventListener("resize", updateKeyboardInset);
    };
  }, [isDesktop]);

  useEffect(() => {
    if (Platform.OS === "web" || isDesktop) return;

    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardInset(Math.max(0, Math.round(event.endCoordinates.height)));
    });
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [isDesktop]);

  useEffect(() => {
    if (!user) return;

    const loadChats = async () => {
      setLoadingChats(true);
      const { data } = await supabase
        .from("chats")
        .select("id,client_id,provider_id,request_id,created_at,request:service_requests(title),client:profiles!chats_client_id_fkey(full_name,avatar_url,phone),provider:profiles!chats_provider_id_fkey(full_name,avatar_url,phone)")
        .or(`client_id.eq.${user.id},provider_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(30);

      const nextChats = (data || []) as Chat[];
      setChats(nextChats);
      setSelectedChatId((current) => current || (isDesktop ? nextChats[0]?.id || null : null));
      setLoadingChats(false);
    };

    loadChats();
  }, [isDesktop, user]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadHiddenChats = async () => {
      const nextHiddenChatIds = await getLocalHiddenChatIds(user.id);
      if (active) setHiddenChatIds(nextHiddenChatIds);
    };

    loadHiddenChats();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChatId || !hiddenChatIds.has(selectedChatId)) return;

    setSelectedChatId(isDesktop ? visibleChats[0]?.id || null : null);
  }, [hiddenChatIds, isDesktop, selectedChatId, visibleChats]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    const loadBlocks = async () => {
      const nextBlocked = await getLocalBlockedUserIds(user.id);
      const nextBlockedBy = new Set<string>();

      if (REMOTE_USER_BLOCKS_ENABLED) {
        const { data } = await supabase
          .from("user_blocks")
          .select("blocker_id,blocked_id")
          .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

        for (const row of data || []) {
          if (row.blocker_id === user.id) nextBlocked.add(String(row.blocked_id));
          if (row.blocked_id === user.id) nextBlockedBy.add(String(row.blocker_id));
        }
      }

      if (!active) return;

      setBlockedUserIds(nextBlocked);
      setBlockedByUserIds(nextBlockedBy);
    };

    loadBlocks();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from("messages")
        .select("id,chat_id,sender_id,content,created_at")
        .eq("chat_id", selectedChatId)
        .order("created_at", { ascending: true });

      const nextMessages = (data || []) as Message[];
      setMessages(nextMessages);
      setLoadingMessages(false);

      if (user) {
        const latestMessage = nextMessages[nextMessages.length - 1];
        await setChatReadAt(user.id, selectedChatId, latestMessage?.created_at || new Date().toISOString());
        setUnreadCountByChatId((current) => ({ ...current, [selectedChatId]: 0 }));
      }
    };

    loadMessages();
  }, [selectedChatId, user?.id]);

  useEffect(() => {
    setChatOptionsOpen(false);
    setChatRowAction(null);
    setChatListOptionsOpen(false);
    setChatSelectionMode(false);
    setSelectedChatIds(new Set());
  }, [selectedChatId]);

  useEffect(() => {
    if (!selectedChatId) return;

    const timeout = setTimeout(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [messages.length, keyboardInset, selectedChatId]);

  useEffect(() => {
    const chatIds = chats.map((chat) => chat.id);
    if (!chatIds.length || !user) {
      setMessageSearchTextByChatId({});
      setUnreadCountByChatId({});
      return;
    }

    let active = true;

    const loadMessageSearchText = async () => {
      const { data } = await supabase.from("messages").select("chat_id,content,sender_id,created_at").in("chat_id", chatIds);
      if (!active) return;

      const nextTextByChatId: Record<string, string> = {};
      const nextUnreadCounts: Record<string, number> = {};
      const readAtByChatId = await getChatReadAtMap(user.id);

      for (const message of data || []) {
        const chatId = String(message.chat_id);
        nextTextByChatId[chatId] = `${nextTextByChatId[chatId] || ""} ${message.content || ""}`;

        const readAt = readAtByChatId[chatId];
        const isUnread =
          message.sender_id !== user.id &&
          (!readAt || new Date(String(message.created_at)).getTime() > new Date(readAt).getTime());

        if (isUnread) {
          nextUnreadCounts[chatId] = (nextUnreadCounts[chatId] || 0) + 1;
        }
      }

      setMessageSearchTextByChatId(nextTextByChatId);
      setUnreadCountByChatId(nextUnreadCounts);
    };

    loadMessageSearchText();

    return () => {
      active = false;
    };
  }, [chats, user?.id]);

  const sendMessage = async (mediaOverride?: ChatMediaAsset | null, textOverride?: string) => {
    const media = mediaOverride === undefined ? pendingMedia : mediaOverride;
    const content = textOverride === undefined ? draft.trim() : textOverride.trim();
    if ((!content && !media) || !selectedChat || !user || sending) return;
    if (selectedChatBlocked) return;

    const isDocumentUpload = media?.type === "document";
    setSending(true);
    if (isDocumentUpload) setDocumentUploadProgress(0.08);
    let messageContent = content;

    try {
      if (media) {
        const mediaUrl = await uploadChatMediaAsset(media, user.id, selectedChat.id, isDocumentUpload ? setDocumentUploadProgress : undefined);
        messageContent = formatMediaMessage({
          text: content,
          type: getChatMediaType(media),
          name: media.fileName || null,
          url: mediaUrl
        });
      }
    } catch (error) {
      setSending(false);
      if (isDocumentUpload) setDocumentUploadProgress(null);
      if (media?.type === "audio") {
        const message = error instanceof Error && error.message ? error.message : "Storage recusou o arquivo de áudio.";
        setAudioRecordingError(`Não foi possível enviar o áudio. ${message}`);
      }
      return;
    }

    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: selectedChat.id,
        sender_id: user.id,
        content: messageContent
      })
      .select("id,chat_id,sender_id,content,created_at")
      .single();

    setSending(false);
    if (error) {
      if (isDocumentUpload) setDocumentUploadProgress(null);
      return;
    }

    setDraft("");
    setPendingMedia(null);
    if (isDocumentUpload) setDocumentUploadProgress(null);
    if (data) {
      setMessages((current) => [...current, data as Message]);
    }
  };

  const startAudioRecording = async () => {
    if (audioRecordingActive || sending) return;

    setAudioRecordingError(null);

    if (Platform.OS === "web") {
      await startWebAudioRecording();
      return;
    }

    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        setAudioRecordingError("Permita o acesso ao microfone para gravar áudio.");
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true, shouldRouteThroughEarpiece: false });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setAudioRecordingActive(true);
      setAudioRecordingPaused(false);
    } catch {
      setAudioRecordingError("Não foi possível iniciar a gravação.");
      setAudioRecordingActive(false);
      setAudioRecordingPaused(false);
    }
  };

  const startWebAudioRecording = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAudioRecordingError("Seu navegador não permite gravar áudio.");
      return;
    }

    try {
      webAudioGlobalPaused = false;
      webAudioPausedRef.current = false;
      setWebAudioRecordingDurationMillis(0);
      const recording = await createWebAudioRecorder(setWebAudioRecordingDurationMillis);
      webAudioRecordingRef.current = recording;
      setAudioRecordingActive(true);
      setAudioRecordingPaused(false);
    } catch {
      setAudioRecordingError("Não foi possível iniciar a gravação.");
      setAudioRecordingActive(false);
      setAudioRecordingPaused(false);
      setWebAudioRecordingDurationMillis(0);
    }
  };

  const stopWebAudioRecording = async (createAsset: boolean): Promise<ChatMediaAsset | null> => {
    const recording = webAudioRecordingRef.current;
    webAudioRecordingRef.current = null;
    webAudioGlobalPaused = false;
    webAudioPausedRef.current = false;

    if (!recording) return null;

    clearInterval(recording.timer);
    recording.processor.disconnect();
    recording.source.disconnect();
    recording.stream.getTracks().forEach((track) => track.stop());
    await recording.audioContext.close();

    if (!createAsset || !recording.chunks.length) return null;

    const wavBlob = encodeWavBlob(recording.chunks, recording.sampleRate);
    return {
      fileName: `audio-${Date.now()}.wav`,
      mimeType: "audio/wav",
      type: "audio",
      uri: URL.createObjectURL(wavBlob)
    };
  };

  const pauseAudioRecording = () => {
    if (!audioRecordingActive || audioRecordingPaused) return;
    if (Platform.OS === "web") {
      const recording = webAudioRecordingRef.current;
      if (!recording) return;
      webAudioGlobalPaused = true;
      webAudioPausedRef.current = true;
      recording.pauseStartedAt = Date.now();
      setAudioRecordingPaused(true);
      return;
    }
    audioRecorder.pause();
    setAudioRecordingPaused(true);
  };

  const resumeAudioRecording = () => {
    if (!audioRecordingActive || !audioRecordingPaused) return;
    if (Platform.OS === "web") {
      const recording = webAudioRecordingRef.current;
      if (!recording) return;
      if (recording.pauseStartedAt) {
        recording.pausedMillis += Date.now() - recording.pauseStartedAt;
      }
      recording.pauseStartedAt = null;
      webAudioGlobalPaused = false;
      webAudioPausedRef.current = false;
      setAudioRecordingPaused(false);
      return;
    }
    audioRecorder.record();
    setAudioRecordingPaused(false);
  };

  const cancelAudioRecording = async () => {
    if (Platform.OS === "web") {
      await stopWebAudioRecording(false);
      setAudioRecordingActive(false);
      setAudioRecordingPaused(false);
      setAudioRecordingError(null);
      setWebAudioRecordingDurationMillis(0);
      return;
    }

    try {
      if (audioRecordingActive) {
        await audioRecorder.stop();
      }
    } catch {
      // The recorder may already be stopped by the native layer.
    }
    setAudioRecordingActive(false);
    setAudioRecordingPaused(false);
    setAudioRecordingError(null);
    await configurePlaybackAudioMode();
  };

  const sendAudioRecording = async () => {
    if (!audioRecordingActive || sending) return;

    try {
      if (Platform.OS === "web") {
        const asset = await stopWebAudioRecording(true);
        setAudioRecordingActive(false);
        setAudioRecordingPaused(false);
        setWebAudioRecordingDurationMillis(0);

        if (!asset) {
          setAudioRecordingError("Não foi possível encontrar o áudio gravado.");
          return;
        }

        await sendMessage(asset, "");
        return;
      }

      await audioRecorder.stop();
      await configurePlaybackAudioMode();
      const uri = audioRecorder.uri || recorderState.url;
      setAudioRecordingActive(false);
      setAudioRecordingPaused(false);

      if (!uri) {
        setAudioRecordingError("Não foi possível encontrar o áudio gravado.");
        return;
      }

      await sendMessage(
        {
          fileName: `audio-${Date.now()}.${getRecordedAudioExtension(uri)}`,
          mimeType: getRecordedAudioMimeType(uri),
          type: "audio",
          uri
        },
        ""
      );
    } catch (error) {
      const message = error instanceof Error && error.message ? ` ${error.message}` : "";
      setAudioRecordingError(`Não foi possível enviar o áudio.${message}`);
    }
  };

  const openMessageActions = (message: Message) => {
    const canModify = message.sender_id === user?.id;
    const canCopy = Boolean(getCopyableMessageText(message.content));
    if (!canModify && !canCopy) return;

    setMessageActionError(null);
    setSelectedMessageAction((current) => (current?.id === message.id ? null : message));
  };

  const openImagePreview = (image: ImagePreview) => {
    setSelectedMessageAction(null);
    setImagePreview(image);
  };

  const copySelectedMessage = async () => {
    if (!selectedMessageAction) return;

    const text = getCopyableMessageText(selectedMessageAction.content);
    if (!text) return;

    try {
      await copyTextToClipboard(text);
      setMessageActionError(null);
      setSelectedMessageAction(null);
    } catch {
      setMessageActionError("Não foi possível copiar a mensagem.");
    }
  };

  const selectChat = (chatId: string) => {
    if (user) {
      setChatReadAt(user.id, chatId, new Date().toISOString());
      setUnreadCountByChatId((current) => ({ ...current, [chatId]: 0 }));
    }
    setChatListOptionsOpen(false);
    setSelectedChatId(chatId);
  };

  const toggleChatListOptions = () => {
    setChatListOptionsOpen((current) => !current);
    setChatOptionsOpen(false);
    setChatRowAction(null);
    setSelectedMessageAction(null);
  };

  const startChatSelection = () => {
    setChatSelectionMode(true);
    setSelectedChatIds(new Set());
    setChatListOptionsOpen(false);
  };

  const cancelChatSelection = () => {
    setChatSelectionMode(false);
    setSelectedChatIds(new Set());
  };

  const toggleSelectedChat = (chatId: string) => {
    setSelectedChatIds((current) => {
      const next = new Set(current);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  };

  const markChatIdsUnread = async (chatIds: string[]) => {
    if (!user || !chatIds.length) return;
    const uniqueChatIds = Array.from(new Set(chatIds));

    const { data } = await supabase
      .from("messages")
      .select("chat_id,sender_id,created_at")
      .in("chat_id", uniqueChatIds)
      .order("created_at", { ascending: true });

    const nextUnreadCounts: Record<string, number> = {};
    const readAtByChatId: Record<string, string> = {};

    for (const message of data || []) {
      if (message.sender_id === user.id) continue;

      const chatId = String(message.chat_id);
      nextUnreadCounts[chatId] = (nextUnreadCounts[chatId] || 0) + 1;
      if (!readAtByChatId[chatId]) {
        readAtByChatId[chatId] = new Date(new Date(String(message.created_at)).getTime() - 1).toISOString();
      }
    }

    await Promise.all(uniqueChatIds.map((chatId) => setChatReadAt(user.id, chatId, readAtByChatId[chatId] || "1970-01-01T00:00:00.000Z")));
    setUnreadCountByChatId((current) => {
      const next = { ...current };
      uniqueChatIds.forEach((chatId) => {
        next[chatId] = nextUnreadCounts[chatId] || 1;
      });
      return next;
    });
  };

  const markAllVisibleChatsUnread = async () => {
    await markChatIdsUnread(visibleChats.map((chat) => chat.id));
    setChatListOptionsOpen(false);
  };

  const markSelectedChatsUnread = async () => {
    const chatIds = Array.from(selectedChatIds);
    if (!chatIds.length) return;

    await markChatIdsUnread(chatIds);
    cancelChatSelection();
  };

  const hideSelectedChats = async () => {
    if (!user || !selectedChatIds.size) return;

    const chatIds = Array.from(selectedChatIds);
    const nextHiddenChatIds = new Set(hiddenChatIds);
    chatIds.forEach((chatId) => nextHiddenChatIds.add(chatId));

    await setLocalHiddenChatIds(user.id, nextHiddenChatIds);
    setHiddenChatIds(nextHiddenChatIds);
    setUnreadCountByChatId((current) => {
      const next = { ...current };
      chatIds.forEach((chatId) => {
        delete next[chatId];
      });
      return next;
    });
    setChatRowAction(null);

    if (selectedChatId && nextHiddenChatIds.has(selectedChatId)) {
      const nextVisibleChat = chats.find((chat) => !nextHiddenChatIds.has(chat.id));
      setSelectedChatId(isDesktop ? nextVisibleChat?.id || null : null);
    }

    cancelChatSelection();
  };

  const openChatRowActions = (chatId: string, event: GestureResponderEvent | any) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    ignoreNextChatPressRef.current = true;
    const nativeEvent = event?.nativeEvent || event || {};
    const rawX = Number(nativeEvent.pageX ?? nativeEvent.clientX ?? nativeEvent.locationX ?? 24);
    const rawY = Number(nativeEvent.pageY ?? nativeEvent.clientY ?? nativeEvent.locationY ?? 160);
    const menuWidth = 230;
    const menuHeight = 112;
    const viewportHeight = Platform.OS === "web" && typeof window !== "undefined" ? window.innerHeight : 760;
    const x = Math.max(12, Math.min(width - menuWidth - 12, rawX));
    const y = Math.max(72, Math.min(viewportHeight - menuHeight - 12, rawY));

    setSelectedMessageAction(null);
    setChatOptionsOpen(false);
    setChatRowAction({ chatId, x, y });
    setTimeout(() => {
      ignoreNextChatPressRef.current = false;
    }, 600);
  };

  const markChatUnread = async (chatId: string) => {
    await markChatIdsUnread([chatId]);
    setChatRowAction(null);
  };

  const hideChat = async (chatId: string) => {
    if (!user) return;

    const nextHiddenChatIds = new Set(hiddenChatIds);
    nextHiddenChatIds.add(chatId);
    await setLocalHiddenChatIds(user.id, nextHiddenChatIds);
    setHiddenChatIds(nextHiddenChatIds);
    setUnreadCountByChatId((current) => {
      const next = { ...current };
      delete next[chatId];
      return next;
    });
    setChatRowAction(null);

    if (selectedChatId === chatId) {
      const nextVisibleChat = chats.find((chat) => chat.id !== chatId && !nextHiddenChatIds.has(chat.id));
      setSelectedChatId(isDesktop ? nextVisibleChat?.id || null : null);
    }
  };

  const startEditMessage = () => {
    if (!selectedMessageAction) return;
    setEditingMessage(selectedMessageAction);
    setEditingText(getEditableMessageText(selectedMessageAction.content));
    setSelectedMessageAction(null);
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !user) return;
    const nextText = editingText.trim();
    const media = parseMediaMessage(editingMessage.content);

    if (!nextText && !media) return;

    const nextContent = media
      ? formatMediaMessage({ name: media.name, text: nextText, type: media.type, url: media.url })
      : nextText;

    const { error } = await supabase
      .from("messages")
      .update({ content: nextContent })
      .eq("id", editingMessage.id)
      .eq("sender_id", user.id);

    if (error) {
      setMessageActionError("Não foi possível editar a mensagem.");
      return;
    }

    setMessages((current) => current.map((message) => (message.id === editingMessage.id ? { ...message, content: nextContent } : message)));
    setEditingMessage(null);
    setEditingText("");
  };

  const deleteSelectedMessage = async () => {
    if (!selectedMessageAction || !user) return;
    const messageToDelete = selectedMessageAction;
    const media = parseMediaMessage(messageToDelete.content);

    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageToDelete.id)
      .eq("sender_id", user.id);

    if (error) {
      setMessageActionError("Não foi possível apagar a mensagem.");
      return;
    }

    if (media?.type === "document") {
      await removeChatMediaAsset(media.url);
    }

    setMessages((current) => current.filter((message) => message.id !== messageToDelete.id));
    setSelectedMessageAction(null);
  };

  const openContactProfile = async () => {
    if (!selectedContactId || profileLoading) return;

    setProfileModalOpen(true);
    setProfileLoading(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name,avatar_url,phone,city,state,role,rating_avg,rating_count")
      .eq("id", selectedContactId)
      .maybeSingle();

    const role = profile?.role || (selectedChat?.provider_id === selectedContactId ? "provider" : "client");
    const countSource =
      role === "provider"
        ? supabase.from("proposals").select("id", { count: "exact", head: true }).eq("provider_id", selectedContactId).eq("status", "accepted")
        : supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("client_id", selectedContactId);

    const [{ count: serviceCount }, { data: providerData }] = await Promise.all([
      countSource,
      role === "provider" ? supabase.from("provider_profiles").select("categories").eq("id", selectedContactId).maybeSingle() : Promise.resolve({ data: null })
    ]);

    const profileRatingCount = Number(profile?.rating_count || 0);
    const profileRatingAverage = Number(profile?.rating_avg || 0);

    setContactProfile({
      avatar_url: profile?.avatar_url || selectedContact?.avatar_url || null,
      categories: Array.isArray(providerData?.categories) ? providerData.categories : [],
      city: profile?.city || null,
      full_name: profile?.full_name || selectedContact?.full_name || "Contato",
      phone: profile?.phone || null,
      reviewAverage: profileRatingCount > 0 && !Number.isNaN(profileRatingAverage) ? profileRatingAverage : null,
      reviewCount: profileRatingCount,
      role,
      serviceCount: serviceCount || 0,
      state: profile?.state || null
    });
    setProfileLoading(false);
  };

  const callSelectedContact = () => {
    if (selectedChatBlocked) return;

    const phone = selectedContact?.phone?.replace(/\D/g, "");
    if (!phone) return;

    Linking.openURL(`tel:${phone}`);
  };

  const blockSelectedContact = async () => {
    if (!user || !selectedContactId) return;

    await setLocalBlockedUserIds(user.id, new Set(blockedUserIds).add(selectedContactId));

    if (REMOTE_USER_BLOCKS_ENABLED) {
      await supabase
        .from("user_blocks")
        .upsert({ blocker_id: user.id, blocked_id: selectedContactId }, { onConflict: "blocker_id,blocked_id" });
    }

    setBlockedUserIds((current) => new Set(current).add(selectedContactId));
    setChatOptionsOpen(false);
  };

  const unblockSelectedContact = async () => {
    if (!user || !selectedContactId) return;

    const nextBlockedUserIds = new Set(blockedUserIds);
    nextBlockedUserIds.delete(selectedContactId);
    await setLocalBlockedUserIds(user.id, nextBlockedUserIds);

    if (REMOTE_USER_BLOCKS_ENABLED) {
      await supabase
        .from("user_blocks")
        .delete()
        .eq("blocker_id", user.id)
        .eq("blocked_id", selectedContactId);
    }

    setBlockedUserIds(nextBlockedUserIds);
    setChatOptionsOpen(false);
  };

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          paddingLeft: isConversationFullscreen ? 0 : isDesktop ? 168 : 18,
          paddingRight: isConversationFullscreen ? 0 : isDesktop ? 28 : 18,
          paddingTop: isConversationFullscreen ? 42 : isDesktop ? 28 : 58,
          paddingBottom: isConversationFullscreen ? 0 : isDesktop ? 28 : 96,
          gap: isConversationFullscreen ? 0 : 18
        }}
      >
        {!isConversationFullscreen ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
            <Text selectable style={{ color: colors.gold, fontSize: isDesktop ? 34 : 30, lineHeight: isDesktop ? 40 : 35, fontWeight: "900" }}>
              Conversas
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <IconButton icon={MoreVertical} onPress={toggleChatListOptions} />
            </View>
          </View>
          <Text selectable style={{ color: colors.muted, fontSize: 15, lineHeight: 22, fontWeight: "800" }}>
            Combine detalhes do atendimento com segurança.
          </Text>
        </View>
        ) : null}

        {loadingChats ? (
          <View style={{ minHeight: 220, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : null}

        {!loadingChats && visibleChats.length === 0 ? (
          <EmptyState title="Nenhuma conversa ativa" description="As mensagens aparecem aqui quando houver contato com outro usuário." />
        ) : null}

        {visibleChats.length ? (
          <View style={{ flex: 1, flexDirection: isDesktop ? "row" : "column", gap: 16, minHeight: 0 }}>
            {isDesktop || !selectedChat ? (
              <View
                style={{
                  width: isDesktop ? 350 : "100%",
                  borderRadius: isDesktop ? radius.lg : 0,
                  borderWidth: isDesktop ? 1 : 0,
                  borderColor: colors.border,
                  backgroundColor: isDesktop ? colors.card : "transparent",
                  overflow: "hidden"
                }}
              >
                <View style={{ padding: isDesktop ? 16 : 0, gap: 14 }}>
                  <SearchInput value={searchQuery} onChangeText={setSearchQuery} />
                  {chatSelectionMode ? (
                    <View
                      style={{
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        gap: 10,
                        padding: 12
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <Text style={{ color: colors.text, flex: 1, fontSize: 12, fontWeight: "900" }}>
                          {selectedChatIds.size ? `${selectedChatIds.size} selecionada${selectedChatIds.size > 1 ? "s" : ""}` : "Selecionando conversas"}
                        </Text>
                        <Pressable onPress={cancelChatSelection} style={{ padding: 4 }}>
                          <Text style={{ color: colors.gold, fontSize: 12, fontWeight: "900" }}>Cancelar</Text>
                        </Pressable>
                      </View>
                      <View style={{ alignItems: "stretch", flexDirection: isDesktop ? "row" : "column", gap: 8 }}>
                        <ChatSelectionAction
                          disabled={!selectedChatIds.size}
                          horizontal={isDesktop}
                          icon={MessageCircle}
                          label="Marcar como não lidas"
                          onPress={markSelectedChatsUnread}
                        />
                        <ChatSelectionAction
                          danger
                          disabled={!selectedChatIds.size}
                          horizontal={isDesktop}
                          icon={Trash2}
                          label="Apagar selecionadas"
                          onPress={hideSelectedChats}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>

                <ScrollView contentContainerStyle={{ paddingHorizontal: isDesktop ? 10 : 0, paddingBottom: 10, gap: 4 }}>
                  {filteredChats.map((chat) => (
                    <ChatRow
                      key={chat.id}
                      active={chat.id === selectedChatId}
                      chat={chat}
                      currentUserId={user?.id || ""}
                      selected={selectedChatIds.has(chat.id)}
                      selectionMode={chatSelectionMode}
                      unreadCount={unreadCountByChatId[chat.id] || 0}
                      onPress={() => {
                        if (chatSelectionMode) {
                          toggleSelectedChat(chat.id);
                          return;
                        }
                        if (ignoreNextChatPressRef.current) {
                          ignoreNextChatPressRef.current = false;
                          return;
                        }
                        selectChat(chat.id);
                      }}
                      onOpenActions={(event) => openChatRowActions(chat.id, event)}
                    />
                  ))}
                  {filteredChats.length === 0 ? (
                    <View style={{ padding: 18, alignItems: "center" }}>
                      <Body>Nenhuma conversa encontrada.</Body>
                    </View>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}

            {showConversation ? (
              <View
                style={{
                  flex: 1,
                  minHeight: 0,
                  borderRadius: isConversationFullscreen ? 0 : radius.lg,
                  borderWidth: isConversationFullscreen ? 0 : 1,
                  borderColor: colors.border,
                  backgroundColor: isLight ? "#FFFDF8" : "#090D13",
                  overflow: "hidden",
                  position: "relative"
                }}
              >
                {selectedChat ? (
                  <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "android" ? "height" : undefined}
                    keyboardVerticalOffset={isConversationFullscreen ? 0 : 76}
                    style={{ flex: 1, minHeight: 0 }}
                  >
                    <View
                      style={{
                        minHeight: 72,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                        backgroundColor: colors.card,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 16
                      }}
                    >
                      {!isDesktop ? (
                        <Pressable onPress={() => setSelectedChatId(null)} style={{ padding: 4 }}>
                          <ChevronLeft size={24} color={colors.gold} strokeWidth={2.4} />
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={openContactProfile}
                        style={({ pressed }) => ({
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          opacity: pressed ? 0.76 : 1
                        })}
                      >
                        <ProfileAvatar contact={selectedContact} size={42} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
                            {selectedContact?.full_name || "Contato"}
                          </Text>
                          <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
                            {selectedChat.request?.title || "Atendimento"}
                          </Text>
                        </View>
                      </Pressable>
                      <IconButton icon={Phone} onPress={selectedChatBlocked ? undefined : callSelectedContact} />
                      <IconButton icon={MoreVertical} onPress={() => setChatOptionsOpen((current) => !current)} />
                    </View>

                    <Pressable
                      onPress={() => {
                        if (selectedMessageAction) setSelectedMessageAction(null);
                      }}
                      style={{ flex: 1 }}
                    >
                    <ScrollView
                      ref={messagesScrollRef}
                      style={{ flex: 1 }}
                      keyboardDismissMode="on-drag"
                      onContentSizeChange={() => {
                        messagesScrollRef.current?.scrollToEnd({ animated: true });
                      }}
                      contentContainerStyle={{
                        padding: 16,
                        paddingBottom: messagesBottomPadding,
                        gap: 10,
                        justifyContent: messages.length ? "flex-start" : "center",
                        flexGrow: 1
                      }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {loadingMessages ? <ActivityIndicator color={colors.gold} /> : null}
                      {!loadingMessages && messages.length === 0 ? (
                        <View style={{ alignItems: "center", gap: 8 }}>
                          <MessageCircle size={34} color={colors.gold} strokeWidth={2.1} />
                          <Body>Nenhuma mensagem ainda.</Body>
                        </View>
                      ) : null}
                      {messages.map((message) => {
                        const mine = message.sender_id === user?.id;
                        const actionsOpen = selectedMessageAction?.id === message.id;
                        const canCopy = Boolean(getCopyableMessageText(message.content));
                        const actionsMenu = actionsOpen ? (
                          <MessageInlineActions
                            canCopy={canCopy}
                            canModify={mine}
                            error={messageActionError}
                            onCopy={copySelectedMessage}
                            onDelete={deleteSelectedMessage}
                            onEdit={startEditMessage}
                          />
                        ) : null;

                        return (
                          <View
                            key={message.id}
                            style={{
                              width: "100%",
                              flexDirection: "row",
                              justifyContent: mine ? "flex-end" : "flex-start",
                              alignItems: "flex-start",
                              gap: 8
                            }}
                          >
                            {mine ? actionsMenu : null}
                            <MessageBubble
                              message={message}
                              mine={mine}
                              compact={actionsOpen}
                              onOpenActions={() => openMessageActions(message)}
                              onOpenImage={openImagePreview}
                            />
                            {!mine ? actionsMenu : null}
                          </View>
                        );
                      })}
                    </ScrollView>
                    </Pressable>

                    <View
                      style={{
                        padding: 12,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        backgroundColor: colors.card,
                        gap: 10,
                        zIndex: 5,
                        ...(useFixedMobileComposer
                          ? ({
                              position: "absolute",
                              left: 0,
                              right: 0,
                              bottom: composerKeyboardInset,
                              width: "100%",
                              minHeight: mobileComposerHeight,
                              boxShadow: "0 -8px 18px rgba(0,0,0,0.08)"
                            } as any)
                          : null)
                      }}
                    >
                      {pendingMedia ? (
                        <PendingMediaPreview
                          asset={pendingMedia}
                          onRemove={() => setPendingMedia(null)}
                          uploadProgress={pendingMedia.type === "document" ? documentUploadProgress : null}
                          uploading={sending && pendingMedia.type === "document"}
                        />
                      ) : null}
                      {audioRecordingActive ? (
        <AudioRecordingComposer
                          durationMillis={audioRecordingDurationMillis}
                          error={audioRecordingError}
                          paused={audioRecordingPaused}
                          sending={sending}
                          onCancel={cancelAudioRecording}
                          onPause={pauseAudioRecording}
                          onResume={resumeAudioRecording}
                          onSend={sendAudioRecording}
                        />
                      ) : null}
                      {selectedChatBlocked ? (
                        <View style={{ minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, alignItems: "center", justifyContent: "center", paddingHorizontal: 14 }}>
                          <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800", textAlign: "center" }}>
                            Contato bloqueado. Novas mensagens foram desativadas.
                          </Text>
                        </View>
                      ) : (
                      <View style={{ display: audioRecordingActive ? "none" : "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <ComposerIconButton icon={Plus} label="Anexar" onPress={() => setAttachmentOptionsOpen(true)} />
                        <View
                        style={{
                          flex: 1,
                          minHeight: 52,
                          borderRadius: radius.lg,
                          borderWidth: 1,
                          borderColor: colors.border,
                          backgroundColor: colors.input,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                          paddingLeft: 14,
                          paddingRight: 6
                        }}
                      >
                        <TextInput
                          value={draft}
                          onChangeText={setDraft}
                          placeholder="Digite uma mensagem"
                          placeholderTextColor={colors.mutedDark}
                          style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "400", minHeight: 44, outlineStyle: "none" } as any}
                          onFocus={() => {
                            if (Platform.OS === "web" && !isDesktop) {
                              updateMobileKeyboardInset(true);
                              window.setTimeout(() => {
                                updateMobileKeyboardInset(true);
                              }, 120);
                              window.setTimeout(() => updateMobileKeyboardInset(true), 320);
                            }
                          }}
                          onBlur={() => {
                            if (Platform.OS === "web" && !isDesktop) {
                              window.setTimeout(() => updateMobileKeyboardInset(false), 120);
                            }
                          }}
                          onSubmitEditing={() => sendMessage()}
                        />
                      </View>
                      {!draft.trim() && !pendingMedia ? <ComposerIconButton icon={Camera} label="Câmera" onPress={() => setCameraOpen(true)} /> : null}
                        {draft.trim() || pendingMedia ? (
                          <Pressable
                            disabled={sending}
                            onPress={() => sendMessage()}
                            style={({ pressed }) => ({
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: colors.gold,
                              opacity: sending ? 0.48 : pressed ? 0.82 : 1
                            })}
                          >
                            <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
                          </Pressable>
                        ) : (
                          <Pressable
                            accessibilityLabel="Gravar áudio"
                            onPress={startAudioRecording}
                            style={({ pressed }) => ({
                              width: 40,
                              height: 40,
                              borderRadius: 20,
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(184,146,74,0.32)",
                              opacity: pressed ? 0.82 : 1
                            })}
                          >
                            <Mic size={19} color={colors.gold} strokeWidth={2.5} />
                          </Pressable>
                        )}
                      </View>
                      )}
                      {!audioRecordingActive && audioRecordingError ? (
                        <Text selectable style={{ color: colors.danger, fontSize: 12, fontWeight: "800", textAlign: "center" }}>
                          {audioRecordingError}
                        </Text>
                      ) : null}
                    </View>
                  </KeyboardAvoidingView>
                ) : (
                  <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
                    <Body>Selecione uma conversa para começar.</Body>
                  </View>
                )}
                {selectedChat && chatOptionsOpen ? (
                  <>
                    <Pressable
                      onPress={() => setChatOptionsOpen(false)}
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 80
                      }}
                    />
                    <Pressable
                      onPress={(event) => event.stopPropagation()}
                      style={{
                        position: "absolute",
                        top: 58,
                        right: 12,
                        width: 214,
                        borderRadius: radius.md,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.card,
                        padding: 8,
                        shadowColor: "#000000",
                        shadowOpacity: 0.14,
                        shadowRadius: 14,
                        shadowOffset: { width: 0, height: 8 },
                        elevation: 40,
                        zIndex: 90
                      }}
                    >
                      <InlineMessageAction
                        disabled={selectedChatBlocked}
                        icon={Phone}
                        label={selectedChatBlocked ? "Ligação bloqueada" : "Ligar"}
                        onPress={() => {
                          setChatOptionsOpen(false);
                          callSelectedContact();
                        }}
                      />
                      <InlineMessageAction
                        icon={UserRound}
                        label="Ver perfil"
                        onPress={() => {
                          setChatOptionsOpen(false);
                          openContactProfile();
                        }}
                      />
                      <InlineMessageAction
                        danger={!selectedChatBlocked}
                        disabled={selectedContactBlockedMe && !selectedContactBlockedByMe}
                        icon={selectedContactBlockedByMe ? Check : Ban}
                        label={
                          selectedContactBlockedByMe
                            ? "Desbloquear usuário"
                            : selectedContactBlockedMe
                              ? "Usuário bloqueou você"
                              : "Bloquear usuário"
                        }
                        onPress={() => {
                          if (selectedContactBlockedByMe) {
                            unblockSelectedContact();
                            return;
                          }

                          if (!selectedContactBlockedMe) blockSelectedContact();
                        }}
                      />
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      {chatRowAction ? (
        <ChatRowActionsMenu
          x={chatRowAction.x}
          y={chatRowAction.y}
          onClose={() => setChatRowAction(null)}
          onDelete={() => hideChat(chatRowAction.chatId)}
          onMarkUnread={() => markChatUnread(chatRowAction.chatId)}
        />
      ) : null}
      {chatListOptionsOpen && !isConversationFullscreen ? (
        <ChatListOptionsMenu
          isDesktop={isDesktop}
          onClose={() => setChatListOptionsOpen(false)}
          onMarkAllUnread={markAllVisibleChatsUnread}
          onSelectChats={startChatSelection}
        />
      ) : null}
      <ContactProfileModal
        contactBlocked={selectedChatBlocked}
        currentUserId={user?.id || null}
        loading={profileLoading}
        onClose={() => setProfileModalOpen(false)}
        onReviewSubmitted={(submittedRating) => {
          setContactProfile((current) => {
            if (!current) return current;
            const currentTotal = (current.reviewAverage || 0) * current.reviewCount;
            const nextCount = current.reviewCount + 1;
            return {
              ...current,
              reviewAverage: (currentTotal + submittedRating) / nextCount,
              reviewCount: nextCount
            };
          });
        }}
        profile={contactProfile}
        reviewedId={selectedContactId}
        visible={profileModalOpen}
      />
      <ChatCameraModal
        onCancel={() => setCameraOpen(false)}
        onCaptured={(asset) => {
          setPendingMedia(asset);
          setCameraOpen(false);
        }}
        visible={cameraOpen}
      />
      <AttachmentOptionsModal
        onClose={() => setAttachmentOptionsOpen(false)}
        onPickDocument={async () => {
          const asset = await pickChatDocument();
          setAttachmentOptionsOpen(false);
          if (asset) setPendingMedia(asset);
        }}
        onPickMedia={async () => {
          const asset = await pickChatMediaFromGallery();
          setAttachmentOptionsOpen(false);
          if (asset) setPendingMedia(asset);
        }}
        visible={attachmentOptionsOpen}
      />
      <EditMessageModal
        message={editingMessage}
        text={editingText}
        onChangeText={setEditingText}
        onClose={() => {
          setEditingMessage(null);
          setEditingText("");
        }}
        onSave={saveEditedMessage}
      />
      <ImagePreviewModal
        image={imagePreview}
        onClose={() => setImagePreview(null)}
      />
    </Screen>
  );
}

function ContactProfileModal({
  contactBlocked,
  currentUserId,
  loading,
  onClose,
  onReviewSubmitted,
  profile,
  reviewedId,
  visible
}: {
  contactBlocked: boolean;
  currentUserId: string | null;
  loading: boolean;
  onClose: () => void;
  onReviewSubmitted: (rating: number) => void;
  profile: ContactProfile | null;
  reviewedId: string | null;
  visible: boolean;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isProvider = profile?.role === "provider";
  const location = [profile?.city, profile?.state].filter(Boolean).join(" / ");
  const [recommendation, setRecommendation] = useState<"like" | "dislike" | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewChecking, setReviewChecking] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [reviewMessage, setReviewMessage] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) {
      setRecommendation(null);
      setRating(0);
      setReviewText("");
      setReviewChecking(false);
      setReviewSubmitted(false);
      setReviewMessage(null);
      setReviewSubmitting(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !currentUserId || !reviewedId) return;

    let active = true;

    const checkExistingReview = async () => {
      setReviewChecking(true);
      const { data, error } = await supabase
        .from("reviews")
        .select("id")
        .eq("reviewer_id", currentUserId)
        .eq("reviewed_id", reviewedId)
        .maybeSingle();

      if (!active) return;

      if (!error && data) {
        setReviewSubmitted(true);
        setReviewMessage("Você já avaliou esse usuário.");
      }

      setReviewChecking(false);
    };

    checkExistingReview();

    return () => {
      active = false;
    };
  }, [currentUserId, reviewedId, visible]);

  const submitReview = async () => {
    if (!currentUserId || !reviewedId || !recommendation || rating < 1 || reviewSubmitting) return;

    setReviewSubmitting(true);
    setReviewMessage(null);

    const recommendationLabel = recommendation === "like" ? "Sim" : "Não";
    const comment = [`Recomenda: ${recommendationLabel}`, reviewText.trim()].filter(Boolean).join("\n\n");
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: currentUserId,
      reviewed_id: reviewedId,
      rating,
      comment
    });

    setReviewSubmitting(false);

    if (error) {
      setReviewMessage(
        error.code === "PGRST205" || error.code === "42P01"
          ? "Avaliações ainda não estão configuradas no banco."
          : error.code === "23505"
          ? "Você já avaliou esse usuário."
          : error.code === "42501"
            ? "Você não tem permissão para avaliar esse usuário."
            : "Não foi possível enviar a avaliação."
      );
      if (error.code === "23505") {
        setReviewSubmitted(true);
      }
      return;
    }

    setReviewMessage("Avaliação enviada.");
    setReviewSubmitted(true);
    onReviewSubmitted(rating);
  };

  const callProfilePhone = () => {
    if (contactBlocked) return;

    const phone = profile?.phone?.replace(/\D/g, "");
    if (!phone) return;

    Linking.openURL(`tel:${phone}`);
  };

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View
          style={{
            flex: 1,
            backgroundColor: colors.card,
            gap: 16
          }}
        >
          <View
            style={{
              minHeight: isDesktop ? 74 : 92,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: 22,
              paddingTop: isDesktop ? 8 : 26
            }}
          >
            <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "900" }}>
              Perfil
            </Text>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <X size={22} color={colors.gold} strokeWidth={2.4} />
            </Pressable>
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={colors.gold} />
            </View>
          ) : profile ? (
            <ScrollView contentContainerStyle={{ gap: 16, paddingHorizontal: 22, paddingBottom: 26 }}>
              <View style={{ alignItems: "center", gap: 10 }}>
                <ProfileAvatar contact={profile} size={82} />
                <View style={{ alignItems: "center", gap: 3 }}>
                  <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: "900", textAlign: "center" }}>
                    {profile.full_name || "Contato"}
                  </Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 13, fontWeight: "800" }}>
                    {isProvider ? "Prestador de serviço" : "Cliente"}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <ProfileStat label={isProvider ? "Serviços prestados" : "Serviços solicitados"} value={String(profile.serviceCount)} />
                <ProfileStat icon={profile.reviewAverage ? Star : undefined} label="Avaliações" value={profile.reviewAverage ? `${profile.reviewAverage.toFixed(1)} (${profile.reviewCount})` : "Sem avaliações"} />
              </View>

              <RecommendationBox
                recommendation={recommendation}
                rating={rating}
                reviewText={reviewText}
                onRecommendationChange={(value) => {
                  setRecommendation(value);
                  setRating(0);
                }}
                onRatingChange={setRating}
                onReviewTextChange={setReviewText}
                onSubmit={submitReview}
                checking={reviewChecking}
                submitted={reviewSubmitted}
                submitMessage={reviewMessage}
                submitting={reviewSubmitting}
              />

              <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: 14, gap: 10 }}>
                <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
                  Contato
                </Text>
                <ProfileInfo
                  highlighted={Boolean(profile.phone && !contactBlocked)}
                  icon={Phone}
                  label={contactBlocked ? "Telefone indisponível" : profile.phone || "Telefone não informado"}
                  onPress={profile.phone && !contactBlocked ? callProfilePhone : undefined}
                />
                <ProfileInfo icon={MapPin} label={location || "Localização não informada"} />
              </View>

              {isProvider ? (
                <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: 14, gap: 10 }}>
                  <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
                    Serviços
                  </Text>
                  <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: "800" }}>
                    {profile.categories.length ? profile.categories.join(", ") : "Nenhum serviço informado."}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          ) : (
            <Body>Não foi possível carregar esse perfil.</Body>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ChatCameraModal({
  onCancel,
  onCaptured,
  visible
}: {
  onCancel: () => void;
  onCaptured: (asset: ChatMediaAsset) => void;
  visible: boolean;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const canRecordVideo = Platform.OS !== "web";

  const pickFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      setMessage("Permita acesso à galeria para selecionar fotos ou vídeos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: false,
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.85,
      videoMaxDuration: 60
    });

    if (result.canceled || !result.assets[0]) return;
    onCaptured(result.assets[0]);
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
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
      setMessage("Gravação de vídeo não é suportada no navegador.");
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

  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onCancel}>
      {!permission?.granted ? (
        <Screen>
          <View style={{ flex: 1, justifyContent: "center", gap: 16, padding: 24 }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900" }}>Permitir câmera</Text>
            <Body>Precisamos acessar a câmera para tirar fotos ou gravar vídeos no chat.</Body>
            <Pressable onPress={requestPermission} style={{ borderRadius: radius.md, backgroundColor: colors.gold, padding: 15, alignItems: "center" }}>
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>Permitir acesso</Text>
            </Pressable>
            <Pressable onPress={pickFromGallery} style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 15, alignItems: "center" }}>
              <Text style={{ color: colors.gold, fontSize: 14, fontWeight: "900" }}>Selecionar da galeria</Text>
            </Pressable>
            <Pressable onPress={onCancel} style={{ padding: 10, alignItems: "center" }}>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "800" }}>Voltar</Text>
            </Pressable>
          </View>
        </Screen>
      ) : (
        <View style={{ flex: 1, backgroundColor: "#000000" }}>
          <CameraView ref={cameraRef} enableTorch={flashEnabled && facing === "back"} facing={facing} mode={mode} style={{ flex: 1 }} videoQuality="720p" />

          <View style={{ position: "absolute", top: 42, left: 18, right: 18, flexDirection: "row", justifyContent: "center", gap: 12 }}>
            <Pressable
              accessibilityLabel="Fechar câmera"
              onPress={onCancel}
              style={{
                position: "absolute",
                left: 0,
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(0,0,0,0.28)"
              }}
            >
              <X size={24} color="#FFFFFF" strokeWidth={2.6} />
            </Pressable>
            <Pressable
              accessibilityLabel={flashEnabled ? "Desligar flash" : "Ligar flash"}
              onPress={() => setFlashEnabled((current) => !current)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: flashEnabled ? "rgba(184,146,74,0.95)" : "rgba(0,0,0,0.28)"
              }}
            >
              {flashEnabled ? <Zap size={22} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2.3} /> : <ZapOff size={22} color="#FFFFFF" strokeWidth={2.3} />}
            </Pressable>
          </View>

          <View style={{ position: "absolute", left: 18, right: 18, bottom: 24, gap: 16 }}>
            <View style={{ alignSelf: "center", borderRadius: 999, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(0,0,0,0.38)", flexDirection: "row", padding: 4 }}>
              <Pressable onPress={() => setMode("picture")} style={{ borderRadius: 999, backgroundColor: mode === "picture" ? colors.gold : "transparent", paddingHorizontal: 18, paddingVertical: 10 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>Foto</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!canRecordVideo) {
                    setMessage("Gravação de vídeo não é suportada no navegador.");
                    return;
                  }
                  setMessage(null);
                  setMode("video");
                }}
                style={{ borderRadius: 999, backgroundColor: mode === "video" ? colors.gold : "transparent", opacity: canRecordVideo ? 1 : 0.45, paddingHorizontal: 18, paddingVertical: 10 }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>Vídeo</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around" }}>
              <Pressable onPress={pickFromGallery} style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" }}>
                <ImageIcon size={26} color="#FFFFFF" strokeWidth={2.2} />
              </Pressable>
              <Pressable
                onPress={mode === "picture" ? takePhoto : toggleRecording}
                style={({ pressed }) => ({
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  borderWidth: 5,
                  borderColor: "#FFFFFF",
                  backgroundColor: mode === "video" && recording ? colors.danger : "rgba(255,255,255,0.22)",
                  opacity: pressed ? 0.82 : 1
                })}
              />
              <Pressable
                accessibilityLabel="Virar câmera"
                onPress={() => setFacing((current) => (current === "back" ? "front" : "back"))}
                style={({ pressed }) => ({
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(255,255,255,0.16)",
                  opacity: pressed ? 0.74 : 1
                })}
              >
                <SwitchCamera size={27} color="#FFFFFF" strokeWidth={2.35} />
              </Pressable>
            </View>

            {mode === "video" ? (
              <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "900", textAlign: "center" }}>
                {recording ? "Gravando... toque para parar" : "Toque para gravar"}
              </Text>
            ) : null}
            {message ? (
              <Text selectable style={{ color: colors.gold, fontSize: 12, fontWeight: "800", lineHeight: 18, textAlign: "center" }}>
                {message}
              </Text>
            ) : null}
          </View>
        </View>
      )}
    </Modal>
  );
}

function MessageInlineActions({
  canCopy,
  canModify,
  error,
  onCopy,
  onDelete,
  onEdit
}: {
  canCopy: boolean;
  canModify: boolean;
  error: string | null;
  onCopy: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <Pressable
      onPress={(event) => event.stopPropagation()}
      style={{
        width: 238,
        maxWidth: "58%",
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        padding: 8,
        gap: 4,
        shadowColor: "#000000",
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 18
      }}
    >
      {canCopy ? <InlineMessageAction icon={Copy} label="Copiar mensagem" onPress={onCopy} /> : null}
      {canModify ? <InlineMessageAction icon={FileText} label="Editar mensagem" onPress={onEdit} /> : null}
      {canModify ? <InlineMessageAction danger icon={X} label="Apagar mensagem" onPress={onDelete} /> : null}
      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 12, fontWeight: "800", textAlign: "center", padding: 8 }}>
          {error}
        </Text>
      ) : null}
    </Pressable>
  );
}

function InlineMessageAction({
  danger,
  disabled,
  icon,
  label,
  onPress
}: {
  danger?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const Icon = icon;
  const accentColor = disabled ? colors.muted : danger ? colors.danger : colors.gold;
  const textColor = disabled ? colors.muted : danger ? colors.danger : colors.text;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 44,
        borderRadius: radius.sm,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        opacity: disabled ? 0.62 : pressed ? 0.76 : 1,
        paddingHorizontal: 10
      })}
    >
      <Icon size={19} color={accentColor} strokeWidth={2.2} />
      <Text style={{ flex: 1, color: textColor, flexWrap: "wrap", fontSize: 14, fontWeight: "900", lineHeight: 18 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function EditMessageModal({
  message,
  onChangeText,
  onClose,
  onSave,
  text
}: {
  message: Message | null;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  text: string;
}) {
  const media = message ? parseMediaMessage(message.content) : null;
  const canSave = Boolean(text.trim() || media);

  return (
    <Modal animationType="fade" transparent visible={Boolean(message)} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.42)", justifyContent: "center", padding: 18 }}>
        <View style={{ borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16, gap: 12 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>Editar mensagem</Text>
          <TextInput
            multiline
            value={text}
            onChangeText={onChangeText}
            placeholder={media ? "Legenda opcional" : "Digite uma mensagem"}
            placeholderTextColor={colors.mutedDark}
            style={{
              minHeight: 110,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.input,
              color: colors.text,
              fontSize: 14,
              fontWeight: "400",
              outlineStyle: "none",
              padding: 12,
              textAlignVertical: "top"
            } as any}
          />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={onClose} style={{ flex: 1, minHeight: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "900" }}>Cancelar</Text>
            </Pressable>
            <Pressable
              disabled={!canSave}
              onPress={onSave}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 46,
                borderRadius: radius.md,
                backgroundColor: colors.gold,
                alignItems: "center",
                justifyContent: "center",
                opacity: !canSave ? 0.45 : pressed ? 0.82 : 1
              })}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14, fontWeight: "900" }}>Salvar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function AttachmentOptionsModal({
  onClose,
  onPickDocument,
  onPickMedia,
  visible
}: {
  onClose: () => void;
  onPickDocument: () => void;
  onPickMedia: () => void;
  visible: boolean;
}) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" }}>
        <Pressable
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            gap: 10
          }}
        >
          <AttachmentOption icon={ImageIcon} label="Fotos e vídeos" onPress={onPickMedia} />
          <AttachmentOption icon={FileText} label="Documentos" onPress={onPickDocument} />
          <Pressable onPress={onClose} style={{ minHeight: 48, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "800" }}>Cancelar</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AttachmentOption({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress: () => void }) {
  const Icon = icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.input,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.78 : 1,
        paddingHorizontal: 14
      })}
    >
      <Icon size={22} color={colors.gold} strokeWidth={2.3} />
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

function PendingMediaPreview({
  asset,
  onRemove,
  uploadProgress,
  uploading
}: {
  asset: ChatMediaAsset;
  onRemove: () => void;
  uploadProgress?: number | null;
  uploading?: boolean;
}) {
  const isDocument = asset.type === "document";
  const progress = typeof uploadProgress === "number" ? Math.max(0, Math.min(1, uploadProgress)) : null;
  const progressPercent = progress !== null ? Math.round(progress * 100) : 0;

  return (
    <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: 8, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 48, height: 48, borderRadius: 8, overflow: "hidden", backgroundColor: colors.cardElevated }}>
        {isDocument ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <FileText size={22} color={colors.gold} />
          </View>
        ) : asset.type === "video" ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Camera size={22} color={colors.gold} />
          </View>
        ) : (
          <Image source={{ uri: asset.uri }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
        )}
      </View>
      <View style={{ flex: 1, gap: uploading ? 6 : 0, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 13, fontWeight: "800" }}>
          {isDocument ? asset.fileName || "Documento selecionado" : asset.type === "video" ? "Vídeo selecionado" : "Foto selecionada"}
        </Text>
        {uploading && progress !== null ? (
          <View style={{ gap: 4 }}>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.cardElevated, overflow: "hidden" }}>
              <View style={{ width: `${progressPercent}%`, height: "100%", borderRadius: 3, backgroundColor: colors.gold }} />
            </View>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
              Carregando documento... {progressPercent}%
            </Text>
          </View>
        ) : null}
      </View>
      <Pressable disabled={uploading} onPress={onRemove} style={{ opacity: uploading ? 0.35 : 1, padding: 6 }}>
        {uploading ? <ActivityIndicator color={colors.gold} size="small" /> : <X size={18} color={colors.muted} />}
      </Pressable>
    </View>
  );
}

function AudioRecordingComposer({
  durationMillis,
  error,
  onCancel,
  onPause,
  onResume,
  onSend,
  paused,
  sending
}: {
  durationMillis: number;
  error: string | null;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onSend: () => void;
  paused: boolean;
  sending: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View
        style={{
          minHeight: 52,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.input,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 10
        }}
      >
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: paused ? colors.muted : colors.danger }} />
        <Text selectable style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "800" }}>
          {paused ? "Gravação pausada" : "Gravando"} • {formatAudioDuration(durationMillis)}
        </Text>
        <ComposerRoundAction icon={Trash2} label="Cancelar gravação" onPress={onCancel} tone="muted" />
        <ComposerRoundAction icon={paused ? Play : Pause} label={paused ? "Continuar gravação" : "Pausar gravação"} onPress={paused ? onResume : onPause} tone="gold" />
        <Pressable
          accessibilityLabel="Enviar áudio"
          disabled={sending || durationMillis < 500}
          onPress={onSend}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.gold,
            opacity: sending || durationMillis < 500 ? 0.48 : pressed ? 0.82 : 1
          })}
        >
          <Send size={18} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>
      {error ? (
        <Text selectable style={{ color: colors.danger, fontSize: 12, fontWeight: "800", textAlign: "center" }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function ComposerRoundAction({ icon, label, onPress, tone }: { icon: LucideIcon; label: string; onPress: () => void; tone: "gold" | "muted" }) {
  const Icon = icon;
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tone === "gold" ? "rgba(184,146,74,0.18)" : colors.cardElevated,
        opacity: pressed ? 0.74 : 1
      })}
    >
      <Icon size={18} color={tone === "gold" ? colors.gold : colors.muted} strokeWidth={2.4} />
    </Pressable>
  );
}

function ComposerIconButton({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress?: () => void }) {
  const Icon = icon;

  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress || (() => {})}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.72 : 1
      })}
    >
      <Icon size={22} color={colors.gold} strokeWidth={2.35} />
    </Pressable>
  );
}

function RecommendationBox({
  checking,
  onRatingChange,
  onRecommendationChange,
  onReviewTextChange,
  onSubmit,
  rating,
  recommendation,
  reviewText,
  submitted,
  submitMessage,
  submitting
}: {
  checking: boolean;
  onRatingChange: (value: number) => void;
  onRecommendationChange: (value: "like" | "dislike") => void;
  onReviewTextChange: (value: string) => void;
  onSubmit: () => void;
  rating: number;
  recommendation: "like" | "dislike" | null;
  reviewText: string;
  submitted: boolean;
  submitMessage: string | null;
  submitting: boolean;
}) {
  const canSubmit = Boolean(recommendation && rating > 0 && !submitting);

  return (
    <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: 14, gap: 12 }}>
      {checking ? (
        <View style={{ alignItems: "center", justifyContent: "center", minHeight: 138 }}>
          <ActivityIndicator color={colors.gold} />
        </View>
      ) : submitted ? (
        <View style={{ alignItems: "center", gap: 10, paddingVertical: 10 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(31,157,85,0.12)",
              borderWidth: 1,
              borderColor: "#1F9D55"
            }}
          >
            <ThumbsUp size={24} color="#1F9D55" strokeWidth={2.5} />
          </View>
          <Text selectable style={{ color: colors.text, fontSize: 16, fontWeight: "900", textAlign: "center" }}>
            Obrigado pela avaliação!
          </Text>
          <Text selectable style={{ color: colors.success, fontSize: 13, lineHeight: 19, fontWeight: "800", textAlign: "center" }}>
            {submitMessage === "Você já avaliou esse usuário."
              ? "Você já avaliou esse usuário. Obrigado por compartilhar sua experiência."
              : "Sua avaliação foi enviada e já aparece no perfil desse usuário."}
          </Text>
        </View>
      ) : (
      <>
      <Text selectable style={{ color: colors.text, fontSize: 15, fontWeight: "900" }}>
        Você recomenda esse usuário?
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <RecommendationButton active={recommendation === "like"} icon={ThumbsUp} label="Sim" onPress={() => onRecommendationChange("like")} tone="positive" />
        <RecommendationButton active={recommendation === "dislike"} icon={ThumbsDown} label="Não" onPress={() => onRecommendationChange("dislike")} tone="negative" />
      </View>

      {recommendation ? (
        <View style={{ gap: 12 }}>
          <View style={{ alignItems: "center", gap: 8 }}>
            <Text selectable style={{ color: colors.muted, fontSize: 12, fontWeight: "900", textTransform: "uppercase" }}>
              Avaliação
            </Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => onRatingChange(star)} style={{ padding: 2 }}>
                  <Star size={30} color={colors.gold} fill={star <= rating ? colors.gold : "transparent"} strokeWidth={2} />
                </Pressable>
              ))}
            </View>
          </View>

          <View
            style={{
              minHeight: 96,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
              paddingHorizontal: 12,
              paddingVertical: 8
            }}
          >
            <TextInput
              multiline
              value={reviewText}
              onChangeText={onReviewTextChange}
              placeholder="Escreva algo sobre essa avaliação, se quiser"
              placeholderTextColor={colors.mutedDark}
              style={{ color: colors.text, flex: 1, fontSize: 13, fontWeight: "800", minHeight: 76, outlineStyle: "none", textAlignVertical: "top" } as any}
            />
          </View>
          <Pressable
            disabled={!canSubmit}
            onPress={onSubmit}
            style={({ pressed }) => ({
              minHeight: 48,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.gold,
              opacity: !canSubmit ? 0.46 : pressed ? 0.82 : 1,
              paddingHorizontal: 14
            })}
          >
            <Text style={{ color: "#1F1A12", fontSize: 14, fontWeight: "900" }}>
              {submitting ? "Enviando..." : "Avaliar"}
            </Text>
          </Pressable>
          {submitMessage ? (
            <Text selectable style={{ color: submitMessage === "Avaliação enviada." ? colors.success : colors.danger, fontSize: 12, fontWeight: "800", textAlign: "center" }}>
              {submitMessage}
            </Text>
          ) : null}
        </View>
      ) : null}
      </>
      )}
    </View>
  );
}

function RecommendationButton({
  active,
  icon,
  label,
  onPress,
  tone
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  tone: "positive" | "negative";
}) {
  const accent = tone === "positive" ? "#1F9D55" : "#D64545";
  const activeBackground = tone === "positive" ? "rgba(31,157,85,0.12)" : "rgba(214,69,69,0.12)";
  const Icon = icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 48,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: active ? accent : colors.border,
        backgroundColor: active ? activeBackground : colors.card,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        opacity: pressed ? 0.78 : 1,
        paddingHorizontal: 10
      })}
    >
      <Icon size={21} color={active ? accent : colors.muted} strokeWidth={active ? 2.8 : 2.2} />
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: active ? accent : colors.text, fontSize: 13, fontWeight: "900" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ProfileStat({ icon, label, value }: { icon?: LucideIcon; label: string; value: string }) {
  const Icon = icon;

  return (
    <View style={{ flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.input, padding: 12, gap: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }}>
        {Icon ? <Icon size={17} color={colors.gold} fill={colors.gold} strokeWidth={2} /> : null}
        <Text selectable numberOfLines={1} adjustsFontSizeToFit style={{ color: colors.gold, fontSize: 17, fontWeight: "900", textAlign: "center" }}>
          {value}
        </Text>
      </View>
      <Text selectable style={{ color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: "800", textAlign: "center" }}>
        {label}
      </Text>
    </View>
  );
}

function ProfileInfo({
  highlighted,
  icon,
  label,
  onPress
}: {
  highlighted?: boolean;
  icon: LucideIcon;
  label: string;
  onPress?: () => void;
}) {
  const Icon = icon;
  const content = (
    <>
      {highlighted ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: colors.gold,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Icon size={18} color="#FFFFFF" strokeWidth={2.35} />
        </View>
      ) : (
        <Icon size={17} color={colors.gold} strokeWidth={2.2} />
      )}
      <Text selectable style={{ flex: 1, color: highlighted ? colors.text : colors.muted, fontSize: highlighted ? 14 : 13, lineHeight: 18, fontWeight: "900" }}>
        {label}
      </Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: highlighted ? 10 : 8,
          borderRadius: highlighted ? radius.md : 0,
          borderWidth: highlighted ? 1 : 0,
          borderColor: highlighted ? colors.gold : "transparent",
          backgroundColor: highlighted ? colors.goldSoft : "transparent",
          paddingHorizontal: highlighted ? 10 : 0,
          paddingVertical: highlighted ? 10 : 0,
          opacity: pressed ? 0.72 : 1
        })}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      {content}
    </View>
  );
}

function SearchInput({ value, onChangeText }: { value: string; onChangeText: (value: string) => void }) {
  return (
    <View
      style={{
        minHeight: 48,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.input,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12
      }}
    >
      <Search size={18} color={colors.gold} strokeWidth={2.3} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Buscar conversa"
        placeholderTextColor={colors.mutedDark}
        style={{ flex: 1, color: colors.text, fontSize: 14, fontWeight: "800", minHeight: 42, outlineStyle: "none" } as any}
      />
      {value ? (
        <Pressable onPress={() => onChangeText("")} style={{ padding: 4 }}>
          <X size={18} color={colors.muted} strokeWidth={2.3} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ChatSelectionAction({
  danger,
  disabled,
  horizontal,
  icon,
  label,
  onPress
}: {
  danger?: boolean;
  disabled: boolean;
  horizontal: boolean;
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const Icon = icon;
  const accent = danger ? colors.danger : colors.gold;

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        ...(horizontal ? { flex: 1 } : { width: "100%" }),
        minHeight: 44,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: disabled ? colors.border : accent,
        backgroundColor: disabled ? "transparent" : danger ? "rgba(194,65,12,0.08)" : colors.card,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: horizontal ? "center" : "flex-start",
        gap: 8,
        opacity: disabled ? 0.45 : pressed ? 0.76 : 1,
        paddingHorizontal: 10
      })}
    >
      <Icon size={17} color={accent} strokeWidth={2.3} />
      <Text style={{ color: danger ? colors.danger : colors.text, flex: 1, flexWrap: "wrap", fontSize: 12, fontWeight: "900", lineHeight: 16, textAlign: horizontal ? "center" : "left" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChatRowActionsMenu({
  onClose,
  onDelete,
  onMarkUnread,
  x,
  y
}: {
  onClose: () => void;
  onDelete: () => void;
  onMarkUnread: () => void;
  x: number;
  y: number;
}) {
  const position = Platform.OS === "web" ? "fixed" : "absolute";

  return (
    <>
      <Pressable
        onPress={onClose}
        style={{
          position: position as any,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 100
        }}
      />
      <Pressable
        onPress={(event) => event.stopPropagation()}
        style={{
          position: position as any,
          top: y,
          left: x,
          width: 230,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 8,
          gap: 4,
          shadowColor: "#000000",
          shadowOpacity: 0.16,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 42,
          zIndex: 110
        }}
      >
        <InlineMessageAction icon={MessageCircle} label="Marcar como não lida" onPress={onMarkUnread} />
        <InlineMessageAction danger icon={Trash2} label="Apagar conversa" onPress={onDelete} />
      </Pressable>
    </>
  );
}

function ChatListOptionsMenu({
  isDesktop,
  onClose,
  onMarkAllUnread,
  onSelectChats
}: {
  isDesktop: boolean;
  onClose: () => void;
  onMarkAllUnread: () => void;
  onSelectChats: () => void;
}) {
  const position = Platform.OS === "web" ? "fixed" : "absolute";

  return (
    <>
      <Pressable
        onPress={onClose}
        style={{
          position: position as any,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 120
        }}
      />
      <Pressable
        onPress={(event) => event.stopPropagation()}
        style={{
          position: position as any,
          top: isDesktop ? 76 : 116,
          right: isDesktop ? 28 : 18,
          width: 252,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          padding: 8,
          gap: 4,
          shadowColor: "#000000",
          shadowOpacity: 0.16,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 44,
          zIndex: 130
        }}
      >
        <InlineMessageAction icon={FileText} label="Selecionar conversas" onPress={onSelectChats} />
        <InlineMessageAction icon={MessageCircle} label="Marcar todas como não lidas" onPress={onMarkAllUnread} />
      </Pressable>
    </>
  );
}

function ChatRow({
  active,
  chat,
  currentUserId,
  onOpenActions,
  onPress,
  selected,
  selectionMode,
  unreadCount
}: {
  active: boolean;
  chat: Chat;
  currentUserId: string;
  onOpenActions: (event: GestureResponderEvent | any) => void;
  onPress: () => void;
  selected: boolean;
  selectionMode: boolean;
  unreadCount: number;
}) {
  const contact = getContact(chat, currentUserId);
  const contextMenuProps =
    !selectionMode && Platform.OS === "web"
      ? ({
          onContextMenu: (event: any) => {
            event.preventDefault();
            onOpenActions(event);
          }
        } as any)
      : {};

  return (
    <Pressable
      onPress={onPress}
      onLongPress={selectionMode ? undefined : onOpenActions}
      delayLongPress={420}
      {...contextMenuProps}
      style={({ pressed }) => ({
        borderRadius: radius.md,
        borderWidth: selected ? 1 : 0,
        borderColor: selected ? colors.gold : "transparent",
        backgroundColor: selected || (!selectionMode && active) ? colors.goldSoft : "transparent",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.82 : 1,
        padding: 10
      })}
    >
      {selectionMode ? (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: selected ? colors.gold : colors.border,
            backgroundColor: selected ? colors.gold : "transparent",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          {selected ? <Check size={15} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
      ) : null}
      <ProfileAvatar contact={contact} size={46} />
      <View style={{ flex: 1, justifyContent: "center", gap: 0, minWidth: 0 }}>
        <Text selectable numberOfLines={1} style={{ color: colors.text, fontSize: 14, fontWeight: "900" }}>
          {contact?.full_name || "Contato"}
        </Text>
        <Text selectable numberOfLines={1} style={{ color: colors.muted, fontSize: 12, fontWeight: "800" }}>
          {chat.request?.title || "Canal aberto para atendimento"}
        </Text>
      </View>
      <View style={{ width: 36, alignItems: "flex-end", justifyContent: "center", gap: 6 }}>
        <Text selectable style={{ color: colors.muted, fontSize: 10, fontWeight: "800" }}>
          {formatShortTime(chat.created_at)}
        </Text>
        {unreadCount > 0 ? (
          <View
            style={{
              minWidth: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: "#24D327",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 6
            }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 11, lineHeight: 13, fontWeight: "900" }}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function MessageBubble({
  compact,
  message,
  mine,
  onOpenActions,
  onOpenImage
}: {
  compact?: boolean;
  message: Message;
  mine: boolean;
  onOpenActions: () => void;
  onOpenImage: (image: ImagePreview) => void;
}) {
  const media = parseMediaMessage(message.content);
  const canOpenActions = mine || Boolean(getCopyableMessageText(message.content));
  const contextMenuProps =
    canOpenActions && Platform.OS === "web"
      ? ({
          onContextMenu: (event: any) => {
            event.preventDefault();
            onOpenActions();
          }
        } as any)
      : {};

  return (
    <Pressable
      onLongPress={canOpenActions ? onOpenActions : undefined}
      delayLongPress={420}
      {...contextMenuProps}
      style={{ flexShrink: 1, maxWidth: compact ? "42%" : "78%", gap: 4 }}
    >
      <View
        style={{
          borderRadius: radius.lg,
          borderTopRightRadius: mine ? radius.sm : radius.lg,
          borderTopLeftRadius: mine ? radius.lg : radius.sm,
          backgroundColor: mine ? colors.gold : colors.cardElevated,
          overflow: "hidden",
          paddingHorizontal: media ? 0 : 14,
          paddingVertical: media ? 0 : 10
        }}
      >
        {media ? (
          <View style={{ gap: media.text ? 8 : 0, padding: media.text ? 8 : 0 }}>
            {media.type === "document" ? (
              <DocumentMessage canOpenActions={canOpenActions} name={media.name || "Documento"} onOpenActions={onOpenActions} url={media.url} />
            ) : media.type === "audio" ? (
              <AudioMessage uri={media.url} mine={mine} />
            ) : media.type === "video" ? (
              <ChatVideo uri={media.url} />
            ) : (
              <Pressable
                accessibilityRole="imagebutton"
                onPress={(event) => {
                  event.stopPropagation();
                  onOpenImage({ name: media.name || "foto.jpg", url: media.url });
                }}
              >
                <Image source={{ uri: media.url }} contentFit="cover" style={{ width: 230, height: 230 }} />
              </Pressable>
            )}
            {media.text ? (
              <Text selectable style={{ color: mine ? "#FFFFFF" : colors.text, fontSize: 14, lineHeight: 20, fontWeight: "400", paddingHorizontal: 6, paddingBottom: 6 }}>
                {media.text}
              </Text>
            ) : null}
          </View>
        ) : (
          <Text selectable style={{ color: mine ? "#FFFFFF" : colors.text, fontSize: 14, lineHeight: 20, fontWeight: "400" }}>
            {message.content}
          </Text>
        )}
      </View>
      <Text selectable style={{ alignSelf: mine ? "flex-end" : "flex-start", color: colors.muted, fontSize: 10, fontWeight: "800" }}>
        {formatShortTime(message.created_at)}
      </Text>
    </Pressable>
  );
}

function AudioMessage({ mine, uri }: { mine: boolean; uri: string }) {
  return <NativeAudioMessage mine={mine} uri={uri} />;
}

function NativeAudioMessage({ mine, uri }: { mine: boolean; uri: string }) {
  const player = useAudioPlayer({ uri }, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(1);
  const durationMillis = Math.round((status.duration || 0) * 1000);
  const currentMillis = Math.round((status.currentTime || 0) * 1000);
  const progress = durationMillis ? Math.min(1, currentMillis / durationMillis) : 0;

  const togglePlayback = async () => {
    if (status.playing) {
      player.pause();
      return;
    }

    await configurePlaybackAudioMode();
    if (status.didJustFinish && status.duration) {
      player.seekTo(0);
    }
    if ("volume" in player) {
      (player as any).volume = 1;
    }
    player.play();
  };

  const updateTrackWidth = (event: LayoutChangeEvent) => {
    setTrackWidth(Math.max(1, event.nativeEvent.layout.width));
  };

  const seekAudio = (event: GestureResponderEvent) => {
    if (!status.duration) return;

    const locationX = Math.max(0, Math.min(trackWidth, event.nativeEvent.locationX));
    player.seekTo((locationX / trackWidth) * status.duration);
  };

  return (
    <View style={{ width: 210, minHeight: 58, padding: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable
        accessibilityLabel={status.playing ? "Pausar áudio" : "Reproduzir áudio"}
        onPress={togglePlayback}
        style={({ pressed }) => ({
          width: 38,
          height: 38,
          borderRadius: 19,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mine ? "rgba(255,255,255,0.22)" : "rgba(184,146,74,0.18)",
          opacity: pressed ? 0.74 : 1
        })}
      >
        {status.playing ? <Pause size={18} color={mine ? "#FFFFFF" : colors.gold} strokeWidth={2.5} /> : <Play size={18} color={mine ? "#FFFFFF" : colors.gold} strokeWidth={2.5} />}
      </Pressable>
      <View style={{ flex: 1, gap: 7 }}>
        <Pressable
          accessibilityLabel="Selecionar trecho do áudio"
          onLayout={updateTrackWidth}
          onPress={seekAudio}
          style={{
            height: 18,
            justifyContent: "center"
          }}
        >
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: mine ? "rgba(255,255,255,0.28)" : "rgba(166,116,42,0.22)",
              overflow: "hidden"
            }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                borderRadius: 2,
                backgroundColor: mine ? "#FFFFFF" : colors.gold
              }}
            />
          </View>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: Math.max(0, trackWidth * progress - 5),
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: mine ? "#FFFFFF" : colors.gold
            }}
          />
        </Pressable>
        <Text selectable style={{ color: mine ? "rgba(255,255,255,0.78)" : colors.muted, fontSize: 11, fontWeight: "700" }}>
          {formatAudioDuration(currentMillis)} / {durationMillis ? formatAudioDuration(durationMillis) : "--:--"}
        </Text>
      </View>
    </View>
  );
}

function ChatVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return <VideoView player={player} style={{ width: 230, height: 230, backgroundColor: "#000000" }} allowsFullscreen allowsPictureInPicture />;
}

function ImagePreviewModal({ image, onClose }: { image: ImagePreview | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!image) {
      setSaving(false);
      setMessage(null);
    }
  }, [image]);

  const saveImage = async () => {
    if (!image || saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const result = await saveRemoteAsset({ fileName: image.name || "foto.jpg", type: "image", url: image.url });
      setMessage(result);
    } catch {
      setMessage("Não foi possível salvar a foto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={Boolean(image)} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#000000" }}>
        <View style={{ position: "absolute", top: 42, left: 18, right: 18, zIndex: 2, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            accessibilityLabel="Fechar imagem"
            onPress={onClose}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.48)",
              opacity: pressed ? 0.76 : 1
            })}
          >
            <X size={24} color="#FFFFFF" strokeWidth={2.6} />
          </Pressable>
          <Pressable
            accessibilityLabel="Salvar foto"
            disabled={saving}
            onPress={saveImage}
            style={({ pressed }) => ({
              minHeight: 44,
              borderRadius: 22,
              backgroundColor: "rgba(0,0,0,0.48)",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              opacity: saving ? 0.56 : pressed ? 0.76 : 1,
              paddingHorizontal: 14
            })}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Download size={19} color="#FFFFFF" strokeWidth={2.5} />}
            <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "900" }}>Salvar</Text>
          </Pressable>
        </View>
        {image ? <Image source={{ uri: image.url }} contentFit="contain" style={{ flex: 1, width: "100%", height: "100%" }} /> : null}
        {message ? (
          <View style={{ position: "absolute", left: 18, right: 18, bottom: 28, alignItems: "center" }}>
            <Text style={{ borderRadius: 999, backgroundColor: "rgba(0,0,0,0.62)", color: "#FFFFFF", fontSize: 13, fontWeight: "900", overflow: "hidden", paddingHorizontal: 14, paddingVertical: 10 }}>
              {message}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function DocumentMessage({ canOpenActions, name, onOpenActions, url }: { canOpenActions: boolean; name: string; onOpenActions: () => void; url: string }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const contextMenuProps =
    canOpenActions && Platform.OS === "web"
      ? ({
          onContextMenu: (event: any) => {
            event.preventDefault();
            onOpenActions();
          }
        } as any)
      : {};

  const saveDocument = async (event: GestureResponderEvent) => {
    event.stopPropagation();
    if (saving) return;

    setSaving(true);
    setMessage(null);
    try {
      const result = await saveRemoteAsset({ fileName: name || "documento", type: "document", url });
      setMessage(result);
    } catch {
      setMessage("Não foi possível salvar o documento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable
      delayLongPress={420}
      onLongPress={canOpenActions ? onOpenActions : undefined}
      onPress={() => Linking.openURL(url)}
      {...contextMenuProps}
      style={{
        width: 230,
        minHeight: 82,
        backgroundColor: colors.input,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 12
      }}
    >
      <FileText size={28} color={colors.gold} strokeWidth={2.3} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={2} style={{ color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: "900" }}>
          {name}
        </Text>
        <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "800" }}>
          {message || "Abrir documento"}
        </Text>
      </View>
      <Pressable
        accessibilityLabel="Salvar documento"
        disabled={saving}
        onPress={saveDocument}
        style={({ pressed }) => ({
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(184,146,74,0.18)",
          opacity: saving ? 0.56 : pressed ? 0.76 : 1
        })}
      >
        {saving ? <ActivityIndicator color={colors.gold} size="small" /> : <Download size={18} color={colors.gold} strokeWidth={2.5} />}
      </Pressable>
    </Pressable>
  );
}

function ProfileAvatar({ contact, size }: { contact: ProfileSummary | null; size: number }) {
  const name = contact?.full_name || "Contato";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.cardElevated,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      {contact?.avatar_url ? (
        <Image source={{ uri: contact.avatar_url }} contentFit="cover" style={{ width: "100%", height: "100%" }} />
      ) : (
        <Text style={{ color: colors.gold, fontSize: Math.max(13, size * 0.36), fontWeight: "900" }}>{name.slice(0, 1).toUpperCase()}</Text>
      )}
    </View>
  );
}

function IconButton({ icon, onPress }: { icon: LucideIcon; onPress?: () => void }) {
  const Icon = icon;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.input,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.76 : 1
      })}
    >
      <Icon size={18} color={colors.gold} strokeWidth={2.4} />
    </Pressable>
  );
}

function getContact(chat: Chat, currentUserId: string) {
  return chat.client_id === currentUserId ? chat.provider || null : chat.client || null;
}

function getContactId(chat: Chat, currentUserId: string) {
  return chat.client_id === currentUserId ? chat.provider_id : chat.client_id;
}

function getChatReadStorageKey(userId: string) {
  return `working.chatReadAt.${userId}`;
}

function getLocalBlocksStorageKey(userId: string) {
  return `working.blockedUsers.${userId}`;
}

function getLocalHiddenChatsStorageKey(userId: string) {
  return `working.hiddenChats.${userId}`;
}

async function getLocalHiddenChatIds(userId: string) {
  try {
    const key = getLocalHiddenChatsStorageKey(userId);
    const stored =
      Platform.OS === "web" && typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

async function setLocalHiddenChatIds(userId: string, hiddenChatIds: Set<string>) {
  const key = getLocalHiddenChatsStorageKey(userId);
  const nextValue = JSON.stringify(Array.from(hiddenChatIds));

  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, nextValue);
    return;
  }

  await SecureStore.setItemAsync(key, nextValue);
}

async function getLocalBlockedUserIds(userId: string) {
  try {
    const key = getLocalBlocksStorageKey(userId);
    const stored =
      Platform.OS === "web" && typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
    const parsed = stored ? JSON.parse(stored) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

async function setLocalBlockedUserIds(userId: string, blockedIds: Set<string>) {
  const key = getLocalBlocksStorageKey(userId);
  const nextValue = JSON.stringify(Array.from(blockedIds));

  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, nextValue);
    return;
  }

  await SecureStore.setItemAsync(key, nextValue);
}

async function getChatReadAtMap(userId: string) {
  try {
    const key = getChatReadStorageKey(userId);
    const stored =
      Platform.OS === "web" && typeof window !== "undefined" && window.localStorage
        ? window.localStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

async function setChatReadAt(userId: string, chatId: string, readAt: string) {
  const key = getChatReadStorageKey(userId);
  const current = await getChatReadAtMap(userId);
  const nextValue = JSON.stringify({ ...current, [chatId]: readAt });

  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, nextValue);
    return;
  }

  await SecureStore.setItemAsync(key, nextValue);
}

async function configurePlaybackAudioMode() {
  if (Platform.OS === "web") return;

  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldRouteThroughEarpiece: false,
    interruptionMode: "doNotMix"
  });
}

async function createWebAudioRecorder(onDurationChange: (durationMillis: number) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const AudioContextConstructor = window.AudioContext || (window as any).webkitAudioContext;
  const audioContext = new AudioContextConstructor();
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  const startedAt = Date.now();
  const recordingState: WebAudioRecordingState = {
    audioContext,
    chunks,
    processor,
    sampleRate: audioContext.sampleRate,
    source,
    startedAt,
    pauseStartedAt: null,
    pausedMillis: 0,
    stream,
    timer: setInterval(() => {
      const pausedNow = recordingState.pauseStartedAt ? Date.now() - recordingState.pauseStartedAt : 0;
      onDurationChange(Math.max(0, Date.now() - recordingState.startedAt - recordingState.pausedMillis - pausedNow));
    }, 250)
  };

  processor.onaudioprocess = (event) => {
    if (webAudioGlobalPaused) return;
    const input = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(input));
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  return recordingState;
}

let webAudioGlobalPaused = false;

function encodeWavBlob(chunks: Float32Array[], sampleRate: number) {
  const samplesLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + samplesLength * 2);
  const view = new DataView(buffer);
  const gain = getAudioNormalizationGain(chunks);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + samplesLength * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, samplesLength * 2, true);

  let offset = 44;
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      const sample = Math.max(-1, Math.min(1, chunk[index] * gain));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function getAudioNormalizationGain(chunks: Float32Array[]) {
  let peak = 0;
  for (const chunk of chunks) {
    for (let index = 0; index < chunk.length; index += 1) {
      peak = Math.max(peak, Math.abs(chunk[index]));
    }
  }

  if (peak <= 0) return 1;
  return Math.min(4, 0.92 / peak);
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

async function pickChatMediaFromGallery() {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissionResult.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: false,
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    quality: 0.85,
    videoMaxDuration: 60
  });

  return result.canceled ? null : result.assets[0] || null;
}

async function pickChatDocument() {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*"
  });

  if (result.canceled || !result.assets[0]) return null;
  const asset = result.assets[0];

  return {
    fileName: asset.name,
    mimeType: asset.mimeType || "application/octet-stream",
    type: "document" as const,
    uri: asset.uri
  };
}

function formatMediaMessage({ name, text, type, url }: { name?: string | null; text: string; type: ChatMediaType; url: string }) {
  return `${CHAT_MEDIA_PREFIX}${JSON.stringify({ name, text, type, url })}`;
}

function parseMediaMessage(content: string) {
  if (!content.startsWith(CHAT_MEDIA_PREFIX)) return null;

  try {
    const parsed = JSON.parse(content.slice(CHAT_MEDIA_PREFIX.length));
    if (!parsed?.url || (parsed.type !== "image" && parsed.type !== "video" && parsed.type !== "audio" && parsed.type !== "document")) return null;

    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      text: typeof parsed.text === "string" ? parsed.text : "",
      type: parsed.type as ChatMediaType,
      url: String(parsed.url)
    };
  } catch {
    return null;
  }
}

function getEditableMessageText(content: string) {
  const media = parseMediaMessage(content);
  return media ? media.text : content;
}

function getCopyableMessageText(content: string) {
  const media = parseMediaMessage(content);
  return (media ? media.text : content).trim();
}

function getChatMediaType(asset: ChatMediaAsset): ChatMediaType {
  if (asset.type === "audio") return "audio";
  if (asset.type === "document") return "document";
  if (asset.type === "video") return "video";
  return "image";
}

async function copyTextToClipboard(text: string) {
  await Clipboard.setStringAsync(text);
}

async function saveRemoteAsset({ fileName, type, url }: SaveRemoteAssetInput) {
  const fallbackName = type === "image" ? `foto-${Date.now()}.jpg` : `documento-${Date.now()}`;
  const resolvedFileName = getSafeDownloadFileName(fileName || getFileNameFromUrl(url) || fallbackName);

  if (Platform.OS === "web") {
    await downloadWebAsset(url, resolvedFileName);
    return type === "image" ? "Foto salva." : "Documento salvo.";
  }

  const localUri = await downloadRemoteAsset(url, resolvedFileName);

  if (type === "image") {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) throw new Error("media-library-permission-denied");

    await MediaLibrary.saveToLibraryAsync(localUri);
    return "Foto salva.";
  }

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(localUri, {
      dialogTitle: "Salvar documento",
      mimeType: getMimeTypeFromFileName(resolvedFileName),
      UTI: "public.item"
    });
    return "Documento pronto para salvar.";
  }

  await Linking.openURL(url);
  return "Documento aberto para salvar.";
}

async function downloadRemoteAsset(url: string, fileName: string) {
  const targetFile = new FileSystem.File(FileSystem.Paths.cache, `${Date.now()}-${fileName}`);
  const downloadedFile = await FileSystem.File.downloadFileAsync(url, targetFile, { idempotent: true });
  return downloadedFile.uri;
}

async function downloadWebAsset(url: string, fileName: string) {
  if (typeof document === "undefined") {
    await Linking.openURL(url);
    return;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`download-failed-${response.status}`);

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerWebDownload(objectUrl, fileName);
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
  } catch {
    triggerWebDownload(url, fileName);
  }
}

function triggerWebDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function getFileNameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const segment = parsedUrl.pathname.split("/").filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : "";
  } catch {
    const segment = url.split("?")[0].split("/").filter(Boolean).pop();
    return segment ? decodeURIComponent(segment) : "";
  }
}

function getSafeDownloadFileName(fileName: string) {
  const safeName = fileName.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return safeName || `arquivo-${Date.now()}`;
}

function getMimeTypeFromFileName(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}

async function uploadChatMediaAsset(asset: ChatMediaAsset, userId: string, chatId: string, onProgress?: (progress: number) => void) {
  onProgress?.(0.12);
  const response = await fetch(asset.uri);
  onProgress?.(0.32);
  const fileData = await response.arrayBuffer();
  onProgress?.(0.48);
  const contentType = getStorageContentType(asset, response.headers.get("content-type"));
  const extensionFromName = asset.fileName?.split(".").pop()?.toLowerCase();
  const extension = extensionFromName || contentType.split("/")[1]?.replace("jpeg", "jpg") || (asset.type === "audio" ? "m4a" : asset.type === "video" ? "mp4" : asset.type === "document" ? "bin" : "jpg");
  const path = `${userId}/chat-${chatId}-${Date.now()}.${extension}`;
  onProgress?.(0.62);
  const { error } = await supabase.storage.from("request-media").upload(path, fileData, { contentType, upsert: true });

  if (error && asset.type === "audio" && contentType.startsWith("audio/")) {
    onProgress?.(0.72);
    const fallbackContentType = contentType.includes("webm") ? "video/webm" : "video/mp4";
    const retry = await supabase.storage.from("request-media").upload(path, fileData, { contentType: fallbackContentType, upsert: true });
    if (!retry.error) {
      onProgress?.(1);
      const { data } = supabase.storage.from("request-media").getPublicUrl(path);
      return data.publicUrl;
    }
  }

  if (error) throw error;
  onProgress?.(1);
  const { data } = supabase.storage.from("request-media").getPublicUrl(path);
  return data.publicUrl;
}

async function removeChatMediaAsset(url: string) {
  const path = getRequestMediaStoragePath(url);
  if (!path) return;

  await supabase.storage.from("request-media").remove([path]);
}

function getRequestMediaStoragePath(url: string) {
  const marker = "/storage/v1/object/public/request-media/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;

  const rawPath = url.slice(markerIndex + marker.length).split("?")[0];
  return rawPath ? decodeURIComponent(rawPath) : null;
}

function getStorageContentType(asset: ChatMediaAsset, responseContentType: string | null) {
  if (asset.type === "audio") {
    const mimeType = asset.mimeType || responseContentType || "";
    if (mimeType.includes("webm")) return "video/webm";
    if (mimeType.includes("wav")) return "audio/wav";
    return "video/mp4";
  }

  return asset.mimeType || responseContentType || (asset.type === "video" ? "video/mp4" : asset.type === "document" ? "application/octet-stream" : "image/jpeg");
}

function getRecordedAudioMimeType(uri: string) {
  const lowerUri = uri.toLowerCase();
  if (lowerUri.includes(".webm")) return "audio/webm";
  if (lowerUri.includes(".m4a") || lowerUri.includes(".mp4")) return "audio/mp4";
  if (lowerUri.includes(".wav")) return "audio/wav";
  if (Platform.OS === "web") return "audio/wav";
  return "audio/mp4";
}

function getRecordedAudioExtension(uri: string) {
  const mimeType = getRecordedAudioMimeType(uri);
  if (mimeType === "audio/webm") return "webm";
  if (mimeType === "audio/wav") return "wav";
  return "m4a";
}

function formatAudioDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatShortTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}
