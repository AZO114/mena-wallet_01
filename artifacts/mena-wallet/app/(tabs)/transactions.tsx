import { CheckCircle, Clock, ClipboardList, Search, SlidersHorizontal, X } from "lucide-react-native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { useApp, Transaction, TransactionFilters } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function formatDate(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleDateString(lang === "ar" ? "ar-LY" : "en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(dateStr: string, lang: string): string {
  return new Date(dateStr).toLocaleTimeString(lang === "ar" ? "ar-LY" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

type FilterTab = "all" | "pending" | "received";

export default function TransactionsScreen() {
  const { user, transactions, fetchTransactions, refreshing, refresh } = useApp();
  const C = useTheme();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  const applyFilters = useCallback(async () => {
    setLoading(true);
    await fetchTransactions({
      status: activeFilter === "all" ? "all" : activeFilter,
      search: search || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
    });
    setLoading(false);
  }, [activeFilter, search, minAmount, maxAmount, fetchTransactions]);

  useEffect(() => {
    applyFilters();
  }, [activeFilter]);

  const filtered = transactions.filter((tx) => {
    if (activeFilter !== "all" && tx.status !== activeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!tx.senderName.toLowerCase().includes(s) && !tx.notes?.toLowerCase().includes(s)) return false;
    }
    if (minAmount && tx.amount < Number(minAmount)) return false;
    if (maxAmount && tx.amount > Number(maxAmount)) return false;
    return true;
  });

  const pendingCount = filtered.filter((tx) => tx.status === "pending").length;
  const receivedCount = filtered.filter((tx) => tx.status === "received").length;

  const renderItem = ({ item }: { item: Transaction }) => {
    const paidRatio = item.amount > 0 ? item.paidAmount / item.amount : 0;
    const remaining = item.amount - item.paidAmount;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.txCard,
          { backgroundColor: C.surface },
          pressed && styles.txCardPressed,
        ]}
        onPress={() => router.push(`/transaction/${item.id}`)}
      >
        <View style={styles.txTop}>
          <View style={[styles.txIcon, { backgroundColor: item.status === "pending" ? C.pendingBg : C.receivedBg }]}>
            {item.status === "pending"
              ? <Clock size={18} color={C.warning} />
              : <CheckCircle size={18} color={C.success} />}
          </View>
          <View style={styles.txMain}>
            <View style={styles.txRow}>
              <Text style={[styles.txName, { color: C.text }]}>{item.senderName}</Text>
              <Text style={[styles.txAmount, { color: C.text }]}>
                {formatAmount(item.amount)}<Text style={[styles.txCurrency, { color: C.textSecondary }]}> {t("lyD")}</Text>
              </Text>
            </View>
            <View style={styles.txRow}>
              <Text style={[styles.txMeta, { color: C.textMuted }]}>
                {formatDate(item.createdAt, lang)} · {formatTime(item.createdAt, lang)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "pending" ? C.pendingBg : C.receivedBg }]}>
                <Text style={[styles.statusText, { color: item.status === "pending" ? C.warning : C.success }]}>
                  {item.status === "pending" ? t("pending") : t("received")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {item.paidAmount > 0 && (
          <View style={styles.txFooter}>
            <View style={styles.txFooterAmounts}>
              <View style={styles.txAmountPill}>
                <Text style={[styles.txPillLabel, { color: C.textMuted }]}>{t("paid")}</Text>
                <Text style={[styles.txPillValue, { color: C.success }]}>{formatAmount(item.paidAmount)}</Text>
              </View>
              <View style={styles.txAmountPill}>
                <Text style={[styles.txPillLabel, { color: C.textMuted }]}>{t("remaining")}</Text>
                <Text style={[styles.txPillValue, { color: remaining > 0 ? C.danger : C.success }]}>{formatAmount(remaining)}</Text>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: C.surfaceSecondary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(Math.round(paidRatio * 100), 100)}%` as any,
                    backgroundColor: paidRatio >= 1 ? C.success : C.tint,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressLabel, { color: C.textMuted }]}>
              {Math.round(paidRatio * 100)}% {t("paid")}
            </Text>
          </View>
        )}

        {item.notes ? (
          <Text style={[styles.txNotes, { color: C.textMuted, borderTopColor: C.border }]} numberOfLines={1}>
            {item.notes}
          </Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: C.background }]}>
        <View>
          <Text style={[styles.headerTitle, { color: C.text }]}>{t("transactionLog")}</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>
            {filtered.length} {t("results")} · {pendingCount} {t("pending")} · {receivedCount} {t("received")}
          </Text>
        </View>
        <Pressable
          style={[styles.filterToggle, { backgroundColor: showFilters ? C.tint : C.surface }]}
          onPress={() => setShowFilters((f) => !f)}
        >
          <SlidersHorizontal size={18} color={showFilters ? "#fff" : C.textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: C.surface, borderColor: search ? C.tint : C.border }]}>
        <Search size={16} color={search ? C.tint : C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={C.textMuted}
          onSubmitEditing={applyFilters}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => { setSearch(""); applyFilters(); }}>
            <X size={16} color={C.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: C.surface, borderColor: C.border }]}>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: C.textSecondary }]}>{t("minAmount")}</Text>
              <TextInput
                style={[styles.filterInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                value={minAmount}
                onChangeText={setMinAmount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: C.textSecondary }]}>{t("maxAmount")}</Text>
              <TextInput
                style={[styles.filterInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="numeric"
                placeholder={lang === "ar" ? "غير محدود" : "Unlimited"}
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>
          <Pressable style={[styles.applyBtn, { backgroundColor: C.tint }]} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>{t("applyFilter")}</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.filterTabs, { backgroundColor: C.surfaceSecondary }]}>
        {(["all", "pending", "received"] as FilterTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.filterTab,
              activeFilter === tab && [styles.filterTabActive, { backgroundColor: C.surface, shadowColor: C.tint }],
            ]}
            onPress={() => setActiveFilter(tab)}
          >
            {activeFilter === tab && tab === "pending" && <Clock size={12} color={C.warning} />}
            {activeFilter === tab && tab === "received" && <CheckCircle size={12} color={C.success} />}
            <Text
              style={[
                styles.filterTabText,
                { color: C.textSecondary },
                activeFilter === tab && {
                  color: tab === "all" ? C.tint : tab === "pending" ? C.warning : C.success,
                  fontFamily: "Inter_700Bold",
                },
              ]}
            >
              {tab === "all" ? t("all") : tab === "pending" ? t("pending") : t("received")}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={C.tint} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) },
          ]}
          refreshControl={
            <RefreshControl refreshing={!!refreshing} onRefresh={refresh} tintColor={C.tint} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <ClipboardList size={52} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>{t("noResults")}</Text>
              <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>{t("noResultsSub")}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 14 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterToggle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, marginTop: 4 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, gap: 10, borderWidth: 1.5 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filtersPanel: { marginHorizontal: 20, marginBottom: 10, borderRadius: 16, padding: 14, gap: 12, borderWidth: 1 },
  filterRow: { flexDirection: "row", gap: 12 },
  filterField: { flex: 1, gap: 6 },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  filterInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  applyBtn: { borderRadius: 12, paddingVertical: 11, alignItems: "center" },
  applyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  filterTabs: { flexDirection: "row", marginHorizontal: 20, marginBottom: 10, borderRadius: 14, padding: 4, gap: 2 },
  filterTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 4 },
  filterTabActive: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  filterTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  listContent: { paddingHorizontal: 16, gap: 10, paddingTop: 4 },
  txCard: { borderRadius: 18, padding: 14, gap: 0, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  txCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  txTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginTop: 2 },
  txMain: { flex: 1, gap: 5 },
  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  txName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  txAmount: { fontSize: 15, fontFamily: "Inter_700Bold" },
  txCurrency: { fontSize: 11, fontFamily: "Inter_400Regular" },
  txMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  txFooter: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(148,163,184,0.15)", gap: 6 },
  txFooterAmounts: { flexDirection: "row", gap: 16 },
  txAmountPill: { gap: 1 },
  txPillLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  txPillValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  progressLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  txNotes: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
