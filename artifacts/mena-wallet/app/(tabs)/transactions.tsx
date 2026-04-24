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

function formatAmount(amount: number): string {
  return amount.toLocaleString("ar-LY", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ar-LY", { year: "numeric", month: "short", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" });
}

type FilterTab = "all" | "pending" | "received";

export default function TransactionsScreen() {
  const { user, transactions, fetchTransactions, refreshing, refresh } = useApp();
  const C = useTheme();
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

  const filtered = transactions.filter((t) => {
    if (activeFilter !== "all" && t.status !== activeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.senderName.toLowerCase().includes(s) && !t.notes?.toLowerCase().includes(s)) return false;
    }
    if (minAmount && t.amount < Number(minAmount)) return false;
    if (maxAmount && t.amount > Number(maxAmount)) return false;
    return true;
  });

  const renderItem = ({ item }: { item: Transaction }) => (
    <Pressable
      style={({ pressed }) => [
        styles.txCard,
        { backgroundColor: C.surface },
        pressed && styles.txCardPressed,
      ]}
      onPress={() => router.push(`/transaction/${item.id}`)}
    >
      <View style={styles.txTop}>
        <View style={styles.txLeft}>
          <View style={[styles.txIcon, { backgroundColor: item.status === "pending" ? C.pendingBg : C.receivedBg }]}>
            {item.status === "pending"
              ? <Clock size={18} color={C.warning} />
              : <CheckCircle size={18} color={C.success} />}
          </View>
          <View>
            <Text style={[styles.txName, { color: C.text }]}>{item.senderName}</Text>
            <Text style={[styles.txMeta, { color: C.textSecondary }]}>
              {formatDate(item.createdAt)} • {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.txRight}>
          <Text style={[styles.txAmount, { color: C.text }]}>{formatAmount(item.amount)} <Text style={[styles.txCurrency, { color: C.textSecondary }]}>د.ل</Text></Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === "pending" ? C.pendingBg : C.receivedBg }]}>
            <Text style={[styles.statusText, { color: item.status === "pending" ? C.warning : C.success }]}>
              {item.status === "pending" ? "معلقة" : "مستلمة"}
            </Text>
          </View>
        </View>
      </View>
      {item.paidAmount > 0 && (
        <View style={styles.txBottom}>
          <Text style={[styles.paidLabel, { color: C.textSecondary }]}>المسدد: <Text style={[styles.paidAmount, { color: C.text }]}>{formatAmount(item.paidAmount)} د.ل</Text></Text>
          {item.confirmedByName && (
            <Text style={[styles.confirmedBy, { color: C.textSecondary }]}>بواسطة: {item.confirmedByName}</Text>
          )}
        </View>
      )}
      {item.notes ? <Text style={[styles.txNotes, { color: C.textSecondary }]} numberOfLines={1}>{item.notes}</Text> : null}
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: C.background }]}>
        <Text style={[styles.headerTitle, { color: C.text }]}>سجل المعاملات</Text>
        <Pressable
          style={[styles.filterToggle, { backgroundColor: C.surface }]}
          onPress={() => setShowFilters((f) => !f)}
        >
          <SlidersHorizontal size={20} color={showFilters ? C.tint : C.textSecondary} />
        </Pressable>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: C.surface }]}>
        <Search size={18} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="بحث بالاسم..."
          placeholderTextColor={C.textMuted}
          onSubmitEditing={applyFilters}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => { setSearch(""); applyFilters(); }}>
            <X size={18} color={C.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {showFilters && (
        <View style={[styles.filtersPanel, { backgroundColor: C.surface }]}>
          <View style={styles.filterRow}>
            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: C.textSecondary }]}>الحد الأدنى (د.ل)</Text>
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
              <Text style={[styles.filterLabel, { color: C.textSecondary }]}>الحد الأقصى (د.ل)</Text>
              <TextInput
                style={[styles.filterInput, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
                value={maxAmount}
                onChangeText={setMaxAmount}
                keyboardType="numeric"
                placeholder="غير محدود"
                placeholderTextColor={C.textMuted}
              />
            </View>
          </View>
          <Pressable style={[styles.applyBtn, { backgroundColor: C.tint }]} onPress={applyFilters}>
            <Text style={styles.applyBtnText}>تطبيق الفلتر</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.filterTabs, { backgroundColor: C.surfaceSecondary }]}>
        {(["all", "pending", "received"] as FilterTab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[
              styles.filterTab,
              activeFilter === tab && [styles.filterTabActive, { backgroundColor: C.surface }],
            ]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text
              style={[
                styles.filterTabText,
                { color: C.textSecondary },
                activeFilter === tab && { color: C.text, fontFamily: "Inter_700Bold" },
              ]}
            >
              {tab === "all" ? "الكل" : tab === "pending" ? "معلقة" : "مستلمة"}
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
              <ClipboardList size={56} color={C.textMuted} />
              <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد معاملات</Text>
              <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>لم يتم العثور على نتائج</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  filterToggle: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  searchContainer: { flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  filtersPanel: { marginHorizontal: 20, marginBottom: 12, borderRadius: 16, padding: 16, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  filterRow: { flexDirection: "row", gap: 12 },
  filterField: { flex: 1, gap: 6 },
  filterLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  filterInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  applyBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  applyBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  filterTabs: { flexDirection: "row", marginHorizontal: 20, marginBottom: 12, borderRadius: 12, padding: 4 },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: "center" },
  filterTabActive: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  filterTabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  listContent: { paddingHorizontal: 20, gap: 10, paddingTop: 4 },
  txCard: { borderRadius: 16, padding: 16, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  txCardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  txTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  txLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  txIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  txName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  txMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  txCurrency: { fontSize: 12, fontFamily: "Inter_400Regular" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  txBottom: { flexDirection: "row", justifyContent: "space-between" },
  paidLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  paidAmount: { fontFamily: "Inter_600SemiBold" },
  confirmedBy: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txNotes: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
