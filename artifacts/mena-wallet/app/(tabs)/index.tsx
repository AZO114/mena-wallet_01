import { Bell, CheckCircle, ClipboardList, Clock, Languages, LogOut, Moon, PlusCircle, Sun, TrendingUp } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme, useThemeToggle } from "@/context/ThemeContext";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function formatDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === "ar" ? "ar-LY" : "en-US", { month: "short", day: "numeric" });
}

export default function HomeScreen() {
  const { user, logout, transactions, unreadCount, refresh, refreshing } = useApp();
  const C = useTheme();
  const { isDark, toggleTheme } = useThemeToggle();
  const { t, toggleLang, lang } = useLanguage();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  if (!user) return null;

  const pending = transactions.filter((t) => t.status === "pending");
  const received = transactions.filter((t) => t.status === "received");
  const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);
  const totalReceived = received.reduce((sum, t) => sum + t.amount, 0);
  const totalAmount = totalPending + totalReceived;
  const totalPaid = transactions.reduce((sum, t) => sum + t.paidAmount, 0);
  const paymentRatio = totalAmount > 0 ? totalPaid / totalAmount : 0;
  const recentTransactions = transactions.slice(0, 5);
  const isSender = user.role === "sender";

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
        <RefreshControl refreshing={!!refreshing} onRefresh={refresh} tintColor={C.tint} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require("@/assets/images/logo.png")} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={[styles.greeting, { color: C.textSecondary }]}>{t("greeting")}</Text>
            <Text style={[styles.userName, { color: C.text }]}>{user.name}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: C.surface }]}
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <Bell size={20} color={C.text} />
            {unreadCount > 0 && (
              <View style={[styles.badge, { backgroundColor: C.danger }]}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={toggleTheme}
            style={[styles.iconBtn, { backgroundColor: isDark ? "#1E3A8A33" : "#EEF2FF" }]}
          >
            {isDark ? <Sun size={18} color={C.gold} /> : <Moon size={18} color={C.tint} />}
          </Pressable>
          <Pressable
            onPress={toggleLang}
            style={[styles.iconBtn, { backgroundColor: C.isDark ? "#1e3a8a22" : "#EEF2FF" }]}
          >
            <Languages size={18} color={C.tint} />
          </Pressable>
          <Pressable onPress={logout} style={[styles.iconBtn, { backgroundColor: C.surface }]}>
            <LogOut size={18} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <LinearGradient
        colors={isDark ? ["#1e3a8a", "#0f2560", "#0a1830"] : ["#1A56DB", "#1342B8", "#0e2d8c"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroTitleRow}>
            <TrendingUp size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.heroLabel}>{t("totalValues")}</Text>
          </View>
          <View style={styles.heroCountBadge}>
            <Text style={styles.heroCountText}>{transactions.length} {t("txCount")}</Text>
          </View>
        </View>
        <Text style={styles.heroAmount}>{formatAmount(totalAmount)}</Text>
        <Text style={styles.heroCurrency}>{lang === "ar" ? "دينار ليبي" : "Libyan Dinar"}</Text>
        <View style={styles.heroProgressRow}>
          <Text style={styles.heroProgressLabel}>{t("paymentRate")}: {Math.round(paymentRatio * 100)}%</Text>
          <View style={styles.heroProgressTrack}>
            <View style={[styles.heroProgressFill, { width: `${Math.round(paymentRatio * 100)}%` as any }]} />
          </View>
        </View>
        <View style={styles.heroDivider} />
        <View style={styles.heroStatsRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{formatAmount(totalPaid)}</Text>
            <Text style={styles.heroStatLabel}>{t("totalPaid")}</Text>
          </View>
          <View style={styles.heroStatSep} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>{formatAmount(totalAmount - totalPaid)}</Text>
            <Text style={styles.heroStatLabel}>{t("totalRemaining")}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: C.isDark ? "#2D1B0E" : "#FFFBEB" }]}>
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBg, { backgroundColor: C.isDark ? "#78350F33" : "#FEF3C7" }]}>
              <Clock size={18} color={C.warning} />
            </View>
            <Text style={[styles.statBadge, { color: C.warning, backgroundColor: C.isDark ? "#78350F33" : "#FEF3C7" }]}>
              {pending.length}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t("pending")}</Text>
          <Text style={[styles.statAmount, { color: C.warning }]}>{formatAmount(totalPending)}</Text>
          <Text style={[styles.statCurrency, { color: C.textMuted }]}>{t("lyD")}</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: C.isDark ? "#052E16" : "#ECFDF5" }]}>
          <View style={styles.statCardTop}>
            <View style={[styles.statIconBg, { backgroundColor: C.isDark ? "#06402A33" : "#D1FAE5" }]}>
              <CheckCircle size={18} color={C.success} />
            </View>
            <Text style={[styles.statBadge, { color: C.success, backgroundColor: C.isDark ? "#06402A33" : "#D1FAE5" }]}>
              {received.length}
            </Text>
          </View>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>{t("received")}</Text>
          <Text style={[styles.statAmount, { color: C.success }]}>{formatAmount(totalReceived)}</Text>
          <Text style={[styles.statCurrency, { color: C.textMuted }]}>{t("lyD")}</Text>
        </View>
      </View>

      {isSender && (
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: C.tint, shadowColor: C.tint },
            pressed && styles.btnPressed,
          ]}
          onPress={() => router.push("/add-transaction")}
        >
          <PlusCircle size={21} color="#fff" />
          <Text style={styles.addButtonText}>{t("addValue")}</Text>
        </Pressable>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t("recentTransactions")}</Text>
          <Pressable
            style={[styles.seeAllBtn, { backgroundColor: C.isDark ? "#1e3a8a22" : "#EEF2FF" }]}
            onPress={() => router.push("/(tabs)/transactions")}
          >
            <Text style={[styles.sectionLink, { color: C.tint }]}>{t("viewAll")}</Text>
          </Pressable>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: C.surface }]}>
            <ClipboardList size={44} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>{t("noTransactions")}</Text>
          </View>
        ) : (
          recentTransactions.map((tx) => {
            const paidRatio = tx.amount > 0 ? tx.paidAmount / tx.amount : 0;
            return (
              <Pressable
                key={tx.id}
                style={({ pressed }) => [
                  styles.txCard,
                  { backgroundColor: C.surface },
                  pressed && styles.txCardPressed,
                ]}
                onPress={() => router.push(`/transaction/${tx.id}`)}
              >
                <View style={styles.txCardMain}>
                  <View
                    style={[
                      styles.txStatusDot,
                      { backgroundColor: tx.status === "pending" ? C.pendingBg : C.receivedBg },
                    ]}
                  >
                    {tx.status === "pending"
                      ? <Clock size={16} color={C.warning} />
                      : <CheckCircle size={16} color={C.success} />}
                  </View>
                  <View style={styles.txInfo}>
                    <View style={styles.txInfoTop}>
                      <Text style={[styles.txName, { color: C.text }]}>{tx.senderName}</Text>
                      <Text style={[styles.txAmount, { color: C.text }]}>{formatAmount(tx.amount)}<Text style={[styles.txCurrency, { color: C.textSecondary }]}> {t("lyD")}</Text></Text>
                    </View>
                    <View style={styles.txInfoBottom}>
                      <Text style={[styles.txDate, { color: C.textMuted }]}>{formatDate(tx.createdAt, lang)}</Text>
                      <View style={[styles.txBadge, { backgroundColor: tx.status === "pending" ? C.pendingBg : C.receivedBg }]}>
                        <Text style={[styles.txBadgeText, { color: tx.status === "pending" ? C.warning : C.success }]}>
                          {tx.status === "pending" ? t("pending") : t("received")}
                        </Text>
                      </View>
                    </View>
                    {tx.paidAmount > 0 && tx.status === "pending" && (
                      <View style={styles.txProgressRow}>
                        <View style={[styles.txProgressTrack, { backgroundColor: C.surfaceSecondary }]}>
                          <View style={[styles.txProgressFill, { width: `${Math.round(paidRatio * 100)}%` as any, backgroundColor: C.success }]} />
                        </View>
                        <Text style={[styles.txProgressLabel, { color: C.textMuted }]}>{Math.round(paidRatio * 100)}%</Text>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerLogo: { width: 80, height: 28 },
  greeting: { fontSize: 11, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  badge: {
    position: "absolute", top: 5, right: 5,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  heroCard: {
    borderRadius: 24, padding: 22,
    shadowColor: "#1A56DB", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.75)" },
  heroCountBadge: { backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  heroCountText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.9)" },
  heroAmount: { fontSize: 42, fontFamily: "Inter_700Bold", color: "#fff", marginTop: 2 },
  heroCurrency: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)", marginTop: -4, marginBottom: 14 },
  heroProgressRow: { gap: 6, marginBottom: 14 },
  heroProgressLabel: { fontSize: 11, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  heroProgressTrack: { height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  heroProgressFill: { height: "100%", borderRadius: 3, backgroundColor: "rgba(255,255,255,0.9)" },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginBottom: 14 },
  heroStatsRow: { flexDirection: "row" },
  heroStat: { flex: 1, alignItems: "center" },
  heroStatSep: { width: 1, backgroundColor: "rgba(255,255,255,0.2)" },
  heroStatValue: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  heroStatLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 16, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  statIconBg: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  statBadge: { fontSize: 13, fontFamily: "Inter_700Bold", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statAmount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statCurrency: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -4 },
  addButton: {
    borderRadius: 16, paddingVertical: 15, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  addButtonText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.97 }] },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  seeAllBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  sectionLink: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12, borderRadius: 20 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  txCard: {
    borderRadius: 16, padding: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  txCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  txCardMain: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  txStatusDot: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center", marginTop: 2 },
  txInfo: { flex: 1, gap: 4 },
  txInfoTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  txInfoBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  txName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  txAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  txCurrency: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  txBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  txBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  txProgressRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  txProgressTrack: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  txProgressFill: { height: "100%", borderRadius: 2 },
  txProgressLabel: { fontSize: 10, fontFamily: "Inter_500Medium", width: 30, textAlign: "right" },
});
