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

interface Props { onFinish: () => void; }

export default function AnimatedSplash({ onFinish }: Props) {
  // Animation values
  const bgScale     = useRef(new Animated.Value(1.08)).current;
  const logoOp      = useRef(new Animated.Value(0)).current;
  const logoY       = useRef(new Animated.Value(24)).current;
  const glowOp      = useRef(new Animated.Value(0)).current;
  const glowScale   = useRef(new Animated.Value(0.6)).current;
  const lineScaleX  = useRef(new Animated.Value(0)).current;
  const tagOp       = useRef(new Animated.Value(0)).current;
  const tagY        = useRef(new Animated.Value(10)).current;
  const welcomeOp   = useRef(new Animated.Value(0)).current;
  const welcomeSc   = useRef(new Animated.Value(0.82)).current;
  const dotOp       = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  const screenOp    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Dots pulse loop (start after they appear)
    const pulseDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.25, duration: 400, useNativeDriver: true }),
        ])
      );

    Animated.sequence([
      // 1. BG zooms in subtly
      Animated.parallel([
        Animated.timing(bgScale, {
          toValue: 1, duration: 900,
          useNativeDriver: true, easing: Easing.out(Easing.cubic),
        }),
      ]),

      // 2. Glow + Logo rise together
      Animated.parallel([
        Animated.timing(glowOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(glowScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(logoY, {
          toValue: 0, duration: 700,
          useNativeDriver: true, easing: Easing.out(Easing.cubic),
        }),
      ]),

      // 3. Gold line expands
      Animated.timing(lineScaleX, {
        toValue: 1, duration: 600,
        useNativeDriver: true, easing: Easing.out(Easing.quad),
      }),

      // 4. Tagline rises
      Animated.parallel([
        Animated.timing(tagOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(tagY, {
          toValue: 0, duration: 500,
          useNativeDriver: true, easing: Easing.out(Easing.quad),
        }),
      ]),

      // 5. Welcome text appears
      Animated.parallel([
        Animated.timing(welcomeOp, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.spring(welcomeSc, { toValue: 1, friction: 5, tension: 50, useNativeDriver: true }),
      ]),

      // 6. Dots appear
      Animated.stagger(120, dotOp.map(d =>
        Animated.timing(d, { toValue: 0.35, duration: 250, useNativeDriver: true })
      )),

      // 7. Hold
      Animated.delay(1200),

      // 8. Screen fades out
      Animated.timing(screenOp, { toValue: 0, duration: 550, useNativeDriver: true }),
    ]).start(() => onFinish());

    // Start dot pulsing after they fade in
    setTimeout(() => {
      pulseDot(dotOp[0], 0).start();
      pulseDot(dotOp[1], 180).start();
      pulseDot(dotOp[2], 360).start();
    }, 3100);
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenOp }]}>
      {/* Background */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ scale: bgScale }] }]}>
        <LinearGradient
          colors={["#060E24", "#0D1E4A", "#1A3A7A", "#1A56DB"]}
          locations={[0, 0.35, 0.68, 1]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      {/* Subtle top shine */}
      <View style={styles.topShine} />

      {/* Center content */}
      <View style={styles.center}>

        {/* Glow behind logo */}
        <Animated.View style={[styles.glow, {
          opacity: glowOp,
          transform: [{ scale: glowScale }],
        }]} />

        {/* Logo */}
        <Animated.View style={{
          opacity: logoOp,
          transform: [{ translateY: logoY }],
        }}>
          <Image
            source={require("../assets/images/logo-dark.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Gold divider line */}
        <View style={styles.lineWrap}>
          <Animated.View style={[styles.line, {
            transform: [{ scaleX: lineScaleX }],
          }]} />
        </View>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, {
          opacity: tagOp,
          transform: [{ translateY: tagY }],
        }]}>
          خدمات الشحن والتسوق الإلكتروني
        </Animated.Text>

        {/* Welcome message */}
        <Animated.View style={[styles.welcomeBox, {
          opacity: welcomeOp,
          transform: [{ scale: welcomeSc }],
        }]}>
          <Text style={styles.welcomeText}>نورت البرنامج يادكتور</Text>
        </Animated.View>
      </View>

      {/* Bottom loading dots */}
      <View style={styles.dotsWrap}>
        {dotOp.map((op, i) => (
          <Animated.View key={i} style={[
            styles.dot,
            i === 1 && styles.dotCenter,
            { opacity: op },
          ]} />
        ))}
      </View>

      {/* Bottom brand text */}
      <Text style={styles.brand}>MENA EXPRESS</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, width: W, height: H,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#060E24",
  },
  topShine: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: H * 0.35,
    backgroundColor: "rgba(255,255,255,0.025)",
    borderBottomLeftRadius: W,
    borderBottomRightRadius: W,
  },
  center: {
    alignItems: "center",
    gap: 0,
  },
  glow: {
    position: "absolute",
    width: W * 0.85,
    height: 140,
    borderRadius: 100,
    backgroundColor: "#1A56DB",
    opacity: 0,
    shadowColor: "#3B7FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 55,
    elevation: 30,
  },
  logo: {
    width: W * 0.68,
    height: 90,
  },
  lineWrap: {
    width: W * 0.42,
    height: 2.5,
    marginTop: 22,
    overflow: "hidden",
  },
  line: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D4A017",
    borderRadius: 2,
    shadowColor: "#D4A017",
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  tagline: {
    marginTop: 16,
    fontSize: 13.5,
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  welcomeBox: {
    marginTop: 26,
    paddingHorizontal: 30,
    paddingVertical: 13,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(212,160,23,0.4)",
  },
  welcomeText: {
    fontSize: 21,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(212,160,23,0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  dotsWrap: {
    position: "absolute",
    bottom: H * 0.13,
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: "#D4A017",
  },
  dotCenter: {
    width: 8, height: 8,
    borderRadius: 4,
    marginHorizontal: 10,
    backgroundColor: "#F5C842",
  },
  brand: {
    position: "absolute",
    bottom: H * 0.07,
    fontSize: 10,
    color: "rgba(255,255,255,0.25)",
    fontFamily: "Inter_500Medium",
    letterSpacing: 4,
  },
});
