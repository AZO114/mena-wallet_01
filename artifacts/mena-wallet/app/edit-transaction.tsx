import { AlertCircle, Check, Edit2, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, transactions, editTransaction } = useApp();
  const C = useTheme();
  const insets = useSafeAreaInsets();

  const transaction = useMemo(
    () => transactions.find((t) => t.id === id),
    [transactions, id]
  );

  const [senderName, setSenderName] = useState(transaction?.senderName ?? "");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [paidAmount, setPaidAmount] = useState(transaction ? String(transaction.paidAmount) : "");
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || user.role !== "sender") {
      router.replace("/");
      return;
    }
    if (!transaction || transaction.status !== "pending") {
      Alert.alert("خطأ", "لا يمكن تعديل هذه المعاملة");
      router.back();
    }
  }, [user, transaction]);

  if (!user || !transaction) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!senderName.trim()) newErrors.senderName = "اسم صاحب القيمة مطلوب";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = "المبلغ يجب أن يكون رقماً موجباً";
    }
    if (paidAmount && (isNaN(Number(paidAmount)) || Number(paidAmount) < 0)) {
      newErrors.paidAmount = "مبلغ السداد غير صحيح";
    }
    if (Number(paidAmount) > Number(amount)) {
      newErrors.paidAmount = "مبلغ السداد لا يمكن أن يتجاوز المبلغ الكلي";
    }
    return newErrors;
  };

  const handleSave = async () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);
    try {
      await editTransaction(transaction.id, {
        senderName: senderName.trim(),
        amount: Number(amount),
        paidAmount: Number(paidAmount || 0),
        notes: notes.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setErrors({ general: e.message || "حدث خطأ" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
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
        <Pressable style={[styles.closeBtn, { backgroundColor: C.surfaceSecondary }]} onPress={() => router.back()}>
          <X size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Edit2 size={20} color={C.tint} />
          <Text style={[styles.headerTitle, { color: C.text }]}>تعديل القيمة</Text>
        </View>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: C.tint }]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Check size={20} color="#fff" />}
        </Pressable>
      </View>

      <View style={[styles.txInfoBanner, { backgroundColor: C.isDark ? "#2D1B0E" : "#FFFBEB" }]}>
        <Text style={[styles.txInfoText, { color: C.warning }]}>
          تعديل قيمة معلقة · لن يتم إشعار المستقبلين بالتغييرات
        </Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.text }]}>اسم صاحب القيمة <Text style={{ color: C.danger }}>*</Text></Text>
            <TextInput
              style={[
                styles.input,
                { color: C.text, borderColor: errors.senderName ? C.danger : C.border, backgroundColor: C.surface },
              ]}
              value={senderName}
              onChangeText={(t) => { setSenderName(t); setErrors((e) => ({ ...e, senderName: "" })); }}
              placeholder="أدخل الاسم"
              placeholderTextColor={C.textMuted}
              textAlign="right"
            />
            {errors.senderName ? (
              <Text style={[styles.errorText, { color: C.danger }]}>{errors.senderName}</Text>
            ) : null}
          </View>

          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: C.text }]}>المبلغ الكلي (د.ل) <Text style={{ color: C.danger }}>*</Text></Text>
              <TextInput
                style={[
                  styles.input,
                  { color: C.text, borderColor: errors.amount ? C.danger : C.border, backgroundColor: C.surface },
                ]}
                value={amount}
                onChangeText={(t) => { setAmount(t); setErrors((e) => ({ ...e, amount: "" })); }}
                placeholder="0.000"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                textAlign="center"
              />
              {errors.amount ? (
                <Text style={[styles.errorText, { color: C.danger }]}>{errors.amount}</Text>
              ) : null}
            </View>

            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.label, { color: C.text }]}>المسدد (د.ل)</Text>
              <TextInput
                style={[
                  styles.input,
                  { color: C.text, borderColor: errors.paidAmount ? C.danger : C.border, backgroundColor: C.surface },
                ]}
                value={paidAmount}
                onChangeText={(t) => { setPaidAmount(t); setErrors((e) => ({ ...e, paidAmount: "" })); }}
                placeholder="0.000"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                textAlign="center"
              />
              {errors.paidAmount ? (
                <Text style={[styles.errorText, { color: C.danger }]}>{errors.paidAmount}</Text>
              ) : null}
            </View>
          </View>

          {amount && (
            <View style={[styles.remainingBanner, { backgroundColor: C.isDark ? "#052E16" : "#F0FDF4" }]}>
              <Text style={[styles.remainingLabel, { color: C.textSecondary }]}>المتبقي: </Text>
              <Text style={[styles.remainingAmount, { color: C.success }]}>
                {(Number(amount) - Number(paidAmount || 0)).toLocaleString("ar-LY", {
                  minimumFractionDigits: 0, maximumFractionDigits: 3,
                })} د.ل
              </Text>
            </View>
          )}

          <View style={styles.field}>
            <Text style={[styles.label, { color: C.text }]}>ملاحظات (اختياري)</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { color: C.text, borderColor: C.border, backgroundColor: C.surface },
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="أي معلومات إضافية..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              textAlign="right"
            />
          </View>

          {errors.general ? (
            <View style={[styles.generalError, { backgroundColor: C.isDark ? "#450A0A" : "#FEF2F2" }]}>
              <AlertCircle size={16} color={C.danger} />
              <Text style={[styles.generalErrorText, { color: C.danger }]}>{errors.general}</Text>
            </View>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.saveFullBtn,
              { backgroundColor: C.tint, shadowColor: C.tint },
              pressed && styles.saveBtnPressed,
              loading && { opacity: 0.7 },
            ]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Check size={22} color="#fff" />
                  <Text style={styles.saveBtnText}>حفظ التعديلات</Text>
                </>
              )}
          </Pressable>

          <View style={[styles.changesList, { backgroundColor: C.surfaceSecondary }]}>
            <Text style={[styles.changesTitle, { color: C.textSecondary }]}>التغييرات (من ← إلى)</Text>
            {senderName.trim() !== transaction.senderName ? (
              <Text style={[styles.changesItem, { color: C.textMuted }]}>
                الاسم: {transaction.senderName} ← {senderName.trim() || "—"}
              </Text>
            ) : (
              <Text style={[styles.changesItem, { color: C.textMuted }]}>الاسم: {transaction.senderName} (بدون تغيير)</Text>
            )}
            {Number(amount) !== transaction.amount ? (
              <Text style={[styles.changesItem, { color: C.textMuted }]}>
                المبلغ: {transaction.amount.toLocaleString("ar-LY")} ← {Number(amount || 0).toLocaleString("ar-LY")} د.ل
              </Text>
            ) : (
              <Text style={[styles.changesItem, { color: C.textMuted }]}>المبلغ: {transaction.amount.toLocaleString("ar-LY")} د.ل (بدون تغيير)</Text>
            )}
            {Number(paidAmount || 0) !== transaction.paidAmount ? (
              <Text style={[styles.changesItem, { color: C.textMuted }]}>
                المسدد: {transaction.paidAmount.toLocaleString("ar-LY")} ← {Number(paidAmount || 0).toLocaleString("ar-LY")} د.ل
              </Text>
            ) : (
              <Text style={[styles.changesItem, { color: C.textMuted }]}>المسدد: {transaction.paidAmount.toLocaleString("ar-LY")} د.ل (بدون تغيير)</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  closeBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  saveBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  txInfoBanner: { padding: 12, paddingHorizontal: 20 },
  txInfoText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  scrollContent: { padding: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular",
  },
  textArea: { minHeight: 90, paddingTop: 12 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", gap: 12 },
  remainingBanner: {
    borderRadius: 12, padding: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "center",
  },
  remainingLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  remainingAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  generalError: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 14 },
  generalErrorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  saveFullBtn: {
    borderRadius: 16, paddingVertical: 18, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  saveBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  saveBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  changesList: { borderRadius: 14, padding: 14, gap: 6 },
  changesTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  changesItem: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
