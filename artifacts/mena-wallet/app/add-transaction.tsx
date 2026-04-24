import { AlertCircle, CheckCircle, PlusCircle, Send, Users, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

type Mode = "new" | "supplement";

export default function AddTransactionScreen() {
  const { user, createTransaction, editTransaction, transactions } = useApp();
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("new");
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [additionalPaid, setAdditionalPaid] = useState("");

  const [senderName, setSenderName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const pendingTransactions = transactions.filter((t) => t.status === "pending");

  useEffect(() => {
    if (!user || user.role !== "sender") {
      router.replace("/");
      return;
    }
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [user]);

  const validateNew = () => {
    const newErrors: Record<string, string> = {};
    if (!senderName.trim()) newErrors.senderName = "اسم صاحب القيمة مطلوب";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = "المبلغ يجب أن يكون رقماً موجباً";
    }
    if (paidAmount && (isNaN(Number(paidAmount)) || Number(paidAmount) < 0)) {
      newErrors.paidAmount = "مبلغ السداد غير صحيح";
    }
    if (paidAmount && Number(paidAmount) > Number(amount)) {
      newErrors.paidAmount = "مبلغ السداد لا يمكن أن يتجاوز المبلغ الكلي";
    }
    return newErrors;
  };

  const validateSupplement = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedTxId) newErrors.tx = "اختر معاملة من القائمة";
    if (!additionalPaid || isNaN(Number(additionalPaid)) || Number(additionalPaid) <= 0) {
      newErrors.additionalPaid = "أدخل المبلغ الإضافي";
    }
    const tx = pendingTransactions.find((t) => t.id === selectedTxId);
    if (tx && Number(additionalPaid) > (tx.amount - tx.paidAmount)) {
      newErrors.additionalPaid = "المبلغ يتجاوز المتبقي";
    }
    return newErrors;
  };

  const handleSubmitNew = async () => {
    const newErrors = validateNew();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    setLoading(true);
    try {
      await createTransaction({
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

  const handleSubmitSupplement = async () => {
    const newErrors = validateSupplement();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    const tx = pendingTransactions.find((t) => t.id === selectedTxId)!;
    const newPaidAmount = tx.paidAmount + Number(additionalPaid);

    setLoading(true);
    try {
      await editTransaction(tx.id, { paidAmount: newPaidAmount });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      setErrors({ general: e.message || "حدث خطأ" });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "sender") return null;

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 20) }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), borderBottomColor: C.border, backgroundColor: C.background }]}>
        <Pressable style={[styles.closeBtn, { backgroundColor: C.surfaceSecondary }]} onPress={() => router.back()}>
          <X size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: C.text }]}>
          {mode === "new" ? "إضافة قيمة جديدة" : "تكملة قيمة موجودة"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.modeTabs, { backgroundColor: C.surfaceSecondary }]}>
        <Pressable
          style={[styles.modeTab, mode === "new" && [styles.modeTabActive, { backgroundColor: C.surface }]]}
          onPress={() => { setMode("new"); setErrors({}); }}
        >
          <PlusCircle size={16} color={mode === "new" ? C.tint : C.textSecondary} />
          <Text style={[styles.modeTabText, { color: mode === "new" ? C.tint : C.textSecondary }, mode === "new" && { fontFamily: "Inter_700Bold" }]}>
            قيمة جديدة
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeTab, mode === "supplement" && [styles.modeTabActive, { backgroundColor: C.surface }]]}
          onPress={() => { setMode("supplement"); setErrors({}); }}
        >
          <CheckCircle size={16} color={mode === "supplement" ? C.tint : C.textSecondary} />
          <Text style={[styles.modeTabText, { color: mode === "supplement" ? C.tint : C.textSecondary }, mode === "supplement" && { fontFamily: "Inter_700Bold" }]}>
            تكملة قيمة
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.formContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {mode === "new" ? (
              <>
                <View style={[styles.recipientBanner, { backgroundColor: C.isDark ? "#1e3a8a22" : "#EEF2FF" }]}>
                  <Users size={24} color={C.tint} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.recipientLabel, { color: C.textSecondary }]}>المستقبلون (تلقائي)</Text>
                    <Text style={[styles.recipientNames, { color: C.tint }]}>سلوان عباس و ريان عباس و أنس جميل</Text>
                  </View>
                  <CheckCircle size={20} color={C.success} />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: C.text }]}>اسم صاحب القيمة <Text style={{ color: C.danger }}>*</Text></Text>
                  <TextInput
                    style={[styles.input, { color: C.text, borderColor: errors.senderName ? C.danger : C.border, backgroundColor: C.surface }]}
                    value={senderName}
                    onChangeText={(t) => { setSenderName(t); setErrors((e) => ({ ...e, senderName: "" })); }}
                    placeholder="أدخل الاسم"
                    placeholderTextColor={C.textMuted}
                    textAlign="right"
                  />
                  {errors.senderName ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.senderName}</Text> : null}
                </View>

                <View style={styles.row}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: C.text }]}>المبلغ الكلي (د.ل) <Text style={{ color: C.danger }}>*</Text></Text>
                    <TextInput
                      style={[styles.input, { color: C.text, borderColor: errors.amount ? C.danger : C.border, backgroundColor: C.surface }]}
                      value={amount}
                      onChangeText={(t) => { setAmount(t); setErrors((e) => ({ ...e, amount: "" })); }}
                      placeholder="0.000"
                      placeholderTextColor={C.textMuted}
                      keyboardType="decimal-pad"
                      textAlign="center"
                    />
                    {errors.amount ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.amount}</Text> : null}
                  </View>

                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: C.text }]}>المبلغ المسدد (د.ل)</Text>
                    <TextInput
                      style={[styles.input, { color: C.text, borderColor: errors.paidAmount ? C.danger : C.border, backgroundColor: C.surface }]}
                      value={paidAmount}
                      onChangeText={(t) => { setPaidAmount(t); setErrors((e) => ({ ...e, paidAmount: "" })); }}
                      placeholder="0.000"
                      placeholderTextColor={C.textMuted}
                      keyboardType="decimal-pad"
                      textAlign="center"
                    />
                    {errors.paidAmount ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.paidAmount}</Text> : null}
                  </View>
                </View>

                {amount && paidAmount && Number(paidAmount) >= 0 && (
                  <View style={[styles.remainingBanner, { backgroundColor: C.isDark ? "#052E16" : "#F0FDF4" }]}>
                    <Text style={[styles.remainingLabel, { color: C.textSecondary }]}>المتبقي: </Text>
                    <Text style={[styles.remainingAmount, { color: C.success }]}>
                      {(Number(amount) - Number(paidAmount || 0)).toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} د.ل
                    </Text>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={[styles.label, { color: C.text }]}>ملاحظات (اختياري)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
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
                    styles.submitBtn,
                    { backgroundColor: C.tint, shadowColor: C.tint },
                    pressed && styles.submitBtnPressed,
                    loading && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmitNew}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Send size={20} color="#fff" />
                      <Text style={styles.submitBtnText}>إرسال القيمة</Text>
                    </>
                  )}
                </Pressable>

                <Text style={[styles.disclaimer, { color: C.textMuted }]}>
                  سيتم إرسال إشعار لسلوان وريان وأنس فور إضافة القيمة
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.supplementHint, { color: C.textSecondary }]}>
                  اختر من القيم المعلقة وأضف مبلغ إضافي للسداد
                </Text>

                {errors.tx ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.tx}</Text> : null}

                {pendingTransactions.length === 0 ? (
                  <View style={[styles.noTxCard, { backgroundColor: C.surface }]}>
                    <Text style={[styles.noTxText, { color: C.textSecondary }]}>لا توجد قيم معلقة</Text>
                  </View>
                ) : (
                  pendingTransactions.map((tx) => (
                    <Pressable
                      key={tx.id}
                      style={[
                        styles.txSelectCard,
                        {
                          backgroundColor: selectedTxId === tx.id ? (C.isDark ? "#1e3a8a33" : "#EEF2FF") : C.surface,
                          borderColor: selectedTxId === tx.id ? C.tint : C.border,
                        },
                      ]}
                      onPress={() => { setSelectedTxId(tx.id); setErrors((e) => ({ ...e, tx: "" })); }}
                    >
                      <View style={styles.txSelectLeft}>
                        <Text style={[styles.txSelectName, { color: C.text }]}>{tx.senderName}</Text>
                        <Text style={[styles.txSelectMeta, { color: C.textSecondary }]}>
                          المتبقي: {(tx.amount - tx.paidAmount).toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} د.ل
                        </Text>
                      </View>
                      <View style={styles.txSelectRight}>
                        <Text style={[styles.txSelectAmount, { color: C.text }]}>
                          {tx.amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} د.ل
                        </Text>
                        {selectedTxId === tx.id && (
                          <CheckCircle size={20} color={C.tint} />
                        )}
                      </View>
                    </Pressable>
                  ))
                )}

                {selectedTxId && (
                  <>
                    {(() => {
                      const tx = pendingTransactions.find((t) => t.id === selectedTxId)!;
                      const remaining = tx.amount - tx.paidAmount;
                      return (
                        <View style={styles.field}>
                          <Text style={[styles.label, { color: C.text }]}>
                            المبلغ الإضافي للسداد (المتبقي: {remaining.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} د.ل)
                            <Text style={{ color: C.danger }}> *</Text>
                          </Text>
                          <TextInput
                            style={[styles.input, { color: C.text, borderColor: errors.additionalPaid ? C.danger : C.border, backgroundColor: C.surface }]}
                            value={additionalPaid}
                            onChangeText={(t) => { setAdditionalPaid(t); setErrors((e) => ({ ...e, additionalPaid: "" })); }}
                            placeholder="0.000"
                            placeholderTextColor={C.textMuted}
                            keyboardType="decimal-pad"
                            textAlign="center"
                          />
                          {errors.additionalPaid ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.additionalPaid}</Text> : null}
                        </View>
                      );
                    })()}
                  </>
                )}

                {errors.general ? (
                  <View style={[styles.generalError, { backgroundColor: C.isDark ? "#450A0A" : "#FEF2F2" }]}>
                    <AlertCircle size={16} color={C.danger} />
                    <Text style={[styles.generalErrorText, { color: C.danger }]}>{errors.general}</Text>
                  </View>
                ) : null}

                <Pressable
                  style={({ pressed }) => [
                    styles.submitBtn,
                    { backgroundColor: C.tint, shadowColor: C.tint },
                    pressed && styles.submitBtnPressed,
                    (loading || !selectedTxId) && styles.submitBtnDisabled,
                  ]}
                  onPress={handleSubmitSupplement}
                  disabled={loading || !selectedTxId}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <CheckCircle size={20} color="#fff" />
                      <Text style={styles.submitBtnText}>تأكيد إضافة المبلغ</Text>
                    </>
                  )}
                </Pressable>
              </>
            )}
          </Animated.View>
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
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modeTabs: { flexDirection: "row", marginHorizontal: 20, marginTop: 16, marginBottom: 4, borderRadius: 14, padding: 4 },
  modeTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 },
  modeTabActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  modeTabText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  scrollContent: { padding: 20, gap: 20 },
  formContainer: { gap: 20 },
  recipientBanner: { borderRadius: 16, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  recipientLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  recipientNames: { fontSize: 15, fontFamily: "Inter_700Bold" },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 90, paddingTop: 12 },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", gap: 12 },
  remainingBanner: { borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  remainingLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  remainingAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  generalError: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 14 },
  generalErrorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  submitBtn: {
    borderRadius: 16, paddingVertical: 18, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  submitBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  disclaimer: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  supplementHint: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  noTxCard: { borderRadius: 16, padding: 24, alignItems: "center" },
  noTxText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  txSelectCard: {
    borderRadius: 16, padding: 16, borderWidth: 2,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  txSelectLeft: { flex: 1, gap: 4 },
  txSelectName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  txSelectMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txSelectRight: { alignItems: "flex-end", gap: 4 },
  txSelectAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
