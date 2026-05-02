import {
  AlertCircle,
  ArrowLeft,
  BadgeDollarSign,
  CalendarDays,
  Camera,
  CheckCircle,
  Clock,
  Edit2,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Trash2,
  User,
  Users,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-LY", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
}

async function pickAndCompressImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.7,
  });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return compressed.base64 ? `data:image/jpeg;base64,${compressed.base64}` : null;
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, transactions, confirmTransaction, deleteTransaction } = useApp();
  const C = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [confirmationImage, setConfirmationImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const transaction = useMemo(
    () => transactions.find((t) => t.id === id),
    [transactions, id]
  );

  useEffect(() => {
    if (!user) { router.replace("/"); return; }
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, [user]);

  if (!user) return null;
  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center" }]}>
        <AlertCircle size={48} color={C.textMuted} />
        <Text style={[styles.notFoundText, { color: C.textSecondary }]}>المعاملة غير موجودة</Text>
        <Pressable style={[styles.backBtn, { backgroundColor: C.tint }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>{t("back")}</Text>
        </Pressable>
      </View>
    );
  }

  const isPending = transaction.status === "pending";
  const isSender = user.role === "sender";
  const isReceiver = user.role === "receiver";
  const canEdit = isSender && isPending;
  const canConfirm = isReceiver && isPending;
  const paidRatio = transaction.amount > 0 ? transaction.paidAmount / transaction.amount : 0;
  const remaining = transaction.amount - transaction.paidAmount;

  const handlePickConfirmImage = async () => {
    setImageLoading(true);
    try {
      const base64 = await pickAndCompressImage();
      if (base64) setConfirmationImage(base64);
    } catch {
      // ignore
    } finally {
      setImageLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmTransaction(
        transaction.id,
        confirmationNotes.trim() || undefined,
        confirmationImage ?? undefined
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfirmModal(false);
      setConfirmationNotes("");
      setConfirmationImage(null);
    } catch (e: any) {
      Alert.alert(t("error"), e.message || "فشل التأكيد");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    const message = `هل تريد حذف قيمة ${transaction.senderName}؟ لا يمكن التراجع عن هذا الإجراء.`;

    const performDelete = async () => {
      setLoading(true);
      try {
        await deleteTransaction(transaction.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (e: any) {
        if (Platform.OS === "web") {
          window.alert(e.message || "فشل الحذف");
        } else {
          Alert.alert(t("error"), e.message || "فشل الحذف");
        }
      } finally {
        setLoading(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`تأكيد الحذف\n\n${message}`)) {
        performDelete();
      }
      return;
    }

    Alert.alert(
      "تأكيد الحذف",
      message,
      [
        { text: t("cancel"), style: "cancel" },
        { text: t("delete"), style: "destructive", onPress: performDelete },
      ]
    );
  };

  const InfoRow = ({
    icon,
    label,
    value,
    valueColor,
  }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) => (
    <View style={[styles.infoRow, { borderBottomColor: C.border }]}>
      <View style={styles.infoLeft}>
        <View style={[styles.infoIcon, { backgroundColor: C.surfaceSecondary }]}>{icon}</View>
        <Text style={[styles.infoLabel, { color: C.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: valueColor ?? C.text }]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
            backgroundColor: C.background,
            borderBottomColor: C.border,
          },
        ]}
      >
        <Pressable style={[styles.headerIconBtn, { backgroundColor: C.surfaceSecondary }]} onPress={() => router.back()}>
          <ArrowLeft size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>{t("transactionDetails")}</Text>
        <View style={styles.headerActions}>
          {canEdit && (
            <Pressable
              style={[styles.headerIconBtn, { backgroundColor: C.isDark ? "#1e3a8a33" : "#EEF2FF" }]}
              onPress={() => router.push({ pathname: "/edit-transaction", params: { id: transaction.id } })}
            >
              <Edit2 size={20} color={C.tint} />
            </Pressable>
          )}
          {isSender && (
            <Pressable
              style={[styles.headerIconBtn, { backgroundColor: C.isDark ? "#450A0A" : "#FEF2F2" }]}
              onPress={handleDelete}
            >
              {loading
                ? <ActivityIndicator size="small" color={C.danger} />
                : <Trash2 size={20} color={C.danger} />}
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.animatedContent, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={
              isPending
                ? (C.isDark ? ["#2D1B0E", "#3D2408"] : ["#FFFBEB", "#FEF3C7"])
                : (C.isDark ? ["#052E16", "#064E3B"] : ["#ECFDF5", "#D1FAE5"])
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={[styles.heroIconBg, { backgroundColor: isPending ? C.pendingBg : C.receivedBg }]}>
              {isPending
                ? <Clock size={32} color={C.warning} />
                : <CheckCircle size={32} color={C.success} />}
            </View>
            <Text style={[styles.heroAmount, { color: isPending ? C.warning : C.success }]}>
              {formatAmount(transaction.amount)}{" "}
              <Text style={[styles.heroCurrency, { color: isPending ? C.warning : C.success }]}>{t("lyD")}</Text>
            </Text>
            <View style={[styles.heroStatusBadge, { backgroundColor: isPending ? C.pendingBg : C.receivedBg }]}>
              <Text style={[styles.heroStatusText, { color: isPending ? C.warning : C.success }]}>
                {isPending ? `● ${t("pending")}` : `● ${t("received")}`}
              </Text>
            </View>

            {transaction.paidAmount > 0 && (
              <View style={styles.heroPaidSection}>
                <View style={styles.heroPaidRow}>
                  <View style={styles.heroPaidStat}>
                    <Text style={[styles.heroPaidValue, { color: C.success }]}>{formatAmount(transaction.paidAmount)}</Text>
                    <Text style={[styles.heroPaidLabel, { color: C.textSecondary }]}>{t("paid")}</Text>
                  </View>
                  <View style={[styles.heroPaidSep, { backgroundColor: C.border }]} />
                  <View style={styles.heroPaidStat}>
                    <Text style={[styles.heroPaidValue, { color: remaining > 0 ? C.danger : C.success }]}>{formatAmount(remaining)}</Text>
                    <Text style={[styles.heroPaidLabel, { color: C.textSecondary }]}>{t("remaining")}</Text>
                  </View>
                  <View style={[styles.heroPaidSep, { backgroundColor: C.border }]} />
                  <View style={styles.heroPaidStat}>
                    <Text style={[styles.heroPaidValue, { color: C.tint }]}>{Math.round(paidRatio * 100)}%</Text>
                    <Text style={[styles.heroPaidLabel, { color: C.textSecondary }]}>{t("paymentRate")}</Text>
                  </View>
                </View>
                <View style={[styles.heroProgressTrack, { backgroundColor: C.border }]}>
                  <View style={[styles.heroProgressFill, {
                    width: `${Math.min(Math.round(paidRatio * 100), 100)}%` as any,
                    backgroundColor: paidRatio >= 1 ? C.success : C.tint,
                  }]} />
                </View>
              </View>
            )}
          </LinearGradient>

          <View style={[styles.detailsCard, { backgroundColor: C.surface }]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t("transactionDetails")}</Text>
            <InfoRow icon={<User size={16} color={C.tint} />} label={t("valueOwner")} value={transaction.senderName} />
            <InfoRow icon={<Users size={16} color={C.tint} />} label={t("recipientLabel")} value={transaction.recipientName} />
            <InfoRow
              icon={<BadgeDollarSign size={16} color={C.success} />}
              label={t("paid")}
              value={`${formatAmount(transaction.paidAmount)} ${t("lyD")}`}
              valueColor={C.success}
            />
            <InfoRow
              icon={<BadgeDollarSign size={16} color={C.danger} />}
              label={t("remaining")}
              value={`${formatAmount(remaining)} ${t("lyD")}`}
              valueColor={remaining > 0 ? C.danger : C.success}
            />
            <InfoRow
              icon={<CalendarDays size={16} color={C.textSecondary} />}
              label={t("addedDate")}
              value={`${formatDate(transaction.createdAt)} · ${formatTime(transaction.createdAt)}`}
            />
            {transaction.notes && (
              <InfoRow
                icon={<FileText size={16} color={C.textSecondary} />}
                label={t("notes")}
                value={transaction.notes}
              />
            )}
            {transaction.notesAttachment && (
              <View style={[styles.attachmentRow, { borderBottomColor: C.border }]}>
                <View style={styles.infoLeft}>
                  <View style={[styles.infoIcon, { backgroundColor: C.surfaceSecondary }]}>
                    <ImageIcon size={16} color={C.textSecondary} />
                  </View>
                  <Text style={[styles.infoLabel, { color: C.textSecondary }]}>{t("attachment")}</Text>
                </View>
                <Image
                  source={{ uri: transaction.notesAttachment }}
                  style={styles.attachmentThumb}
                  resizeMode="cover"
                />
              </View>
            )}
          </View>

          {!isPending && (
            <View style={[styles.detailsCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>{t("receiptDetails")}</Text>
              <InfoRow
                icon={<User size={16} color={C.success} />}
                label={t("receivedBy")}
                value={transaction.confirmedByName ?? "غير معروف"}
                valueColor={C.success}
              />
              {transaction.confirmedAt && (
                <InfoRow
                  icon={<CalendarDays size={16} color={C.textSecondary} />}
                  label={t("receiptTime")}
                  value={`${formatDate(transaction.confirmedAt)} · ${formatTime(transaction.confirmedAt)}`}
                />
              )}
              {transaction.confirmationNotes && (
                <InfoRow
                  icon={<MessageSquare size={16} color={C.textSecondary} />}
                  label={t("receiptNote")}
                  value={transaction.confirmationNotes}
                />
              )}
              {transaction.confirmationAttachment && (
                <View style={[styles.attachmentRow, { borderBottomColor: C.border }]}>
                  <View style={styles.infoLeft}>
                    <View style={[styles.infoIcon, { backgroundColor: C.surfaceSecondary }]}>
                      <ImageIcon size={16} color={C.success} />
                    </View>
                    <Text style={[styles.infoLabel, { color: C.textSecondary }]}>{t("receiptAttachment")}</Text>
                  </View>
                  <Image
                    source={{ uri: transaction.confirmationAttachment }}
                    style={styles.attachmentThumb}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {canConfirm && (
        <View
          style={[
            styles.actionBar,
            {
              backgroundColor: C.background,
              borderTopColor: C.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.confirmBtn,
              { backgroundColor: C.success, shadowColor: C.success },
              pressed && styles.confirmBtnPressed,
            ]}
            onPress={() => setShowConfirmModal(true)}
          >
            <CheckCircle size={22} color="#fff" />
            <Text style={styles.confirmBtnText}>{t("confirmReceipt")}</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: C.surface }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalIconBg, { backgroundColor: C.isDark ? "#064E3B33" : "#ECFDF5" }]}>
              <CheckCircle size={28} color={C.success} />
            </View>
            <Text style={[styles.modalTitle, { color: C.text }]}>{t("confirmReceiptTitle")}</Text>
            <View style={[styles.modalAmountBox, { backgroundColor: C.isDark ? "#064E3B22" : "#F0FDF4" }]}>
              <Text style={[styles.modalSenderName, { color: C.text }]}>{transaction.senderName}</Text>
              <Text style={[styles.modalAmount, { color: C.success }]}>
                {formatAmount(transaction.amount)} <Text style={{ fontSize: 16 }}>{t("lyD")}</Text>
              </Text>
            </View>

            <View style={styles.noteField}>
              <Text style={[styles.noteLabel, { color: C.text }]}>{t("receiptNoteOptional")}</Text>
              <TextInput
                style={[
                  styles.noteInput,
                  { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary },
                ]}
                value={confirmationNotes}
                onChangeText={setConfirmationNotes}
                placeholder="أدخل أي ملاحظات عند الاستلام..."
                placeholderTextColor={C.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                textAlign="right"
              />
            </View>

            <View style={styles.imagePickerSection}>
              <Text style={[styles.noteLabel, { color: C.text }]}>{t("attachReceiptImage")}</Text>
              {confirmationImage ? (
                <View style={styles.imagePreviewWrap}>
                  <Image source={{ uri: confirmationImage }} style={styles.modalImagePreview} resizeMode="cover" />
                  <View style={styles.imageOverlayBtns}>
                    <Pressable
                      style={[styles.imageOverlayBtn, { backgroundColor: C.tint }]}
                      onPress={handlePickConfirmImage}
                    >
                      <Camera size={14} color="#fff" />
                      <Text style={styles.imageOverlayBtnText}>{t("changeImage")}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.imageOverlayBtn, { backgroundColor: C.danger }]}
                      onPress={() => setConfirmationImage(null)}
                    >
                      <Trash2 size={14} color="#fff" />
                      <Text style={styles.imageOverlayBtnText}>{t("removeImage")}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable
                  style={[styles.modalImagePickerBtn, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                  onPress={handlePickConfirmImage}
                  disabled={imageLoading}
                >
                  {imageLoading
                    ? <ActivityIndicator color={C.tint} size="small" />
                    : <>
                        <ImageIcon size={18} color={C.tint} />
                        <Text style={[styles.modalImagePickerText, { color: C.tint }]}>{t("attachReceiptImage")}</Text>
                      </>
                  }
                </Pressable>
              )}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalCancelBtn, { backgroundColor: C.surfaceSecondary }]}
                onPress={() => { setShowConfirmModal(false); setConfirmationNotes(""); setConfirmationImage(null); }}
              >
                <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: C.success, shadowColor: C.success }]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalConfirmText}>{t("confirmReceipt")}</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  headerIconBtn: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerActions: { flexDirection: "row", gap: 8 },
  scrollContent: { padding: 16, gap: 14 },
  animatedContent: { gap: 14 },
  heroCard: { borderRadius: 24, padding: 22, alignItems: "center", gap: 10 },
  heroIconBg: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  heroAmount: { fontSize: 40, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroCurrency: { fontSize: 20, fontFamily: "Inter_500Medium" },
  heroStatusBadge: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 20 },
  heroStatusText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  heroPaidSection: { width: "100%", gap: 10, marginTop: 6 },
  heroPaidRow: { flexDirection: "row", justifyContent: "space-around", alignItems: "center" },
  heroPaidStat: { alignItems: "center", gap: 3 },
  heroPaidSep: { width: 1, height: 30 },
  heroPaidValue: { fontSize: 15, fontFamily: "Inter_700Bold" },
  heroPaidLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  heroProgressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  heroProgressFill: { height: "100%", borderRadius: 3 },
  detailsCard: {
    borderRadius: 20, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 10 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11, borderBottomWidth: 1,
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  infoIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right", flex: 1, marginLeft: 8 },
  attachmentRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11, borderBottomWidth: 1,
  },
  attachmentThumb: { width: 80, height: 60, borderRadius: 8 },
  actionBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1 },
  confirmBtn: {
    borderRadius: 16, paddingVertical: 18, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  confirmBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  confirmBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular", marginTop: 16 },
  backBtn: { borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  backBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" },
  modalContent: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", marginBottom: 4 },
  modalIconBg: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalAmountBox: { width: "100%", borderRadius: 16, padding: 14, alignItems: "center", gap: 4 },
  modalSenderName: { fontSize: 14, fontFamily: "Inter_500Medium" },
  modalAmount: { fontSize: 26, fontFamily: "Inter_700Bold" },
  noteField: { gap: 8, width: "100%" },
  noteLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  noteInput: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 70,
    width: "100%",
  },
  imagePickerSection: { gap: 8, width: "100%" },
  modalImagePickerBtn: {
    borderWidth: 1.5, borderRadius: 12, borderStyle: "dashed",
    paddingVertical: 14, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8, width: "100%",
  },
  modalImagePickerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  imagePreviewWrap: { borderRadius: 12, overflow: "hidden", width: "100%" },
  modalImagePreview: { width: "100%", height: 150 },
  imageOverlayBtns: { flexDirection: "row", gap: 8, padding: 8 },
  imageOverlayBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 5, borderRadius: 8, paddingVertical: 7,
  },
  imageOverlayBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  modalActions: { flexDirection: "row", gap: 10, width: "100%" },
  modalCancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalConfirmBtn: {
    flex: 2, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  modalConfirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
