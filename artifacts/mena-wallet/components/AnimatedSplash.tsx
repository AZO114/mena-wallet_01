import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: W, height: H } = Dimensions.get("window");

interface AnimatedSplashProps {
  onFinish: () => void;
}

export default function AnimatedSplash({ onFinish }: AnimatedSplashProps) {
  const bgOpacity    = useRef(new Animated.Value(0)).current;
  const ring1Scale   = useRef(new Animated.Value(0.4)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale   = useRef(new Animated.Value(0.3)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const logoScale    = useRef(new Animated.Value(0.4)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const lineWidth    = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textY        = useRef(new Animated.Value(20)).current;
  const subOpacity   = useRef(new Animated.Value(0)).current;
  const dot1Opacity  = useRef(new Animated.Value(0)).current;
  const dot2Opacity  = useRef(new Animated.Value(0)).current;
  const dot3Opacity  = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = (anim: Animated.Value, toValue: number, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue, duration, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(anim, { toValue: 1, duration, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      );

    Animated.sequence([
      // 1. Background fade in
      Animated.timing(bgOpacity, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),

      // 2. Rings expand
      Animated.parallel([
        Animated.timing(ring1Scale, { toValue: 1, duration: 700, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(ring1Opacity, { toValue: 0.18, duration: 700, useNativeDriver: true }),
        Animated.timing(ring2Scale, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(ring2Opacity, { toValue: 0.1, duration: 900, useNativeDriver: true }),
      ]),

      // 3. Logo springs in
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1, friction: 5, tension: 60, useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),

      // 4. Line expands under logo
      Animated.timing(lineWidth, {
        toValue: 1, duration: 500, useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),

      // 5. Text slides up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textY, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      ]),

      // 6. Subtitle fades in
      Animated.timing(subOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),

      // 7. Dots appear one by one
      Animated.stagger(150, [
        Animated.timing(dot1Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot2Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(dot3Opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),

      // 8. Hold
      Animated.delay(900),

      // 9. Fade out entire screen
      Animated.timing(screenOpacity, {
        toValue: 0, duration: 500, useNativeDriver: true,
      }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.screen, { opacity: screenOpacity }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={["#0A0F2E", "#0D1B4B", "#0A2458", "#061430"]}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Decorative rings */}
      <Animated.View style={[styles.ring, styles.ring1, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
      <Animated.View style={[styles.ring, styles.ring2, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />

      {/* Glow blob behind logo */}
      <View style={styles.glowWrap}>
        <View style={styles.glow} />
      </View>

      {/* Logo */}
      <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Divider line */}
      <Animated.View style={[styles.lineWrap]}>
        <Animated.View style={[styles.line, { transform: [{ scaleX: lineWidth }] }]} />
      </Animated.View>

      {/* Arabic/English tagline */}
      <Animated.Text style={[styles.tagline, { opacity: textOpacity, transform: [{ translateY: textY }] }]}>
        محفظتك المالية الذكية
      </Animated.Text>

      <Animated.Text style={[styles.sub, { opacity: subOpacity }]}>
        MENA Express Financial
      </Animated.Text>

      {/* Loading dots */}
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
        <Animated.View style={[styles.dot, styles.dotMid, { opacity: dot2Opacity }]} />
        <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
      </View>
    </Animated.View>
  );
}

const RING = W * 1.5;
const styles = StyleSheet.create({
  screen: {
    flex: 1, width: W, height: H,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#0A0F2E",
  },
  ring: {
    position: "absolute", borderRadius: RING / 2,
    borderWidth: 1.5,
  },
  ring1: {
    width: RING, height: RING,
    borderColor: "#4F8EF7",
  },
  ring2: {
    width: RING * 1.25, height: RING * 1.25,
    borderColor: "#3B6FD4",
    borderRadius: (RING * 1.25) / 2,
  },
  glowWrap: {
    position: "absolute",
    justifyContent: "center", alignItems: "center",
  },
  glow: {
    width: 260, height: 120,
    borderRadius: 80,
    backgroundColor: "#1E4FD8",
    opacity: 0.22,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 20,
  },
  logo: {
    width: W * 0.72,
    height: 100,
  },
  lineWrap: {
    width: W * 0.55,
    height: 2,
    marginTop: 22,
    overflow: "hidden",
  },
  line: {
    width: "100%", height: "100%",
    backgroundColor: "#4F8EF7",
    opacity: 0.6,
    borderRadius: 1,
  },
  tagline: {
    marginTop: 18,
    fontSize: 17,
    color: "#CBD5E1",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  sub: {
    marginTop: 6,
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Inter_400Regular",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 52,
    gap: 0,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#4F8EF7",
    opacity: 0,
  },
  dotMid: {
    width: 9, height: 9, borderRadius: 5,
    backgroundColor: "#60A5FA",
    marginHorizontal: 8,
  },
});
