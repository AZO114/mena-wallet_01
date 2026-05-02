import { Bot, Camera, ChevronDown, ChevronUp, FileText, ImageIcon, Paperclip, Send, Trash2, X, Zap } from "lucide-react-native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, useThemeToggle } from "@/context/ThemeContext";
import { useApp, AiMessage } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

interface AttachedFile {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  isImage: boolean;
  base64?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  imageUris?: string[];
  docNames?: string[];
  id: string;
  isError?: boolean;
}

const QUICK_QUESTIONS = [
  "كم إجمالي القيم المعلقة؟",
  "من استلم آخر قيمة؟",
  "أعطني ملخص اليوم",
  "كم نسبة الاستلام؟",
  "ما القيم غير المسددة؟",
  "قارن هذا الشهر بالسابق",
];

const RATE_LIMIT_MSGS = [
  "rate limit",
  "quota",
  "429",
  "too many requests",
  "capacity",
  "overloaded",
];

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/bmp", "image/tiff"];

function isImageMime(mime: string) {
  return IMAGE_MIMES.some((m) => mime?.toLowerCase().startsWith(m.split("/")[0] + "/") && IMAGE_MIMES.includes(mime?.toLowerCase()));
}

function isRateLimitError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return RATE_LIMIT_MSGS.some((k) => lower.includes(k));
}

async function compressImageToBase64(uri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );
    return `data:image/jpeg;base64,${result.base64}`;
  } catch {
    return uri;
  }
}

function getFileIcon(mimeType: string) {
  if (mimeType?.includes("pdf")) return "PDF";
  if (mimeType?.includes("word") || mimeType?.includes("docx")) return "DOC";
  if (mimeType?.includes("sheet") || mimeType?.includes("xlsx") || mimeType?.includes("excel")) return "XLS";
  if (mimeType?.includes("text")) return "TXT";
  return "FILE";
}

