import { BellOff, BellRing, CheckCircle, CheckSquare } from "lucide-react-native";
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

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "الآن";
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  return `منذ ${diffDays} يوم`;
}

export default function NotificationsScreen() {
  const { user, notifications, markNotificationRead, markAllRead, unreadCount, refresh, refreshing } = useApp();
  const C = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!user) router.replace("/");
  }, [user]);

  const handleNotifPress = useCallback(
    async (notif: Notification) => {
      if (!notif.isRead) {
        await markNotificationRead(notif.id);
      }
      router.push(`/transaction/${notif.transactionId}`);
    },
    [markNotificationRead]
  );

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      style={({ pressed }) => [
        styles.notifCard,
        { backgroundColor: item.isRead ? C.surface : C.isDark ? "#1a2340" : "#FAFBFF" },
        !item.isRead && { borderLeftWidth: 3, borderLeftColor: C.tint },
        pressed && styles.notifCardPressed,
      ]}
      onPress={() => handleNotifPress(item)}
    >
      <View style={styles.notifIconContainer}>
        <View
          style={[
            styles.notifIcon,
            { backgroundColor: item.isRead ? C.surfaceSecondary : C.isDark ? "#1e3a8a33" : "#EEF2FF" },
          ]}
        >
          {item.title.includes("استلام") || item.title.includes("تأكيد")
            ? <CheckCircle size={22} color={item.isRead ? C.textMuted : C.tint} />
            : <BellRing size={22} color={item.isRead ? C.textMuted : C.tint} />}
        </View>
        {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: C.tint, borderColor: C.surface }]} />}
      </View>
      <View style={styles.notifContent}>
        <View style={styles.notifHeader}>
          <Text style={[
            styles.notifTitle,
            { color: item.isRead ? C.textSecondary : C.text },
            !item.isRead && { fontFamily: "Inter_700Bold" },
          ]}>
            {item.title}
          </Text>
          <Text style={[styles.notifTime, { color: C.textMuted }]}>{timeAgo(item.createdAt)}</Text>
        </View>
        <Text style={[styles.notifBody, { color: C.textSecondary }]} numberOfLines={4}>
          {item.body}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16), backgroundColor: C.background },
        ]}
      >
        <Text style={[styles.headerTitle, { color: C.text }]}>الإشعارات</Text>
        {unreadCount > 0 && (
          <Pressable
            onPress={markAllRead}
            style={[styles.markAllBtn, { backgroundColor: C.isDark ? "#1e3a8a33" : "#EEF2FF" }]}
          >
            <CheckSquare size={16} color={C.tint} />
            <Text style={[styles.markAllText, { color: C.tint }]}>قراءة الكل</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
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
        scrollEnabled={notifications.length > 0}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <BellOff size={56} color={C.textMuted} />
            <Text style={[styles.emptyTitle, { color: C.textSecondary }]}>لا توجد إشعارات</Text>
            <Text style={[styles.emptySubtitle, { color: C.textMuted }]}>ستظهر الإشعارات هنا</Text>
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
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
  },
  markAllText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  notifCard: {
    borderRadius: 16, padding: 16, flexDirection: "row", gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  notifCardPressed: { opacity: 0.85 },
  notifIconContainer: { position: "relative" },
  notifIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: "center", alignItems: "center" },
  unreadDot: {
    position: "absolute", top: 0, right: 0,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2,
  },
  notifContent: { flex: 1, gap: 6 },
  notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  notifTitle: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  notifTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  notifBody: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  separator: { height: 10 },
  emptyState: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
