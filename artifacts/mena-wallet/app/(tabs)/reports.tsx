import { BadgeDollarSign, CheckCircle, CircleX, Clock, Download, FileText, X } from "lucide-react-native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { useTheme } from "@/context/ThemeContext";
import { useApp, FinancialReport } from "@/context/AppContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

type Period = "week" | "month" | "year" | "all";

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function monthLabel(period: string): string {
  const [year, month] = period.split("-");
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${months[parseInt(month, 10) - 1]} ${year}`;
}

export default function ReportsScreen() {
  const { user, getFinancialReport } = useApp();
  const C = useTheme();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("month");
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfStartDate, setPdfStartDate] = useState("");
  const [pdfEndDate, setPdfEndDate] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  const loadReport = useCallback(async () => {
    try {
      const data = await getFinancialReport(period);
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [period, getFinancialReport]);

  useEffect(() => {
    setLoading(true);
    loadReport();
  }, [period]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const handleExportPdf = async () => {
    if (!pdfStartDate && !pdfEndDate) {
      Alert.alert("تنبيه", "يرجى تحديد تاريخ البداية أو النهاية");
      return;
    }
    setPdfLoading(true);
    try {
      const params = new URLSearchParams();
      if (pdfStartDate) params.append("startDate", pdfStartDate);
      if (pdfEndDate) params.append("endDate", pdfEndDate);

      const res = await fetch(`${BASE_URL}/reports/export?${params.toString()}`);
      if (!res.ok) throw new Error("فشل في جلب البيانات");
      const data: any[] = await res.json();

      if (data.length === 0) {
        Alert.alert("لا توجد بيانات", "لا توجد معاملات في الفترة المحددة");
        setPdfLoading(false);
        return;
      }

      const totalAmount = data.reduce((s, t) => s + t.amount, 0);
      const totalPaid = data.reduce((s, t) => s + t.paidAmount, 0);
      const totalRemaining = data.reduce((s, t) => s + t.remaining, 0);

      const rows = data.map((t, i) => `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
          <td>${i + 1}</td>
          <td>${t.senderName}</td>
          <td>${t.amount.toLocaleString("ar-LY")} د.ل</td>
          <td>${t.paidAmount.toLocaleString("ar-LY")} د.ل</td>
          <td>${t.remaining.toLocaleString("ar-LY")} د.ل</td>
          <td><span style="color:${t.status === 'مستلمة' ? '#10B981' : '#F59E0B'}">${t.status}</span></td>
          <td>${t.confirmedByName}</td>
          <td>${t.createdAt}</td>
          <td>${t.confirmedAt}</td>
          <td>${t.notes}</td>
        </tr>`).join("");

      const dateRangeLabel = [
        pdfStartDate ? `من: ${pdfStartDate}` : "",
        pdfEndDate ? `إلى: ${pdfEndDate}` : "",
      ].filter(Boolean).join("  —  ");

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; direction: rtl; background: #fff; color: #111; padding: 20px; font-size: 11px; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #1A56DB; padding-bottom: 16px; }
    .header h1 { font-size: 26px; color: #1A56DB; margin-bottom: 4px; }
    .header p { color: #555; font-size: 12px; }
    .period { text-align: center; color: #333; margin-bottom: 16px; font-size: 13px; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; }
    .summary-box { background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 10px; padding: 12px 20px; text-align: center; min-width: 140px; }
    .summary-box .label { font-size: 11px; color: #555; margin-bottom: 4px; }
    .summary-box .value { font-size: 16px; font-weight: bold; color: #1A56DB; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #1A56DB; color: #fff; padding: 8px 6px; text-align: center; font-weight: bold; }
    td { padding: 7px 6px; text-align: center; border-bottom: 1px solid #e5e7eb; }
    .footer { text-align: center; margin-top: 24px; color: #888; font-size: 10px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Mena Wallet</h1>
    <p>تقرير المعاملات المالية</p>
    <p>تم تطويره بواسطة المهندس معتز الورفلي</p>
  </div>
  <div class="period">الفترة: ${dateRangeLabel || "جميع المعاملات"}</div>
  <div class="summary">
    <div class="summary-box">
      <div class="label">إجمالي المعاملات</div>
      <div class="value">${data.length}</div>
    </div>
    <div class="summary-box">
      <div class="label">إجمالي القيم</div>
      <div class="value">${totalAmount.toLocaleString("ar-LY")} د.ل</div>
    </div>
    <div class="summary-box">
      <div class="label">إجمالي المسدد</div>
      <div class="value">${totalPaid.toLocaleString("ar-LY")} د.ل</div>
    </div>
    <div class="summary-box">
      <div class="label">إجمالي المتبقي</div>
      <div class="value">${totalRemaining.toLocaleString("ar-LY")} د.ل</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>صاحب القيمة</th>
        <th>المبلغ الكلي</th>
        <th>المسدد</th>
        <th>المتبقي</th>
        <th>الحالة</th>
        <th>تم الاستلام بواسطة</th>
        <th>تاريخ الإنشاء</th>
        <th>تاريخ الاستلام</th>
        <th>الملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">
    تم إنشاء هذا التقرير بتاريخ: ${new Date().toLocaleDateString("ar-LY", { year: "numeric", month: "long", day: "numeric" })}
    &nbsp;|&nbsp; Mena Wallet © ${new Date().getFullYear()}
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setShowPdfModal(false);

      if (Platform.OS === "web") {
        Alert.alert("تم", "تم إنشاء ملف PDF بنجاح");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "تصدير تقرير المعاملات",
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert("تم", `تم حفظ ملف PDF في: ${uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert("خطأ", e.message || "فشل في إنشاء PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const periods: { key: Period; label: string }[] = [
    { key: "week", label: "أسبوع" },
    { key: "month", label: "شهر" },
    { key: "year", label: "سنة" },
    { key: "all", label: "الكل" },
  ];

  const maxBarAmount = report?.transactionsByPeriod?.length
    ? Math.max(...report.transactionsByPeriod.map((p) => p.amount), 1)
    : 1;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100),
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.tint} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: C.text }]}>التقرير المالي</Text>
        {user?.role === "sender" && (
          <Pressable
            style={[styles.pdfBtn, { backgroundColor: C.tint }]}
            onPress={() => setShowPdfModal(true)}
          >
            <FileText size={16} color="#fff" />
            <Text style={styles.pdfBtnText}>PDF</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.periodSelector, { backgroundColor: C.surfaceSecondary }]}>
        {periods.map((p) => (
          <Pressable
            key={p.key}
            style={[
              styles.periodBtn,
              period === p.key && [styles.periodBtnActive, { backgroundColor: C.surface }],
            ]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[
              styles.periodBtnText,
              { color: C.textSecondary },
              period === p.key && { fontFamily: "Inter_700Bold", color: C.tint },
            ]}>
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={C.tint} />
      ) : report ? (
        <>
          <View style={[styles.mainCard, { backgroundColor: C.tint, shadowColor: C.tint }]}>
            <Text style={styles.mainCardLabel}>إجمالي القيم</Text>
            <Text style={styles.mainCardAmount}>{formatAmount(report.totalAmount)}</Text>
            <Text style={styles.mainCardCurrency}>دينار ليبي</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#2D1B0E" : "#FFFBEB" }]}>
              <Clock size={20} color={C.warning} />
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>معلقة</Text>
              <Text style={[styles.statBoxAmount, { color: C.warning }]}>{formatAmount(report.totalPending)}</Text>
              <Text style={[styles.statBoxCurrency, { color: C.textSecondary }]}>د.ل</Text>
              <Text style={[styles.statBoxCount, { color: C.textMuted }]}>{report.pendingCount} معاملة</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#052E16" : "#ECFDF5" }]}>
              <CheckCircle size={20} color={C.success} />
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>مستلمة</Text>
              <Text style={[styles.statBoxAmount, { color: C.success }]}>{formatAmount(report.totalReceived)}</Text>
              <Text style={[styles.statBoxCurrency, { color: C.textSecondary }]}>د.ل</Text>
              <Text style={[styles.statBoxCount, { color: C.textMuted }]}>{report.receivedCount} معاملة</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#1e3a8a22" : "#EFF6FF" }]}>
              <BadgeDollarSign size={20} color={C.tint} />
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>المسدد</Text>
              <Text style={[styles.statBoxAmount, { color: C.tint }]}>{formatAmount(report.totalPaid)}</Text>
              <Text style={[styles.statBoxCurrency, { color: C.textSecondary }]}>د.ل</Text>
              <Text style={[styles.statBoxCount, { color: C.textMuted }]}>إجمالي المدفوع</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#450A0A" : "#FFF1F2" }]}>
              <CircleX size={20} color={C.danger} />
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>المتبقي</Text>
              <Text style={[styles.statBoxAmount, { color: C.danger }]}>{formatAmount(report.totalAmount - report.totalPaid)}</Text>
              <Text style={[styles.statBoxCurrency, { color: C.textSecondary }]}>د.ل</Text>
              <Text style={[styles.statBoxCount, { color: C.textMuted }]}>غير مسدد</Text>
            </View>
          </View>

          {report.transactionsByPeriod.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.chartTitle, { color: C.text }]}>المعاملات بالفترة</Text>
              <View style={styles.chart}>
                {report.transactionsByPeriod.map((item, idx) => {
                  const barHeight = maxBarAmount > 0 ? (item.amount / maxBarAmount) * 120 : 4;
                  return (
                    <View key={idx} style={styles.barContainer}>
                      <Text style={[styles.barAmount, { color: C.textSecondary }]}>{item.count}</Text>
                      <View style={[styles.bar, { height: Math.max(barHeight, 4), backgroundColor: C.tint }]} />
                      <Text style={[styles.barLabel, { color: C.textSecondary }]} numberOfLines={2}>
                        {monthLabel(item.period)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={[styles.summaryCard, { backgroundColor: C.surface }]}>
            <Text style={[styles.summaryTitle, { color: C.text }]}>ملخص</Text>
            <View style={[styles.summaryRow, { borderBottomColor: C.border }]}>
              <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>إجمالي المعاملات</Text>
              <Text style={[styles.summaryValue, { color: C.text }]}>{report.pendingCount + report.receivedCount}</Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomColor: C.border }]}>
              <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>نسبة الاستلام</Text>
              <Text style={[styles.summaryValue, { color: C.text }]}>
                {report.pendingCount + report.receivedCount > 0
                  ? Math.round((report.receivedCount / (report.pendingCount + report.receivedCount)) * 100)
                  : 0}%
              </Text>
            </View>
            <View style={[styles.summaryRow, { borderBottomColor: C.border }]}>
              <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>نسبة السداد</Text>
              <Text style={[styles.summaryValue, { color: C.text }]}>
                {report.totalAmount > 0
                  ? Math.round((report.totalPaid / report.totalAmount) * 100)
                  : 0}%
              </Text>
            </View>
          </View>
        </>
      ) : null}

      <Modal
        visible={showPdfModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPdfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: C.surface }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Download size={20} color={C.tint} />
                <Text style={[styles.modalTitle, { color: C.text }]}>تصدير PDF</Text>
              </View>
              <Pressable onPress={() => setShowPdfModal(false)} style={[styles.closeBtn, { backgroundColor: C.surfaceSecondary }]}>
                <X size={18} color={C.text} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>
              حدد الفترة الزمنية لتصدير المعاملات (اتركها فارغة للكل)
            </Text>

            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: C.text }]}>تاريخ البداية</Text>
              <TextInput
                style={[styles.dateInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                value={pdfStartDate}
                onChangeText={setPdfStartDate}
                placeholder="مثال: 2025-01-01"
                placeholderTextColor={C.textMuted}
                textAlign="right"
              />
            </View>

            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: C.text }]}>تاريخ النهاية</Text>
              <TextInput
                style={[styles.dateInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                value={pdfEndDate}
                onChangeText={setPdfEndDate}
                placeholder="مثال: 2025-12-31"
                placeholderTextColor={C.textMuted}
                textAlign="right"
              />
            </View>

            <Pressable
              style={[styles.exportBtn, { backgroundColor: C.tint }, pdfLoading && { opacity: 0.7 }]}
              onPress={handleExportPdf}
              disabled={pdfLoading}
            >
              {pdfLoading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Download size={18} color="#fff" />
                    <Text style={styles.exportBtnText}>تصدير PDF</Text>
                  </>
                )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, gap: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  pdfBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  pdfBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  periodSelector: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  periodBtnActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  mainCard: { borderRadius: 24, padding: 28, alignItems: "center", gap: 4, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  mainCardLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.8)" },
  mainCardAmount: { fontSize: 44, fontFamily: "Inter_700Bold", color: "#fff" },
  mainCardCurrency: { fontSize: 14, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.8)" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statBox: { width: "47%", borderRadius: 18, padding: 16, gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  statBoxLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
  statBoxAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statBoxCurrency: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statBoxCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chartCard: { borderRadius: 20, padding: 20, gap: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  chartTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 160 },
  barContainer: { alignItems: "center", gap: 4, flex: 1 },
  barAmount: { fontSize: 10, fontFamily: "Inter_500Medium" },
  bar: { width: 28, borderRadius: 6, minHeight: 4 },
  barLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  summaryCard: { borderRadius: 20, padding: 20, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  summaryTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1 },
  summaryLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  summaryValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, gap: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dateField: { gap: 8 },
  dateLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  dateInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular" },
  exportBtn: {
    borderRadius: 14, paddingVertical: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  exportBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