export default function AiScreen() {
  const { user, sendAiMessage } = useApp();
  const C = useTheme();
  const { isDark, toggleTheme } = useThemeToggle();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();

  const welcomeText = lang === "ar"
    ? "مرحباً! أنا Mena AI 🤖\n\nأستطيع مساعدتك في:\n• تحليل المعاملات والتقارير المالية\n• الإجابة على أي سؤال عن القيم\n• تحليل الصور والفواتير والمستندات\n\nيمكنك إرفاق عدة صور ومستندات وسأتذكرها طوال المحادثة 👇"
    : "Hello! I'm Mena AI 🤖\n\nI can help you with:\n• Analyzing transactions and financial reports\n• Answering any question about values\n• Analyzing images, invoices, and documents\n\nYou can attach images and documents and I'll remember them 👇";

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", role: "assistant", text: welcomeText },
  ]);
  const [inputText, setInputText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = overrideText ?? inputText;
    if (!text.trim() && attachedFiles.length === 0) return;

    const imageFiles = attachedFiles.filter((f) => f.isImage && f.base64);
    const docFiles = attachedFiles.filter((f) => !f.isImage);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      imageUris: imageFiles.map((f) => f.base64!),
      docNames: docFiles.map((f) => f.name),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setAttachedFiles([]);
    setShowQuick(false);
    setLoading(true);
    scrollToBottom();

    try {
      const historyForApi: AiMessage[] = messages
        .filter((m) => m.id !== "0" && !m.isError)
        .slice(-16)
        .map((m) => {
          if ((m.imageUris && m.imageUris.length > 0) || (m.docNames && m.docNames.length > 0)) {
            const parts: any[] = [];
            if (m.text) parts.push({ type: "text", text: m.text });
            (m.imageUris || []).forEach((uri) => parts.push({ type: "image_url", image_url: { url: uri } }));
            if (m.docNames && m.docNames.length > 0) {
              parts.push({ type: "text", text: `[مرفقات: ${m.docNames.join("، ")}]` });
            }
            return { role: m.role, content: parts };
          }
          return { role: m.role, content: m.text };
        });

      const newParts: any[] = [];
      let msgText = text.trim();
      if (docFiles.length > 0) {
        msgText += `\n\n[ملفات مرفقة: ${docFiles.map((f) => `${f.name} (${getFileIcon(f.mimeType)})`).join("، ")}]`;
      }
      if (msgText) newParts.push({ type: "text", text: msgText });
      imageFiles.forEach((f) => newParts.push({ type: "image_url", image_url: { url: f.base64! } }));

      const newMsg: AiMessage = {
        role: "user",
        content: newParts.length === 1 && newParts[0].type === "text" ? newParts[0].text : newParts,
      };
      historyForApi.push(newMsg);

      const response = await sendAiMessage(historyForApi);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", text: response },
      ]);
    } catch (e: any) {
      const errMsg = e.message || "تعذر الاتصال";
      const isRateLimit = isRateLimitError(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          text: isRateLimit
            ? "⏳ نقاط الـ API انتهت مؤقتاً\n\nتم استخدام حد الطلبات المجانية. ارجع بعد دقيقة أو دقيقتين وسيعمل تلقائياً.\n\nالنموذج المجاني يحدّ الطلبات كل دقيقة."
            : `⚠️ خطأ: ${errMsg}`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }, [inputText, attachedFiles, messages, sendAiMessage, scrollToBottom]);

  const pickImages = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      allowsEditing: false,
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets.length > 0) {
      setCompressing(true);
      try {
        const newFiles: AttachedFile[] = await Promise.all(
          result.assets.map(async (asset) => {
            const base64 = await compressImageToBase64(asset.uri);
            return {
              id: Date.now().toString() + Math.random(),
              uri: asset.uri,
              name: asset.fileName || `صورة_${Date.now()}.jpg`,
              mimeType: asset.mimeType || "image/jpeg",
              isImage: true,
              base64,
            };
          })
        );
        setAttachedFiles((prev) => [...prev, ...newFiles]);
      } finally {
        setCompressing(false);
      }
    }
  }, []);

  const handleCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
      base64: false,
    });

    if (!result.canceled && result.assets[0]) {
      setCompressing(true);
      try {
        const base64 = await compressImageToBase64(result.assets[0].uri);
        setAttachedFiles((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            uri: result.assets[0].uri,
            name: `صورة_${Date.now()}.jpg`,
            mimeType: "image/jpeg",
            isImage: true,
            base64,
          },
        ]);
      } finally {
        setCompressing(false);
      }
    }
  }, []);

  const pickDocuments = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      setCompressing(true);
      try {
        const newFiles: AttachedFile[] = await Promise.all(
          result.assets.map(async (asset) => {
            const mime = asset.mimeType || "";
            const isImg = isImageMime(mime) || IMAGE_MIMES.some((m) => asset.name?.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif|bmp|heic|tiff)$/));

            let base64: string | undefined;
            if (isImg) {
              base64 = await compressImageToBase64(asset.uri);
            }

            return {
              id: Date.now().toString() + Math.random(),
              uri: asset.uri,
              name: asset.name || "ملف",
              mimeType: mime,
              isImage: isImg,
              base64,
            };
          })
        );
        setAttachedFiles((prev) => [...prev, ...newFiles]);
      } finally {
        setCompressing(false);
      }
    } catch {}
  }, []);

  const removeFile = useCallback((id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearChat = useCallback(() => {
    setMessages([{
      id: "0",
      role: "assistant",
      text: "مرحباً! أنا Mena AI 🤖\n\nأستطيع مساعدتك في:\n• تحليل المعاملات والتقارير المالية\n• الإجابة على أي سؤال عن القيم\n• تحليل الصور والفواتير والمستندات\n\nيمكنك إرفاق عدة صور ومستندات وسأتذكرها طوال المحادثة 👇",
    }]);
    setInputText("");
    setAttachedFiles([]);
    setShowQuick(false);
  }, []);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";
    const isError = item.isError;
    return (
      <View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowAi]}>
        {!isUser && (
          <View style={[styles.aiAvatar, { backgroundColor: isError ? C.danger : C.tint }]}>
            {isError ? <Zap size={16} color="#fff" /> : <Bot size={18} color="#fff" />}
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isUser
              ? [styles.userBubble, { backgroundColor: C.tint }]
              : [styles.aiBubble, { backgroundColor: isError ? (C.isDark ? "#450A0A" : "#FFF1F2") : C.surface, borderColor: isError ? C.danger : C.border }],
          ]}
        >
          {item.imageUris && item.imageUris.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {item.imageUris.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.messageImage} resizeMode="cover" />
                ))}
              </View>
            </ScrollView>
          )}
          {item.docNames && item.docNames.length > 0 && (
            <View style={{ gap: 4 }}>
              {item.docNames.map((name, i) => (
                <View key={i} style={[styles.docChip, { backgroundColor: isUser ? "rgba(255,255,255,0.2)" : C.surfaceSecondary }]}>
                  <FileText size={12} color={isUser ? "#fff" : C.tint} />
                  <Text style={[styles.docChipText, { color: isUser ? "#fff" : C.text }]} numberOfLines={1}>{name}</Text>
                </View>
              ))}
            </View>
          )}
          {item.text ? (
            <Text style={[styles.messageText, { color: isUser ? "#fff" : isError ? C.danger : C.text }]}>
              {item.text}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  const canSend = !loading && (inputText.trim().length > 0 || attachedFiles.length > 0);

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: C.background, borderBottomColor: C.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.aiHeaderAvatar, { backgroundColor: C.tint }]}>
            <Bot size={22} color="#fff" />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>Mena AI</Text>
            <Text style={[styles.headerSubtitle, { color: loading ? C.warning : C.success }]}>
              {loading ? t("aiThinking") : t("aiConnected")}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={toggleTheme} style={[styles.headerBtn, { backgroundColor: C.surfaceSecondary }]}>
            <Text style={{ fontSize: 16 }}>{isDark ? "☀️" : "🌙"}</Text>
          </Pressable>
          <Pressable onPress={clearChat} style={[styles.headerBtn, { backgroundColor: C.surfaceSecondary }]}>
            <Trash2 size={18} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : Platform.OS === "web" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={[styles.messagesList, { paddingBottom: 16 }]}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />

        {loading && (
          <View style={[styles.typingRow, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.aiAvatar, { backgroundColor: C.tint }]}>
              <Bot size={16} color="#fff" />
            </View>
            <ActivityIndicator size="small" color={C.tint} />
            <Text style={[styles.typingText, { color: C.textSecondary }]}>Mena AI {t("aiThinking")}</Text>
          </View>
        )}

        {(attachedFiles.length > 0 || compressing) && (
          <View style={[styles.attachedPanel, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={styles.attachedHeader}>
              <Text style={[styles.attachedTitle, { color: C.textSecondary }]}>
                {compressing ? "جاري المعالجة..." : `${attachedFiles.length} ملف مرفق — سيبقى في المحادثة`}
              </Text>
              {attachedFiles.length > 0 && (
                <Pressable onPress={() => setAttachedFiles([])}>
                  <Text style={[{ color: C.danger, fontSize: 12, fontFamily: "Inter_400Regular" }]}>حذف الكل</Text>
                </Pressable>
              )}
            </View>
            {compressing && <ActivityIndicator size="small" color={C.tint} style={{ alignSelf: "flex-start" }} />}
            {attachedFiles.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.attachedRow}>
                  {attachedFiles.map((file) => (
                    <View key={file.id} style={[styles.fileChip, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
                      {file.isImage && file.base64 ? (
                        <Image source={{ uri: file.base64 }} style={styles.fileThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.fileIconBox, { backgroundColor: C.tint + "22" }]}>
                          <Text style={[styles.fileIconText, { color: C.tint }]}>{getFileIcon(file.mimeType)}</Text>
                        </View>
                      )}
                      <Text style={[styles.fileName, { color: C.text }]} numberOfLines={1}>{file.name}</Text>
                      <Pressable style={[styles.removeBtn, { backgroundColor: C.danger }]} onPress={() => removeFile(file.id)}>
                        <X size={10} color="#fff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {showQuick && (
          <View style={[styles.quickPanel, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.quickTitle, { color: C.textSecondary }]}>اقتراحات سريعة:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.quickRow}>
                {QUICK_QUESTIONS.map((q, i) => (
                  <Pressable
                    key={i}
                    style={[styles.quickBtn, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}
                    onPress={() => { setInputText(q); setShowQuick(false); inputRef.current?.focus(); }}
                  >
                    <Text style={[styles.quickBtnText, { color: C.text }]}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View style={[styles.inputBar, { backgroundColor: C.background, borderTopColor: C.border, paddingBottom: insets.bottom + (Platform.OS === "web" ? 80 : 8) }]}>
          <View style={styles.inputRow}>
            <Pressable style={[styles.attachBtn, { backgroundColor: C.surfaceSecondary }]} onPress={pickImages}>
              <ImageIcon size={20} color={C.tint} />
            </Pressable>

            <Pressable style={[styles.attachBtn, { backgroundColor: C.surfaceSecondary }]} onPress={pickDocuments}>
              <Paperclip size={20} color={C.tint} />
            </Pressable>

            {Platform.OS !== "web" && (
              <Pressable style={[styles.attachBtn, { backgroundColor: C.surfaceSecondary }]} onPress={handleCamera}>
                <Camera size={20} color={C.tint} />
              </Pressable>
            )}

            <Pressable
              style={[styles.attachBtn, { backgroundColor: showQuick ? (C.isDark ? "#1E3A8A33" : "#EEF2FF") : C.surfaceSecondary }]}
              onPress={() => setShowQuick((s) => !s)}
            >
              {showQuick ? <ChevronDown size={20} color={C.tint} /> : <ChevronUp size={20} color={C.textSecondary} />}
            </Pressable>

            <TextInput
              ref={inputRef}
              style={[styles.input, { backgroundColor: C.surface, color: C.text, borderColor: inputText ? C.tint : C.border }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder={attachedFiles.length > 0 ? t("askAboutFiles") : t("typeMessage")}
              placeholderTextColor={C.textMuted}
              multiline
              maxLength={4000}
              onSubmitEditing={() => handleSend()}
              returnKeyType="send"
              blurOnSubmit={false}
            />

            <Pressable
              style={[styles.sendBtn, { backgroundColor: canSend ? C.tint : C.surfaceSecondary }]}
              onPress={() => handleSend()}
              disabled={!canSend}
            >
              {loading
                ? <ActivityIndicator size="small" color={C.tint} />
                : <Send size={20} color={canSend ? "#fff" : C.textMuted} />
              }
            </Pressable>
          </View>

          <Text style={[styles.hint, { color: C.textMuted }]}>
            صور • مستندات • PDF • Excel • Word — تبقى في المحادثة
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiHeaderAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  headerRight: { flexDirection: "row", gap: 8 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  messagesList: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  messageRow: { flexDirection: "row", gap: 10 },
  messageRowUser: { justifyContent: "flex-end" },
  messageRowAi: { justifyContent: "flex-start" },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", alignSelf: "flex-end" },
  messageBubble: { borderRadius: 18, padding: 12, gap: 8, maxWidth: "82%" },
  userBubble: {},
  aiBubble: { borderWidth: 1 },
  messageImage: { width: 160, height: 120, borderRadius: 10 },
  messageText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  docChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  docChipText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  typingRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    marginHorizontal: 16, marginBottom: 8, padding: 12, borderRadius: 16, borderWidth: 1,
  },
  typingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  attachedPanel: {
    marginHorizontal: 12, marginBottom: 6, padding: 10,
    borderRadius: 14, borderWidth: 1, gap: 8,
  },
  attachedHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  attachedTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  attachedRow: { flexDirection: "row", gap: 8 },
  fileChip: {
    width: 90, borderRadius: 12, borderWidth: 1, overflow: "hidden",
    alignItems: "center", padding: 6, gap: 4, position: "relative",
  },
  fileThumb: { width: 78, height: 60, borderRadius: 8 },
  fileIconBox: { width: 78, height: 60, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  fileIconText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  fileName: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", width: "100%" },
  removeBtn: {
    position: "absolute", top: 4, right: 4,
    width: 18, height: 18, borderRadius: 9, justifyContent: "center", alignItems: "center",
  },
  quickPanel: {
    marginHorizontal: 12, marginBottom: 6, padding: 10,
    borderRadius: 14, borderWidth: 1, gap: 8,
  },
  quickTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  quickRow: { flexDirection: "row", gap: 8 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  quickBtnText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  inputBar: { paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, gap: 6 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  attachBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  input: {
    flex: 1, borderWidth: 1.5, borderRadius: 22,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10,
    fontSize: 14, fontFamily: "Inter_400Regular",
    maxHeight: 120, minHeight: 44,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center", paddingBottom: 2 },
});
