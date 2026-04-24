import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import Colors from "@/constants/colors";

export type ThemeColors = typeof Colors.light;
type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "@mena_theme_mode";

interface ThemeCtxValue {
  C: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeCtx = createContext<ThemeCtxValue>({
  C: Colors.light,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "light" || v === "dark") setMode(v);
    });
  }, []);

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = isDark ? "light" : "dark";
    setMode(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, [isDark]);

  const value = useMemo(() => ({ C, isDark, toggleTheme }), [C, isDark, toggleTheme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeColors {
  return useContext(ThemeCtx).C;
}

export function useThemeToggle() {
  const { isDark, toggleTheme } = useContext(ThemeCtx);
  return { isDark, toggleTheme };
}
