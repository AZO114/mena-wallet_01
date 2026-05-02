import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface User {
  userId: string;
  name: string;
  role: "sender" | "receiver";
  token: string;
}

export interface Transaction {
  id: string;
  senderName: string;
  recipientName: string;
  amount: number;
  paidAmount: number;
  status: "pending" | "received";
  confirmedBy: string | null;
  confirmedByName: string | null;
  confirmedAt: string | null;
  notes: string | null;
  notesAttachment: string | null;
  confirmationNotes: string | null;
  confirmationAttachment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  transactionId: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface FinancialReport {
  totalAmount: number;
  totalPaid: number;
  totalPending: number;
  totalReceived: number;
  pendingCount: number;
  receivedCount: number;
  transactionsByPeriod: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface AppContextValue {
  user: User | null;
  isLoading: boolean;
  login: (pin: string) => Promise<void>;
  logout: () => Promise<void>;
  transactions: Transaction[];
  notifications: Notification[];
  unreadCount: number;
  fetchTransactions: (filters?: TransactionFilters) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  createTransaction: (data: CreateTransactionData) => Promise<Transaction>;
  editTransaction: (id: string, data: EditTransactionData) => Promise<Transaction>;
  confirmTransaction: (id: string, confirmationNotes?: string, confirmationAttachment?: string) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  getFinancialReport: (period: "week" | "month" | "year" | "all") => Promise<FinancialReport>;
  sendAiMessage: (messages: AiMessage[]) => Promise<string>;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

export interface TransactionFilters {
  status?: "pending" | "received" | "all";
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateTransactionData {
  senderName: string;
  amount: number;
  paidAmount: number;
  notes?: string;
  notesAttachment?: string;
}

export interface EditTransactionData {
  senderName?: string;
  amount?: number;
  paidAmount?: number;
  notes?: string;
  notesAttachment?: string;
}

const AppContext = createContext<AppContextValue | null>(null);

async function setupNotifications() {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      await Notifications.requestPermissionsAsync();
    }
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Mena Wallet",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1A56DB",
        sound: "default",
      });
    }
  } catch (e) {
    console.log("Notifications setup skipped:", e);
  }
}

async function showDeviceNotification(title: string, body: string) {
  if (Platform.OS === "web") return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === "android" ? { channelId: "default" } : {}),
      },
      trigger: null,
    });
  } catch (e) {
    console.log("Notification error:", e);
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const prevNotifCountRef = useRef<number>(0);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    loadUser();
    setupNotifications();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem("@mena_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (pin: string) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    const data: User = await res.json();
    await AsyncStorage.setItem("@mena_user", JSON.stringify(data));
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("@mena_user");
    setUser(null);
    setTransactions([]);
    setNotifications([]);
    prevNotifCountRef.current = 0;
    isFirstLoadRef.current = true;
  }, []);

  const fetchTransactions = useCallback(async (filters?: TransactionFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== "all") params.append("status", filters.status);
      if (filters?.search) params.append("search", filters.search);
      if (filters?.minAmount !== undefined) params.append("minAmount", String(filters.minAmount));
      if (filters?.maxAmount !== undefined) params.append("maxAmount", String(filters.maxAmount));
      if (filters?.startDate) params.append("startDate", filters.startDate);
      if (filters?.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`${BASE_URL}/transactions?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTransactions(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchNotifications = useCallback(async (currentUser?: User | null) => {
    const u = currentUser ?? user;
    if (!u) return;
    try {
      const res = await fetch(`${BASE_URL}/notifications?userId=${u.userId}`);
      if (!res.ok) throw new Error("Failed");
      const data: Notification[] = await res.json();

      const newUnread = data.filter((n) => !n.isRead);
      const prevCount = prevNotifCountRef.current;
      const isFirst = isFirstLoadRef.current;

      if (!isFirst && newUnread.length > prevCount) {
        const latestNew = data.find((n) => !n.isRead);
        if (latestNew) {
          await showDeviceNotification(latestNew.title, latestNew.body);
        }
      }

      prevNotifCountRef.current = newUnread.length;
      isFirstLoadRef.current = false;
      setNotifications(data);
    } catch (e) {
      console.error(e);
    }
  }, [user]);

  const createTransaction = useCallback(async (data: CreateTransactionData): Promise<Transaction> => {
    if (!user) throw new Error("Not logged in");
    const res = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, createdByUserId: user.userId }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed");
    }
    const tx: Transaction = await res.json();
    setTransactions((prev) => [tx, ...prev]);
    await fetchNotifications();
    return tx;
  }, [user, fetchNotifications]);

  const editTransaction = useCallback(async (id: string, data: EditTransactionData): Promise<Transaction> => {
    if (!user) throw new Error("Not logged in");
    const res = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed");
    }
    const tx: Transaction = await res.json();
    setTransactions((prev) => prev.map((t) => (t.id === id ? tx : t)));
    return tx;
  }, [user]);

  const deleteTransaction = useCallback(async (id: string) => {
    if (!user) throw new Error("Not logged in");
    const res = await fetch(`${BASE_URL}/transactions/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete");
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    setNotifications((prev) => prev.filter((n) => n.transactionId !== id));
  }, [user]);

  const confirmTransaction = useCallback(async (id: string, confirmationNotes?: string, confirmationAttachment?: string) => {
    if (!user) throw new Error("Not logged in");
    const res = await fetch(`${BASE_URL}/transactions/${id}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confirmedByUserId: user.userId,
        confirmedByName: user.name,
        confirmationNotes,
        confirmationAttachment,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed");
    }
    const updated: Transaction = await res.json();
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
    await fetchNotifications();
  }, [user, fetchNotifications]);

  const markNotificationRead = useCallback(async (id: string) => {
    await fetch(`${BASE_URL}/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await fetch(`${BASE_URL}/notifications/read-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.userId }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, [user]);

  const getFinancialReport = useCallback(async (period: "week" | "month" | "year" | "all"): Promise<FinancialReport> => {
    const res = await fetch(`${BASE_URL}/reports/financial?period=${period}`);
    if (!res.ok) throw new Error("Failed");
    return res.json();
  }, []);

  const sendAiMessage = useCallback(async (messages: AiMessage[]): Promise<string> => {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "AI request failed");
    }
    const data = await res.json();
    return data.message;
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchTransactions(), fetchNotifications()]);
    setRefreshing(false);
  }, [fetchTransactions, fetchNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  useEffect(() => {
    if (user) {
      isFirstLoadRef.current = true;
      fetchTransactions();
      fetchNotifications(user);
      const interval = setInterval(() => {
        fetchTransactions();
        fetchNotifications();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [user, fetchTransactions, fetchNotifications]);

  const value = useMemo(
    () => ({
      user, isLoading, login, logout, transactions, notifications, unreadCount,
      fetchTransactions, fetchNotifications, createTransaction, editTransaction,
      confirmTransaction, deleteTransaction, markNotificationRead, markAllRead,
      getFinancialReport, sendAiMessage, refreshing, refresh,
    }),
    [
      user, isLoading, login, logout, transactions, notifications, unreadCount,
      fetchTransactions, fetchNotifications, createTransaction, editTransaction,
      confirmTransaction, deleteTransaction, markNotificationRead, markAllRead,
      getFinancialReport, sendAiMessage, refreshing, refresh,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
