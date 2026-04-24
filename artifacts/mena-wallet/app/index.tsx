import { Eye, EyeOff, ShieldCheck } from "lucide-react-native";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useTheme } from "@/context/ThemeContext";

export default function LoginScreen() {
  const { user, isLoading, login } = useApp();
  const C = useTheme();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const insets = useSafeAreaInsets();
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user && !isLoading) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.tint} />
      </View>
    );
  }

  if (user) return null;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    if (!pin.trim()) {
      setError("أدخل الرمز السري");
      shake();
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(pin.trim());
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "رمز خاطئ");
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: C.background, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <View style={styles.logoContainer}>
          {C.isDark ? (
            <Image
              source={require("@/assets/images/logo-dark.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <Image
              source={require("@/assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          )}
          <Text style={[styles.tagline, { color: C.textSecondary }]}>خدمات الشحن والتسوق الإلكتروني</Text>
        </View>

        <View style={[styles.card, { backgroundColor: C.surface }]}>
          <View style={[styles.lockIcon, { backgroundColor: C.isDark ? "#1E3A8A22" : "#EEF2FF" }]}>
            <ShieldCheck size={32} color={C.tint} />
          </View>
          <Text style={[styles.cardTitle, { color: C.text }]}>تسجيل الدخول</Text>
          <Text style={[styles.cardSubtitle, { color: C.textSecondary }]}>أدخل رمزك السري الخاص</Text>

          <Animated.View
            style={[
              styles.inputContainer,
              { borderColor: error ? C.danger : C.border, backgroundColor: C.surfaceSecondary },
              { transform: [{ translateX: shakeAnim }] },
            ]}
          >
            <TextInput
              style={[styles.input, { color: C.text }]}
              value={pin}
              onChangeText={(t) => { setPin(t); setError(""); }}
              placeholder="الرمز السري"
              placeholderTextColor={C.textMuted}
              secureTextEntry={!showPin}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              textAlign="center"
            />
            <Pressable onPress={() => setShowPin((s) => !s)} style={styles.eyeBtn}>
              {showPin
                ? <EyeOff size={20} color={C.textSecondary} />
                : <Eye size={20} color={C.textSecondary} />}
            </Pressable>
          </Animated.View>

          {error ? <Text style={[styles.errorText, { color: C.danger }]}>{error}</Text> : null}

          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: C.tint },
              pressed && styles.loginBtnPressed,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>دخول</Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: C.textMuted }]}>
          © 2025 Mena Wallet · تم تطويره بواسطة المهندس معتز الورفلي
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, justifyContent: "center" },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 32 },
  logoContainer: { alignItems: "center", gap: 8 },
  logoImage: { width: 220, height: 100, borderRadius: 0 },
  tagline: { fontSize: 13, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 24, padding: 28, alignItems: "center", gap: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  lockIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  cardTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  inputContainer: {
    flexDirection: "row", alignItems: "center", width: "100%",
    borderWidth: 1.5, borderRadius: 14, overflow: "hidden",
  },
  input: {
    flex: 1, paddingHorizontal: 20, paddingVertical: 16,
    fontSize: 18, fontFamily: "Inter_600SemiBold", letterSpacing: 3, textAlign: "center",
  },
  eyeBtn: { paddingHorizontal: 16, paddingVertical: 16 },
  errorText: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  loginBtn: { width: "100%", borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  loginBtnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  loginBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 1 },
  footer: { textAlign: "center", fontSize: 12, fontFamily: "Inter_400Regular" },
});
