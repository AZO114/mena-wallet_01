import { Download, Share2, X, ZoomIn } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface ImageViewerProps {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
  title?: string;
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export default function ImageViewer({ uri, visible, onClose, title }: ImageViewerProps) {
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!uri) return null;

  const saveToGallery = async () => {
    if (Platform.OS === "web") {
      Alert.alert("تنبيه", "الحفظ غير مدعوم على الويب");
      return;
    }
    setSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("رفض الإذن", "يجب السماح بالوصول إلى معرض الصور لحفظ الصورة");
        return;
      }

      let fileUri = uri;

      if (uri.startsWith("data:")) {
        const base64Data = uri.split(",")[1];
        const ext = uri.includes("png") ? "png" : "jpg";
        fileUri = `${FileSystem.cacheDirectory}mena_image_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      await MediaLibrary.saveToLibraryAsync(fileUri);
      Alert.alert("✅ تم الحفظ", "تم حفظ الصورة في معرض الصور بنجاح");
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "فشل حفظ الصورة");
    } finally {
      setSaving(false);
    }
  };

  const shareImage = async () => {
    if (Platform.OS === "web") {
      Alert.alert("تنبيه", "المشاركة غير مدعومة على الويب");
      return;
    }
    setSharing(true);
    try {
      let fileUri = uri;

      if (uri.startsWith("data:")) {
        const base64Data = uri.split(",")[1];
        const ext = uri.includes("png") ? "png" : "jpg";
        fileUri = `${FileSystem.cacheDirectory}mena_share_${Date.now()}.${ext}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: uri.includes("png") ? "image/png" : "image/jpeg",
          dialogTitle: title || "مشاركة الصورة",
        });
      } else {
        Alert.alert("تنبيه", "المشاركة غير متاحة على هذا الجهاز");
      }
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "فشل مشاركة الصورة");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.container}>
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
            <X size={24} color="#fff" />
          </Pressable>
          {title ? (
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
          ) : null}
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.bottomBar}>
          {Platform.OS !== "web" && (
            <Pressable
              style={[styles.actionBtn, saving && styles.actionBtnDisabled]}
              onPress={saveToGallery}
              disabled={saving || sharing}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Download size={22} color="#fff" />}
              <Text style={styles.actionBtnText}>{saving ? "جاري الحفظ..." : "حفظ"}</Text>
            </Pressable>
          )}

          {Platform.OS !== "web" && (
            <Pressable
              style={[styles.actionBtn, sharing && styles.actionBtnDisabled]}
              onPress={shareImage}
              disabled={saving || sharing}
            >
              {sharing
                ? <ActivityIndicator size="small" color="#fff" />
                : <Share2 size={22} color="#fff" />}
              <Text style={styles.actionBtnText}>{sharing ? "جاري المشاركة..." : "مشاركة"}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function ImageThumb({
  uri,
  style,
  title,
  resizeMode = "cover",
}: {
  uri: string;
  style?: any;
  title?: string;
  resizeMode?: "cover" | "contain" | "stretch";
}) {
  const [viewerVisible, setViewerVisible] = useState(false);

  return (
    <>
      <Pressable onPress={() => setViewerVisible(true)} style={[styles.thumbWrap, style]}>
        <Image source={{ uri }} style={styles.thumbFull} resizeMode={resizeMode} />
        <View style={styles.thumbOverlay}>
          <ZoomIn size={16} color="#fff" />
        </View>
      </Pressable>
      <ImageViewer
        uri={uri}
        visible={viewerVisible}
        onClose={() => setViewerVisible(false)}
        title={title}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" },
  image: { width: SCREEN_W, height: SCREEN_H },
  topBar: {
    position: "absolute", top: 48, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  closeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  title: {
    flex: 1, textAlign: "center",
    fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff",
    marginHorizontal: 12,
    textShadowColor: "rgba(0,0,0,0.8)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  bottomBar: {
    position: "absolute", bottom: 40, left: 0, right: 0,
    flexDirection: "row", justifyContent: "center", gap: 16, paddingHorizontal: 24,
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)",
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: "#fff" },
  thumbWrap: { position: "relative" },
  thumbFull: { width: "100%", height: "100%" },
  thumbOverlay: {
    position: "absolute", bottom: 6, right: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12, padding: 4,
  },
});
