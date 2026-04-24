import {
  AlertCircle,
  ArrowLeft,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle,
  Clock,
  Edit2,
  FileText,
  MessageSquare,
  Trash2,
  User,
  Users,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, transactions, confirmTransaction, deleteTransaction } = useApp();
  const C = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const transaction = useMemo(
    () => transactions.find((t) => t.id === id),
    [transactions, id]
  );

  useEffect(() => {
    if (!user) { router.replace("/"); return; }
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [user]);

  if (!user) return null;
  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, justifyContent: "center", alignItems: "center" }]}>
        <AlertCircle size={48} color={C.textMuted} />
        <Text style={[styles.notFoundText, { color: C.textSecondary }]}>المعاملة غير موجودة</Text>
        <Pressable style={[styles.backBtn, { backgroundColor: C.tint }]} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>رجوع</Text>
        </Pressable>
      </View>
    );
  }

  const isPending = transaction.status === "pending";
  const isSender = user.role === "sender";
  const isReceiver = user.role === "receiver";
  const canEdit = isSender && isPending;
  const canConfirm = isReceiver && isPending;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await confirmTransaction(transaction.id, confirmationNotes.trim() || undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowConfirmModal(false);
      setConfirmationNotes("");
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "فشل التأكيد");
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
          Alert.alert("خطأ", e.message || "فشل الحذف");
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
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: performDelete },
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
        <Text style={[styles.headerTitle, { color: C.text }]}>تفاصيل القيمة</Text>
        <View style={styles.headerActions}>
          {canEdit && (
            <Pressable
              style={[styles.headerIconBtn, { backgroundColor: C.isDark ? "#1e3a8a33" : "#EEF2FF" }]}
              onPress={() =>
                router.push({ pathname: "/edit-transaction", params: { id: transaction.id } })
              }
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
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: isPending
                  ? C.isDark ? "#2D1B0E" : "#FFFBEB"
                  : C.isDark ? "#052E16" : "#ECFDF5",
              },
            ]}
          >
            <View style={styles.heroIcon}>
              {isPending
                ? <Clock size={36} color={C.warning} />
                : <CheckCircle size={36} color={C.success} />}
            </View>
            <Text style={[styles.heroAmount, { color: isPending ? C.warning : C.success }]}>
              {formatAmount(transaction.amount)}{" "}
              <Text style={styles.heroCurrency}>د.ل</Text>
            </Text>
            <View style={[styles.heroStatus, { backgroundColor: isPending ? C.pendingBg : C.receivedBg }]}>
              <Text style={[styles.heroStatusText, { color: isPending ? C.warning : C.success }]}>
                {isPending ? "معلقة" : "مستلمة"}
              </Text>
            </View>
          </View>

          <View style={[styles.detailsCard, { backgroundColor: C.surface }]}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>تفاصيل المعاملة</Text>
            <InfoRow icon={<User size={16} color={C.tint} />} label="صاحب القيمة" value={transaction.senderName} />
            <InfoRow icon={<Users size={16} color={C.tint} />} label="المستقبل" value={transaction.recipientName} />
            <InfoRow
              icon={<BadgeDollarSign size={16} color={C.success} />}
              label="المسدد"
              value={`${formatAmount(transaction.paidAmount)} د.ل`}
              valueColor={C.success}
            />
            <InfoRow
              icon={<BadgeDollarSign size={16} color={C.danger} />}
              label="المتبقي"
              value={`${formatAmount(transaction.amount - transaction.paidAmount)} د.ل`}
              valueColor={C.danger}
            />
            <InfoRow
              icon={<CalendarDays size={16} color={C.textSecondary} />}
              label="تاريخ الإضافة"
              value={`${formatDate(transaction.createdAt)} - ${formatTime(transaction.createdAt)}`}
            />
            {transaction.notes && (
              <InfoRow
                icon={<FileText size={16} color={C.textSecondary} />}
                label="ملاحظات"
                value={transaction.notes}
              />
            )}
          </View>

          {!isPending && (
            <View style={[styles.detailsCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>تفاصيل الاستلام</Text>
              <InfoRow
                icon={<User size={16} color={C.success} />}
                label="استلم بواسطة"
                value={transaction.confirmedByName ?? "غير معروف"}
                valueColor={C.success}
              />
              {transaction.confirmedAt && (
                <InfoRow
                  icon={<CalendarDays size={16} color={C.textSecondary} />}
                  label="وقت الاستلام"
                  value={`${formatDate(transaction.confirmedAt)} - ${formatTime(transaction.confirmedAt)}`}
                />
              )}
              {transaction.confirmationNotes && (
                <InfoRow
                  icon={<MessageSquare size={16} color={C.textSecondary} />}
                  label="ملاحظة الاستلام"
                  value={transaction.confirmationNotes}
                />
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
            <Text style={styles.confirmBtnText}>تأكيد الاستلام</Text>
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
            <Text style={[styles.modalTitle, { color: C.text }]}>تأكيد استلام القيمة</Text>
            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              تأكيد استلام{" "}
              <Text style={[styles.modalHighlight, { color: C.tint }]}>{transaction.senderName}</Text>
              {" "}بمبلغ{" "}
              <Text style={[styles.modalHighlight, { color: C.success }]}>
                {formatAmount(transaction.amount)} د.ل
              </Text>
            </Text>

            <View style={styles.noteField}>
              <Text style={[styles.noteLabel, { color: C.text }]}>ملاحظة الاستلام (اختياري)</Text>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    color: C.text,
                    borderColor: C.border,
                    backgroundColor: C.surfaceSecondary,
                  },
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

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalCancelBtn, { backgroundColor: C.surfaceSecondary }]}
                onPress={() => { setShowConfirmModal(false); setConfirmationNotes(""); }}
              >
                <Text style={[styles.modalCancelText, { color: C.textSecondary }]}>إلغاء</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmBtn,
                  { backgroundColor: C.success, shadowColor: C.success },
                ]}
                onPress={handleConfirm}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalConfirmText}>تأكيد الاستلام</Text>}
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
  scrollContent: { padding: 20, gap: 16 },
  animatedContent: { gap: 16 },
  heroCard: { borderRadius: 24, padding: 28, alignItems: "center", gap: 12 },
  heroIcon: {},
  heroAmount: { fontSize: 44, fontFamily: "Inter_700Bold", textAlign: "center" },
  heroCurrency: { fontSize: 20, fontFamily: "Inter_500Medium" },
  heroStatus: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  heroStatusText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  detailsCard: {
    borderRadius: 20, padding: 20, gap: 0,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 12 },
  infoRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 12, borderBottomWidth: 1,
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  infoIcon: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  infoLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  infoValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "right", flex: 1, marginLeft: 8 },
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
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalContent: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, gap: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 16, elevation: 10,
  },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  modalSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 24 },
  modalHighlight: { fontFamily: "Inter_700Bold" },
  noteField: { gap: 8 },
  noteLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  noteInput: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 80,
  },
  modalActions: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, borderRadius: 14, paddingVertical: 16, alignItems: "center" },
  modalCancelText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  modalConfirmBtn: {
    flex: 2, borderRadius: 14, paddingVertical: 16, alignItems: "center",
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  modalConfirmText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
});
