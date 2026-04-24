import { Bell, Bot, CheckCircle, ClipboardList, Clock, LogOut, Moon, PlusCircle, Sun } from "lucide-react-native";
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

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" });
}

export default function HomeScreen() {
  const { user, logout, transactions, unreadCount, refresh, refreshing } = useApp();
  const C = useTheme();
  const { isDark, toggleTheme } = useThemeToggle();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  if (!user) return null;

  const pending = transactions.filter((t) => t.status === "pending");
  const received = transactions.filter((t) => t.status === "received");
  const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);
  const totalReceived = received.reduce((sum, t) => sum + t.amount, 0);
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
          <Image source={require("@/assets/images/icon.png")} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={[styles.greeting, { color: C.textSecondary }]}>مرحباً</Text>
            <Text style={[styles.userName, { color: C.text }]}>{user.name}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: C.surface }]}
            onPress={() => router.push("/(tabs)/notifications")}
          >
            <Bell size={22} color={C.text} />
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
            {isDark
              ? <Sun size={20} color={C.gold} />
              : <Moon size={20} color={C.tint} />}
          </Pressable>
          <Pressable onPress={logout} style={[styles.iconBtn, { backgroundColor: C.surface }]}>
            <LogOut size={20} color={C.textSecondary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: C.isDark ? "#2D1B0E" : "#FFFBEB" }]}>
          <View style={styles.statIcon}><Clock size={20} color={C.warning} /></View>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>معلقة</Text>
          <Text style={[styles.statAmount, { color: C.warning }]}>{formatAmount(totalPending)}</Text>
          <Text style={[styles.statCurrency, { color: C.textSecondary }]}>د.ل</Text>
          <Text style={[styles.statCount, { color: C.textMuted }]}>{pending.length} معاملة</Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: C.isDark ? "#052E16" : "#ECFDF5" }]}>
          <View style={styles.statIcon}><CheckCircle size={20} color={C.success} /></View>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>مستلمة</Text>
          <Text style={[styles.statAmount, { color: C.success }]}>{formatAmount(totalReceived)}</Text>
          <Text style={[styles.statCurrency, { color: C.textSecondary }]}>د.ل</Text>
          <Text style={[styles.statCount, { color: C.textMuted }]}>{received.length} معاملة</Text>
        </View>
      </View>

      {isSender && (
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { backgroundColor: C.tint, shadowColor: C.tint, flex: 1 },
              pressed && styles.btnPressed,
            ]}
            onPress={() => router.push("/add-transaction")}
          >
            <PlusCircle size={22} color="#fff" />
            <Text style={styles.addButtonText}>إضافة قيمة</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.aiButton,
              { backgroundColor: C.isDark ? "#1E293B" : "#EEF2FF", borderColor: C.tint },
              pressed && styles.btnPressed,
            ]}
            onPress={() => router.push("/(tabs)/ai")}
          >
            <Bot size={22} color={C.tint} />
            <Text style={[styles.aiButtonText, { color: C.tint }]}>Mena AI</Text>
          </Pressable>
        </View>
      )}

      {!isSender && (
        <Pressable
          style={({ pressed }) => [
            styles.aiButton,
            { backgroundColor: C.isDark ? "#1E293B" : "#EEF2FF", borderColor: C.tint },
            pressed && styles.btnPressed,
          ]}
          onPress={() => router.push("/(tabs)/ai")}
        >
          <Bot size={22} color={C.tint} />
          <Text style={[styles.aiButtonText, { color: C.tint }]}>Mena AI - المساعد الذكي</Text>
        </Pressable>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>أحدث المعاملات</Text>
          <Pressable onPress={() => router.push("/(tabs)/transactions")}>
            <Text style={[styles.sectionLink, { color: C.tint }]}>عرض الكل</Text>
          </Pressable>
        </View>

        {recentTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <ClipboardList size={48} color={C.textMuted} />
            <Text style={[styles.emptyText, { color: C.textMuted }]}>لا توجد معاملات بعد</Text>
          </View>
        ) : (
          recentTransactions.map((tx) => (
            <Pressable
              key={tx.id}
              style={({ pressed }) => [
                styles.txCard,
                { backgroundColor: C.surface },
                pressed && styles.txCardPressed,
              ]}
              onPress={() => router.push(`/transaction/${tx.id}`)}
            >
              <View style={styles.txLeft}>
                <View
                  style={[
                    styles.txStatus,
                    { backgroundColor: tx.status === "pending" ? C.pendingBg : C.receivedBg },
                  ]}
                >
                  {tx.status === "pending"
                    ? <Clock size={16} color={C.warning} />
                    : <CheckCircle size={16} color={C.success} />}
                </View>
                <View>
                  <Text style={[styles.txName, { color: C.text }]}>{tx.senderName}</Text>
                  <Text style={[styles.txDate, { color: C.textSecondary }]}>{formatDate(tx.createdAt)}</Text>
                </View>
              </View>
              <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: C.text }]}>{formatAmount(tx.amount)}</Text>
                <Text style={[styles.txCurrency, { color: C.textSecondary }]}>د.ل</Text>
                <View
                  style={[
                    styles.txBadge,
                    { backgroundColor: tx.status === "pending" ? C.pendingBg : C.receivedBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.txBadgeText,
                      { color: tx.status === "pending" ? C.warning : C.success },
                    ]}
                  >
                    {tx.status === "pending" ? "معلقة" : "مستلمة"}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerLogo: { width: 44, height: 44, borderRadius: 10 },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 42, height: 42, borderRadius: 21,
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  badge: {
    position: "absolute", top: 6, right: 6,
    width: 16, height: 16, borderRadius: 8,
    justifyContent: "center", alignItems: "center",
  },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#fff" },
  statsRow: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 18, alignItems: "flex-start", gap: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  statIcon: { marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statAmount: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statCurrency: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: -4 },
  statCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actionsRow: { flexDirection: "row", gap: 12 },
  addButton: {
    borderRadius: 16, paddingVertical: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  addButtonText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  aiButton: {
    borderRadius: 16, paddingVertical: 16, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 10,
    borderWidth: 1.5,
  },
  aiButtonText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  section: { gap: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  sectionLink: { fontSize: 14, fontFamily: "Inter_500Medium" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  txCard: {
    borderRadius: 16, padding: 16, flexDirection: "row",
    justifyContent: "space-between", alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 1,
  },
  txCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  txLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  txStatus: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  txName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  txDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 17, fontFamily: "Inter_700Bold" },
  txCurrency: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -4 },
  txBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  txBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
