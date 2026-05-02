import { BadgeDollarSign, CheckCircle, CircleX, Clock, Download, FileText, TrendingUp, X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
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

import { useTheme, useThemeToggle } from "@/context/ThemeContext";
import { useApp, FinancialReport } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

type Period = "week" | "month" | "year" | "all";

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function getMonthLabel(period: string, t: (k: any) => string): string {
  const [, month] = period.split("-");
  const keys = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"] as const;
  if (month) return t(keys[parseInt(month, 10) - 1] as any);
  return period;
}

export default function ReportsScreen() {
  const { user, getFinancialReport } = useApp();
  const C = useTheme();
  const { isDark } = useThemeToggle();
  const { t, lang } = useLanguage();
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
      Alert.alert(lang === "ar" ? "تنبيه" : "Warning", lang === "ar" ? "يرجى تحديد تاريخ البداية أو النهاية" : "Please specify a start or end date");
      return;
    }
    setPdfLoading(true);
    try {
      const params = new URLSearchParams();
      if (pdfStartDate) params.append("startDate", pdfStartDate);
      if (pdfEndDate) params.append("endDate", pdfEndDate);

      const res = await fetch(`${BASE_URL}/reports/export?${params.toString()}`);
      if (!res.ok) throw new Error(lang === "ar" ? "فشل في جلب البيانات" : "Failed to fetch data");
      const data: any[] = await res.json();

      if (data.length === 0) {
        Alert.alert(
          lang === "ar" ? "لا توجد بيانات" : "No data",
          lang === "ar" ? "لا توجد معاملات في الفترة المحددة" : "No transactions in the selected period"
        );
        setPdfLoading(false);
        return;
      }

      const totalAmount = data.reduce((s, tx) => s + tx.amount, 0);
      const totalPaid = data.reduce((s, tx) => s + tx.paidAmount, 0);
      const totalRemaining = data.reduce((s, tx) => s + tx.remaining, 0);
      const payPct = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

      const rows = data.map((tx, i) => `
        <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#ffffff'}">
          <td style="color:#64748b;font-size:11px">${i + 1}</td>
          <td style="font-weight:600">${tx.senderName}</td>
          <td style="font-weight:700;color:#0f172a">${tx.amount.toLocaleString("ar-LY")} د.ل</td>
          <td style="color:#10B981;font-weight:600">${tx.paidAmount.toLocaleString("ar-LY")} د.ل</td>
          <td style="color:${tx.remaining > 0 ? '#EF4444' : '#10B981'};font-weight:600">${tx.remaining.toLocaleString("ar-LY")} د.ل</td>
          <td><span style="background:${tx.status === 'مستلمة' ? '#D1FAE5' : '#FEF3C7'};color:${tx.status === 'مستلمة' ? '#10B981' : '#F59E0B'};padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700">${tx.status}</span></td>
          <td style="color:#64748b">${tx.confirmedByName || '—'}</td>
          <td style="color:#64748b;font-size:10px">${tx.createdAt}</td>
          <td style="color:#64748b;font-size:10px">${tx.confirmedAt || '—'}</td>
          <td style="color:#64748b;font-size:10px;font-style:italic">${tx.notes || '—'}</td>
        </tr>`).join("");

      const dateRangeLabel = [
        pdfStartDate ? `${lang === "ar" ? "من" : "From"}: ${pdfStartDate}` : "",
        pdfEndDate ? `${lang === "ar" ? "إلى" : "To"}: ${pdfEndDate}` : "",
      ].filter(Boolean).join("  —  ");

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Arial', sans-serif; direction: rtl; background: #fff; color: #0f172a; padding: 24px; font-size: 11px; }
    .header { text-align: center; margin-bottom: 28px; }
    .header-inner { background: linear-gradient(135deg, #1A56DB, #1342B8); border-radius: 16px; padding: 20px 28px; color: #fff; }
    .header h1 { font-size: 28px; margin-bottom: 4px; letter-spacing: -0.5px; }
    .header p { opacity: 0.8; font-size: 13px; }
    .period { text-align: center; color: #64748b; margin-bottom: 20px; font-size: 13px; background: #f1f5f9; padding: 8px 16px; border-radius: 10px; display: inline-block; }
    .period-wrap { text-align: center; margin-bottom: 20px; }
    .summary { display: flex; gap: 12px; margin-bottom: 24px; justify-content: center; flex-wrap: wrap; }
    .summary-box { border-radius: 12px; padding: 14px 20px; text-align: center; min-width: 130px; border: 1px solid; }
    .summary-box.total { background: #EFF6FF; border-color: #BFDBFE; }
    .summary-box.paid { background: #ECFDF5; border-color: #A7F3D0; }
    .summary-box.remaining { background: #FEF2F2; border-color: #FECACA; }
    .summary-box.count { background: #F5F3FF; border-color: #DDD6FE; }
    .summary-box .label { font-size: 10px; color: #64748b; margin-bottom: 5px; font-weight: 600; }
    .summary-box .value { font-size: 17px; font-weight: 800; }
    .summary-box.total .value { color: #1A56DB; }
    .summary-box.paid .value { color: #10B981; }
    .summary-box.remaining .value { color: #EF4444; }
    .summary-box.count .value { color: #7C3AED; }
    .progress-bar-wrap { margin-bottom: 20px; }
    .progress-label { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 6px; }
    .progress-track { height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 8px; background: linear-gradient(90deg, #1A56DB, #10B981); border-radius: 4px; width: ${payPct}%; }
    table { width: 100%; border-collapse: collapse; }
    th { background: linear-gradient(135deg, #1A56DB, #1342B8); color: #fff; padding: 9px 7px; text-align: center; font-weight: 700; font-size: 10px; }
    th:first-child { border-radius: 0 8px 0 0; }
    th:last-child { border-radius: 8px 0 0 0; }
    td { padding: 8px 7px; text-align: center; border-bottom: 1px solid #f1f5f9; }
    .footer { text-align: center; margin-top: 28px; color: #94a3b8; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-inner">
      <h1>Mena Wallet</h1>
      <p>تقرير المعاملات المالية</p>
    </div>
  </div>
  <div class="period-wrap">
    <span class="period">الفترة: ${dateRangeLabel || "جميع المعاملات"}</span>
  </div>
  <div class="summary">
    <div class="summary-box total">
      <div class="label">إجمالي القيم</div>
      <div class="value">${totalAmount.toLocaleString("ar-LY")} د.ل</div>
    </div>
    <div class="summary-box paid">
      <div class="label">إجمالي المسدد</div>
      <div class="value">${totalPaid.toLocaleString("ar-LY")} د.ل</div>
    </div>
    <div class="summary-box remaining">
      <div class="label">إجمالي المتبقي</div>
      <div class="value">${totalRemaining.toLocaleString("ar-LY")} د.ل</div>
    </div>
    <div class="summary-box count">
      <div class="label">عدد المعاملات</div>
      <div class="value">${data.length}</div>
    </div>
  </div>
  <div class="progress-bar-wrap">
    <div class="progress-label">
      <span>نسبة السداد</span>
      <span>${payPct}%</span>
    </div>
    <div class="progress-track">
      <div class="progress-fill"></div>
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
        <th>استلم بواسطة</th>
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
    &nbsp;·&nbsp; Mena Wallet © ${new Date().getFullYear()}
  </div>
</body>
</html>`;

      const { uri } = await Print.printToFileAsync({ html, base64: false });
      setShowPdfModal(false);

      if (Platform.OS === "web") {
        Alert.alert(lang === "ar" ? "تم" : "Done", lang === "ar" ? "تم إنشاء ملف PDF بنجاح" : "PDF created successfully");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: lang === "ar" ? "تصدير تقرير المعاملات" : "Export Transactions Report",
            UTI: "com.adobe.pdf",
          });
        } else {
          Alert.alert(lang === "ar" ? "تم" : "Done", `PDF: ${uri}`);
        }
      }
    } catch (e: any) {
      Alert.alert(t("error"), e.message || (lang === "ar" ? "فشل في إنشاء PDF" : "Failed to create PDF"));
    } finally {
      setPdfLoading(false);
    }
  };

  const periods: { key: Period; label: string }[] = [
    { key: "week", label: t("week") },
    { key: "month", label: t("month") },
    { key: "year", label: t("year") },
    { key: "all", label: t("all") },
  ];

  const maxBarAmount = report?.transactionsByPeriod?.length
    ? Math.max(...report.transactionsByPeriod.map((p) => p.amount), 1)
    : 1;

  const totalTx = (report?.pendingCount ?? 0) + (report?.receivedCount ?? 0);
  const payRatio = report && report.totalAmount > 0 ? report.totalPaid / report.totalAmount : 0;
  const receiveRatio = totalTx > 0 ? (report?.receivedCount ?? 0) / totalTx : 0;

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
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconBg, { backgroundColor: isDark ? "#1e3a8a33" : "#EEF2FF" }]}>
            <TrendingUp size={20} color={C.tint} />
          </View>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t("reports")}</Text>
        </View>
        {user?.role === "sender" && (
          <Pressable
            style={[styles.pdfBtn, { backgroundColor: C.tint, shadowColor: C.tint }]}
            onPress={() => setShowPdfModal(true)}
          >
            <FileText size={15} color="#fff" />
            <Text style={styles.pdfBtnText}>{t("exportPdf")}</Text>
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
          <LinearGradient
            colors={isDark ? ["#1e3a8a", "#0f2560", "#0a1830"] : ["#1A56DB", "#1342B8", "#0e2d8c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mainCard}
          >
            <Text style={styles.mainCardLabel}>{t("totalValues")}</Text>
            <Text style={styles.mainCardAmount}>{formatAmount(report.totalAmount)}</Text>
            <Text style={styles.mainCardCurrency}>{lang === "ar" ? "دينار ليبي" : "Libyan Dinar"}</Text>
            <View style={styles.mainCardProgress}>
              <View style={styles.mainCardProgressRow}>
                <Text style={styles.mainCardProgressLabel}>{t("paymentRateLabel")}: {Math.round(payRatio * 100)}%</Text>
                <Text style={styles.mainCardProgressLabel}>{totalTx} {t("txCount")}</Text>
              </View>
              <View style={styles.mainCardProgressTrack}>
                <View style={[styles.mainCardProgressFill, { width: `${Math.round(payRatio * 100)}%` as any }]} />
              </View>
            </View>
          </LinearGradient>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#2D1B0E" : "#FFFBEB" }]}>
              <View style={[styles.statIconBg, { backgroundColor: C.isDark ? "#78350F44" : "#FEF3C7" }]}>
                <Clock size={18} color={C.warning} />
              </View>
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>{t("pending")}</Text>
              <Text style={[styles.statBoxAmount, { color: C.warning }]}>{formatAmount(report.totalPending)}</Text>
              <Text style={[styles.statBoxSub, { color: C.textMuted }]}>{report.pendingCount} {t("txCount")}</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#052E16" : "#ECFDF5" }]}>
              <View style={[styles.statIconBg, { backgroundColor: C.isDark ? "#064E3B44" : "#D1FAE5" }]}>
                <CheckCircle size={18} color={C.success} />
              </View>
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>{t("received")}</Text>
              <Text style={[styles.statBoxAmount, { color: C.success }]}>{formatAmount(report.totalReceived)}</Text>
              <Text style={[styles.statBoxSub, { color: C.textMuted }]}>{report.receivedCount} {t("txCount")}</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#1e3a8a22" : "#EFF6FF" }]}>
              <View style={[styles.statIconBg, { backgroundColor: C.isDark ? "#1e3a8a44" : "#DBEAFE" }]}>
                <BadgeDollarSign size={18} color={C.tint} />
              </View>
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>{t("paid")}</Text>
              <Text style={[styles.statBoxAmount, { color: C.tint }]}>{formatAmount(report.totalPaid)}</Text>
              <Text style={[styles.statBoxSub, { color: C.textMuted }]}>{lang === "ar" ? "مجموع المدفوع" : "Total paid"}</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: C.isDark ? "#450A0A" : "#FFF1F2" }]}>
              <View style={[styles.statIconBg, { backgroundColor: C.isDark ? "#7F1D1D44" : "#FECDD3" }]}>
                <CircleX size={18} color={C.danger} />
              </View>
              <Text style={[styles.statBoxLabel, { color: C.textSecondary }]}>{t("remaining")}</Text>
              <Text style={[styles.statBoxAmount, { color: C.danger }]}>{formatAmount(report.totalAmount - report.totalPaid)}</Text>
              <Text style={[styles.statBoxSub, { color: C.textMuted }]}>{lang === "ar" ? "غير مسدد" : "Unpaid"}</Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: C.surface }]}>
            <Text style={[styles.summaryTitle, { color: C.text }]}>{t("paymentSummary")}</Text>
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemTop}>
                <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>{t("paymentRateLabel")}</Text>
                <Text style={[styles.summaryPct, { color: C.tint }]}>{Math.round(payRatio * 100)}%</Text>
              </View>
              <View style={[styles.summaryTrack, { backgroundColor: C.surfaceSecondary }]}>
                <View style={[styles.summaryFill, { width: `${Math.round(payRatio * 100)}%` as any, backgroundColor: C.tint }]} />
              </View>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: C.border }]} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryItemTop}>
                <Text style={[styles.summaryLabel, { color: C.textSecondary }]}>{t("receiveRate")}</Text>
                <Text style={[styles.summaryPct, { color: C.success }]}>{Math.round(receiveRatio * 100)}%</Text>
              </View>
              <View style={[styles.summaryTrack, { backgroundColor: C.surfaceSecondary }]}>
                <View style={[styles.summaryFill, { width: `${Math.round(receiveRatio * 100)}%` as any, backgroundColor: C.success }]} />
              </View>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: C.border }]} />
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, { color: C.text }]}>{totalTx}</Text>
                <Text style={[styles.summaryStatLabel, { color: C.textMuted }]}>{t("totalTx")}</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, { color: C.warning }]}>{report.pendingCount}</Text>
                <Text style={[styles.summaryStatLabel, { color: C.textMuted }]}>{t("pending")}</Text>
              </View>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, { color: C.success }]}>{report.receivedCount}</Text>
                <Text style={[styles.summaryStatLabel, { color: C.textMuted }]}>{t("received")}</Text>
              </View>
            </View>
          </View>

          {report.transactionsByPeriod.length > 0 && (
            <View style={[styles.chartCard, { backgroundColor: C.surface }]}>
              <Text style={[styles.chartTitle, { color: C.text }]}>{t("periodChart")}</Text>
              <View style={styles.chart}>
                {report.transactionsByPeriod.map((item, idx) => {
                  const barH = maxBarAmount > 0 ? (item.amount / maxBarAmount) * 110 : 4;
                  const isMax = item.amount === maxBarAmount;
                  return (
                    <View key={idx} style={styles.barContainer}>
                      <Text style={[styles.barCount, { color: isMax ? C.tint : C.textMuted }]}>{item.count}</Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(barH, 6),
                            backgroundColor: isMax ? C.tint : C.isDark ? "#1e3a8a" : "#BFDBFE",
                          },
                        ]}
                      />
                      <Text style={[styles.barLabel, { color: C.textSecondary }]} numberOfLines={2}>
                        {getMonthLabel(item.period, t)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
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
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIconBg, { backgroundColor: C.isDark ? "#1e3a8a33" : "#EEF2FF" }]}>
                  <Download size={20} color={C.tint} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: C.text }]}>{t("exportPdfTitle")}</Text>
                  <Text style={[styles.modalSubtitle, { color: C.textSecondary }]}>{t("exportPdfSub")}</Text>
                </View>
              </View>
              <Pressable onPress={() => setShowPdfModal(false)} style={[styles.closeBtn, { backgroundColor: C.surfaceSecondary }]}>
                <X size={18} color={C.text} />
              </Pressable>
            </View>

            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: C.text }]}>{t("startDate")}</Text>
              <TextInput
                style={[styles.dateInput, { color: C.text, borderColor: pdfStartDate ? C.tint : C.border, backgroundColor: C.surfaceSecondary }]}
                value={pdfStartDate}
                onChangeText={setPdfStartDate}
                placeholder={t("startDatePlaceholder")}
                placeholderTextColor={C.textMuted}
                textAlign="right"
              />
            </View>

            <View style={styles.dateField}>
              <Text style={[styles.dateLabel, { color: C.text }]}>{t("endDate")}</Text>
              <TextInput
                style={[styles.dateInput, { color: C.text, borderColor: pdfEndDate ? C.tint : C.border, backgroundColor: C.surfaceSecondary }]}
                value={pdfEndDate}
                onChangeText={setPdfEndDate}
                placeholder={t("endDatePlaceholder")}
                placeholderTextColor={C.textMuted}
                textAlign="right"
              />
            </View>

            <Pressable
              style={[styles.exportBtn, { backgroundColor: C.tint, shadowColor: C.tint }, pdfLoading && { opacity: 0.7 }]}
              onPress={handleExportPdf}
              disabled={pdfLoading}
            >
              {pdfLoading
                ? <ActivityIndicator color="#fff" />
                : (
                  <>
                    <Download size={18} color="#fff" />
                    <Text style={styles.exportBtnText}>{t("exportPdf")}</Text>
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
  contentContainer: { paddingHorizontal: 16, gap: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconBg: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  pdfBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  pdfBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  periodSelector: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  periodBtn: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 10 },
  periodBtnActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  periodBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  mainCard: {
    borderRadius: 24, padding: 22,
    shadowColor: "#1A56DB", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  mainCardLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)", marginBottom: 4 },
  mainCardAmount: { fontSize: 38, fontFamily: "Inter_700Bold", color: "#fff" },
  mainCardCurrency: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: -2, marginBottom: 14 },
  mainCardProgress: { gap: 6 },
  mainCardProgressRow: { flexDirection: "row", justifyContent: "space-between" },
  mainCardProgressLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  mainCardProgressTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  mainCardProgressFill: { height: "100%", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.9)" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statBox: {
    width: "47%", borderRadius: 18, padding: 14, gap: 5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  statIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginBottom: 2 },
  statBoxLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statBoxAmount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statBoxSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryCard: {
    borderRadius: 20, padding: 18, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  summaryTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  summaryItem: { gap: 8 },
  summaryItemTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  summaryPct: { fontSize: 15, fontFamily: "Inter_700Bold" },
  summaryTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  summaryFill: { height: "100%", borderRadius: 4 },
  summaryDivider: { height: 1 },
  summaryStatsRow: { flexDirection: "row", justifyContent: "space-around" },
  summaryStat: { alignItems: "center", gap: 2 },
  summaryStatValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
  summaryStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  chartCard: {
    borderRadius: 20, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  chartTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 14 },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", height: 150 },
  barContainer: { flex: 1, alignItems: "center", gap: 4 },
  barCount: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  bar: { width: "60%", borderRadius: 4 },
  barLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, gap: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.12, shadowRadius: 20, elevation: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginBottom: 4 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  modalIconBg: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  dateField: { gap: 8 },
  dateLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dateInput: {
    borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16,
    paddingVertical: 14, fontSize: 15, fontFamily: "Inter_400Regular",
  },
  exportBtn: {
    borderRadius: 16, paddingVertical: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  exportBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
});
