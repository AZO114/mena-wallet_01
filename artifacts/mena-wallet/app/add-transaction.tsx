import { AlertCircle, Camera, CheckCircle, Image as ImageIcon, PlusCircle, Send, Trash2, Users, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
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
import { useLanguage } from "@/context/LanguageContext";

type Mode = "new" | "supplement";

async function pickAndCompressImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;
  const uri = result.assets[0].uri;
  const compressed = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return compressed.base64 ? `data:image/jpeg;base64,${compressed.base64}` : null;
}

export default function AddTransactionScreen() {
  const { user, createTransaction, editTransaction, transactions } = useApp();
  const C = useTheme();
  const { t, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("new");
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [additionalPaid, setAdditionalPaid] = useState("");

  const [senderName, setSenderName] = useState("");
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [notesImage, setNotesImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const supplementableTransactions = transactions.filter(
    (tx) => tx.paidAmount < tx.amount
  );

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
    if (!senderName.trim()) newErrors.senderName = t("senderRequired");
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      newErrors.amount = t("invalidAmount");
    }
    if (paidAmount && (isNaN(Number(paidAmount)) || Number(paidAmount) < 0)) {
      newErrors.paidAmount = t("invalidAmount");
    }
    if (paidAmount && Number(paidAmount) > Number(amount)) {
      newErrors.paidAmount = t("paidExceedsTotal");
    }
    return newErrors;
  };

  const validateSupplement = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedTxId) newErrors.tx = t("selectTx");
    if (!additionalPaid || isNaN(Number(additionalPaid)) || Number(additionalPaid) <= 0) {
      newErrors.additionalPaid = t("enterAdditional");
    }
    const tx = supplementableTransactions.find((t) => t.id === selectedTxId);
    if (tx && Number(additionalPaid) > (tx.amount - tx.paidAmount)) {
      newErrors.additionalPaid = t("exceedsRemaining");
    }
    return newErrors;
  };

  const handlePickImage = async () => {
    setImageLoading(true);
    try {
      const base64 = await pickAndCompressImage();
      if (base64) setNotesImage(base64);
    } catch {
      // ignore
    } finally {
      setImageLoading(false);
    }
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
        notesAttachment: notesImage ?? undefined,
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
    const tx = supplementableTransactions.find((t) => t.id === selectedTxId)!;
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
          {mode === "new" ? t("addNewValue") : t("supplementValue")}
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
            {t("newValueTab")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeTab, mode === "supplement" && [styles.modeTabActive, { backgroundColor: C.surface }]]}
          onPress={() => { setMode("supplement"); setErrors({}); }}
        >
          <CheckCircle size={16} color={mode === "supplement" ? C.tint : C.textSecondary} />
          <Text style={[styles.modeTabText, { color: mode === "supplement" ? C.tint : C.textSecondary }, mode === "supplement" && { fontFamily: "Inter_700Bold" }]}>
            {t("supplementTab")}
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
                    <Text style={[styles.recipientLabel, { color: C.textSecondary }]}>{t("recipientsAuto")}</Text>
                    <Text style={[styles.recipientNames, { color: C.tint }]}>سلوان عباس و ريان عباس و أنس جميل</Text>
                  </View>
                  <CheckCircle size={20} color={C.success} />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: C.text }]}>{t("senderNameField")} <Text style={{ color: C.danger }}>*</Text></Text>
                  <TextInput
                    style={[styles.input, { color: C.text, borderColor: errors.senderName ? C.danger : C.border, backgroundColor: C.surface }]}
                    value={senderName}
                    onChangeText={(v) => { setSenderName(v); setErrors((e) => ({ ...e, senderName: "" })); }}
                    placeholder={t("senderNamePlaceholder")}
                    placeholderTextColor={C.textMuted}
                    textAlign={isRTL ? "right" : "left"}
                  />
                  {errors.senderName ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.senderName}</Text> : null}
                </View>

                <View style={styles.row}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: C.text }]}>{t("totalAmountField")} <Text style={{ color: C.danger }}>*</Text></Text>
                    <TextInput
                      style={[styles.input, { color: C.text, borderColor: errors.amount ? C.danger : C.border, backgroundColor: C.surface }]}
                      value={amount}
                      onChangeText={(v) => { setAmount(v); setErrors((e) => ({ ...e, amount: "" })); }}
                      placeholder="0.000"
                      placeholderTextColor={C.textMuted}
                      keyboardType="decimal-pad"
                      textAlign="center"
                    />
                    {errors.amount ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.amount}</Text> : null}
                  </View>

                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={[styles.label, { color: C.text }]}>{t("paidAmountField")}</Text>
                    <TextInput
                      style={[styles.input, { color: C.text, borderColor: errors.paidAmount ? C.danger : C.border, backgroundColor: C.surface }]}
                      value={paidAmount}
                      onChangeText={(v) => { setPaidAmount(v); setErrors((e) => ({ ...e, paidAmount: "" })); }}
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
                    <Text style={[styles.remainingLabel, { color: C.textSecondary }]}>{t("remaining")}: </Text>
                    <Text style={[styles.remainingAmount, { color: C.success }]}>
                      {(Number(amount) - Number(paidAmount || 0)).toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {t("lyD")}
                    </Text>
                  </View>
                )}

                <View style={styles.field}>
                  <Text style={[styles.label, { color: C.text }]}>{t("notesField")}</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { color: C.text, borderColor: C.border, backgroundColor: C.surface }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t("notesPlaceholder")}
                    placeholderTextColor={C.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    textAlign={isRTL ? "right" : "left"}
                  />
                </View>

                <View style={styles.field}>
                  <Text style={[styles.label, { color: C.text }]}>{t("attachImage")}</Text>
                  {notesImage ? (
                    <View style={styles.imagePreviewWrap}>
                      <Image source={{ uri: notesImage }} style={styles.imagePreview} resizeMode="cover" />
                      <View style={styles.imageOverlayBtns}>
                        <Pressable
                          style={[styles.imageOverlayBtn, { backgroundColor: C.tint }]}
                          onPress={handlePickImage}
                        >
                          <Camera size={16} color="#fff" />
                          <Text style={styles.imageOverlayBtnText}>{t("changeImage")}</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.imageOverlayBtn, { backgroundColor: C.danger }]}
                          onPress={() => setNotesImage(null)}
                        >
                          <Trash2 size={16} color="#fff" />
                          <Text style={styles.imageOverlayBtnText}>{t("removeImage")}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Pressable
                      style={[styles.imagePickerBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                      onPress={handlePickImage}
                      disabled={imageLoading}
                    >
                      {imageLoading
                        ? <ActivityIndicator color={C.tint} />
                        : <>
                            <ImageIcon size={22} color={C.tint} />
                            <Text style={[styles.imagePickerText, { color: C.tint }]}>{t("attachImage")}</Text>
                          </>
                      }
                    </Pressable>
                  )}
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
                      <Text style={styles.submitBtnText}>{t("sendValue")}</Text>
                    </>
                  )}
                </Pressable>

                <Text style={[styles.disclaimer, { color: C.textMuted }]}>
                  {t("notifyWillSend")}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.supplementHint, { color: C.textSecondary }]}>
                  {t("supplementHint")}
                </Text>

                {errors.tx ? <Text style={[styles.errorText, { color: C.danger }]}>{errors.tx}</Text> : null}

                {supplementableTransactions.length === 0 ? (
                  <View style={[styles.noTxCard, { backgroundColor: C.surface }]}>
                    <Text style={[styles.noTxText, { color: C.textSecondary }]}>{t("noSupplementable")}</Text>
                  </View>
                ) : (
                  supplementableTransactions.map((tx) => {
                    const remaining = tx.amount - tx.paidAmount;
                    const isPending = tx.status === "pending";
                    return (
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
                          <View style={styles.txSelectNameRow}>
                            <Text style={[styles.txSelectName, { color: C.text }]}>{tx.senderName}</Text>
                            <View style={[styles.txStatusBadge, { backgroundColor: isPending ? C.pendingBg : C.receivedBg }]}>
                              <Text style={[styles.txStatusBadgeText, { color: isPending ? C.warning : C.success }]}>
                                {isPending ? t("pending") : t("received")}
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.txSelectMeta, { color: C.textSecondary }]}>
                            {t("remaining")}: {remaining.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {t("lyD")}
                          </Text>
                        </View>
                        <View style={styles.txSelectRight}>
                          <Text style={[styles.txSelectAmount, { color: C.text }]}>
                            {tx.amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {t("lyD")}
                          </Text>
                          {selectedTxId === tx.id && (
                            <CheckCircle size={20} color={C.tint} />
                          )}
                        </View>
                      </Pressable>
                    );
                  })
                )}

                {selectedTxId && (
                  <>
                    {(() => {
                      const tx = supplementableTransactions.find((t) => t.id === selectedTxId)!;
                      const remaining = tx.amount - tx.paidAmount;
                      return (
                        <View style={styles.field}>
                          <Text style={[styles.label, { color: C.text }]}>
                            {t("additionalPaidLabel")} ({t("remaining")}: {remaining.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 })} {t("lyD")})
                            <Text style={{ color: C.danger }}> *</Text>
                          </Text>
                          <TextInput
                            style={[styles.input, { color: C.text, borderColor: errors.additionalPaid ? C.danger : C.border, backgroundColor: C.surface }]}
                            value={additionalPaid}
                            onChangeText={(v) => { setAdditionalPaid(v); setErrors((e) => ({ ...e, additionalPaid: "" })); }}
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
                      <Text style={styles.submitBtnText}>{t("confirmAddAmount")}</Text>
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
  txSelectNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  txSelectName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  txStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  txStatusBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  txSelectMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txSelectRight: { alignItems: "flex-end", gap: 4 },
  txSelectAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
  imagePickerBtn: {
    borderWidth: 1.5, borderRadius: 14, borderStyle: "dashed",
    paddingVertical: 18, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  imagePickerText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  imagePreviewWrap: { borderRadius: 14, overflow: "hidden" },
  imagePreview: { width: "100%", height: 200 },
  imageOverlayBtns: {
    flexDirection: "row", gap: 8, padding: 10,
  },
  imageOverlayBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 10, paddingVertical: 8,
  },
  imageOverlayBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
