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

import { translations, type LangCode, type TranslationKey } from "@/constants/translations";

const STORAGE_KEY = "@mena_language";

interface LanguageCtxValue {
  lang: LangCode;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
  isRTL: boolean;
}

const LanguageCtx = createContext<LanguageCtxValue>({
  lang: "ar",
  t: (key) => translations.ar[key] as string,
  toggleLang: () => {},
  isRTL: true,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>("ar");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "ar" || v === "en") setLang(v);
    });
  }, []);

  const toggleLang = useCallback(async () => {
    const next: LangCode = lang === "ar" ? "en" : "ar";
    setLang(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, [lang]);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] as string,
    [lang]
  );

  const value = useMemo(
    () => ({ lang, t, toggleLang, isRTL: lang === "ar" }),
    [lang, t, toggleLang]
  );

  return <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>;
}

export function useLanguage() {
  return useContext(LanguageCtx);
}
