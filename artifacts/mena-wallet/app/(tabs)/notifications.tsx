import { Bell, BellOff, BellRing, CheckCircle, CheckSquare } from "lucide-react-native";
import { router } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";
import { useApp, Notification } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

function timeAgo(dateStr: string, lang: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (lang === "en") {
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    return `${diffDays}d ago`;
  }

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  if (diffDays === 1) return "أمس";
  return `منذ ${diffDays} يوم`;
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isYesterday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

type GroupedItem =
  | { type: "header"; label: string; key: string }
  | { type: "notif"; item: Notification; key: string };

export default function NotificationsScreen() {
  const { user, notifications, markNotificationRead, markAllRead, unreadCount, refresh, refreshing } = useApp();
  const C = useTheme();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  const handleNotifPress = useCallback(
    async (notif: Notification) => {
      if (!notif.isRead) await markNotificationRead(notif.id);
      router.push(`/transaction/${notif.transactionId}`);
    },
    [markNotificationRead]
  );

  function getGroupLabel(dateStr: string): string {
    if (isToday(dateStr)) return t("today");
    if (isYesterday(dateStr)) return t("yesterday");
    return t("earlier");
  }

  const groupedData: GroupedItem[] = (() => {
    const result: GroupedItem[] = [];
    let lastLabel = "";
    for (const n of notifications) {
      const label = getGroupLabel(n.createdAt);
      if (label !== lastLabel) {
        result.push({ type: "header", label, key: `header_${label}` });
        lastLabel = label;
      }
      result.push({ type: "notif", item: n, key: n.id });
    }
    return result;
  })();

  const renderItem = ({ item }: { item: GroupedItem }) => {
    if (item.type === "header") {
      return (
        <View style={styles.groupHeader}>
          <Text style={[styles.groupLabel, { color: C.textMuted }]}>{item.label}</Text>
          <View style={[styles.groupLine, { backgroundColor: C.border }]} />
        </View>
      );
    }
    const notif = item.item;
    const isConfirm = notif.title.includes("استلام") || notif.title.includes("تأكيد") || notif.title.includes("Receipt") || notif.title.includes("Confirm");
    return (
      <Pressable
        style={({ pressed }) => [
          styles.notifCard,
          { backgroundColor: notif.isRead ? C.surface : C.isDark ? "#1a2340" : "#F5F8FF" },
          !notif.isRead && { borderRightWidth: 3, borderRightColor: C.tint },
          pressed && styles.notifCardPressed,
        ]}
        onPress={() => handleNotifPress(notif)}
      >
        <View style={styles.notifIconWrap}>
          <View
            style={[
              styles.notifIconBg,
              { backgroundColor: notif.isRead ? C.surfaceSecondary : C.isDark ? "#1e3a8a44" : "#DBEAFE" },
            ]}
          >
            {isConfirm
              ? <CheckCircle size={20} color={notif.isRead ? C.textMuted : C.success} />
              : <BellRing size={20} color={notif.isRead ? C.textMuted : C.tint} />}
          </View>
          {!notif.isRead && <View style={[styles.unreadDot, { backgroundColor: C.tint }]} />}
        </View>

        <View style={styles.notifContent}>
          <View style={styles.notifTop}>
            <Text
              style={[
                styles.notifTitle,
                { color: notif.isRead ? C.textSecondary : C.text },
                !notif.isRead && { fontFamily: "Inter_700Bold" },
              ]}
              numberOfLines={1}
            >
              {notif.title}
            </Text>
            <Text style={[styles.notifTime, { color: C.textMuted }]}>{timeAgo(notif.createdAt, lang)}</Text>
          </View>
          <Text style={[styles.notifBody, { color: C.textSecondary }]} numberOfLines={3}>
            {notif.body}
          </Text>
          {!notif.isRead && (
            <View style={[styles.unreadLabel, { backgroundColor: C.isDark ? "#1e3a8a33" : "#EEF2FF" }]}>
              <View style={[styles.unreadLabelDot, { backgroundColor: C.tint }]} />
              <Text style={[styles.unreadLabelText, { color: C.tint }]}>{t("newBadge")}</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: C.background },
        ]}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconBg, { backgroundColor: C.isDark ? "#1e3a8a33" : "#EEF2FF" }]}>
            <Bell size={20} color={C.tint} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>{t("notifications")}</Text>
            {unreadCount > 0 && (
              <Text style={[styles.headerSub, { color: C.tint }]}>{unreadCount} {t("unread")}</Text>
            )}
          </View>
        </View>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            style={[styles.markAllBtn, { backgroundColor: C.isDark ? "#1e3a8a22" : "#EEF2FF" }]}
          >
            <CheckSquare size={15} color={C.tint} />
            <Text style={[styles.markAllText, { color: C.tint }]}>{t("markAllRead")}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 34 : 100) },
        ]}
        refreshControl={
          <RefreshControl refreshing={!!refreshing} onRefresh={refresh} tintColor={C.tint} />
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconBg, { backgroundColor: C.surfaceSecondary }]}>
              <BellOff size={36} color={C.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>{t("noNotifications")}</Text>
            <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>{t("noNotificationsSub")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 14,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconBg: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  markAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },
  groupHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  groupLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", minWidth: 40 },
  groupLine: { flex: 1, height: 1 },
  notifCard: {
    borderRadius: 18, padding: 14, flexDirection: "row", gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  notifCardPressed: { opacity: 0.85 },
  notifIconWrap: { position: "relative" },
  notifIconBg: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  unreadDot: {
    position: "absolute", top: 1, right: 1,
    width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "#fff",
  },
  notifContent: { flex: 1, gap: 5 },
  notifTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular", flexShrink: 0 },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  unreadLabel: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  unreadLabelDot: { width: 6, height: 6, borderRadius: 3 },
  unreadLabelText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
