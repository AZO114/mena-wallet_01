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

interface Props {
  name: string;
  userId: string;
  onFinish: () => void;
}

function getWelcomeMessage(userId: string, name: string): { line1: string; line2: string } {
  if (userId === "muataz") {
    return { line1: "نورت البرنامج", line2: "يابش مهندس" };
  }
  const firstName = name.split(" ")[0];
  return { line1: "نورت البرنامج", line2: `يادكتور ${firstName}` };
}

export default function WelcomeOverlay({ name, userId, onFinish }: Props) {
  const bgOp     = useRef(new Animated.Value(0)).current;
  const logoOp   = useRef(new Animated.Value(0)).current;
  const logoY    = useRef(new Animated.Value(-20)).current;
  const line1Op  = useRef(new Animated.Value(0)).current;
  const line1Y   = useRef(new Animated.Value(16)).current;
  const line2Op  = useRef(new Animated.Value(0)).current;
  const line2Sc  = useRef(new Animated.Value(0.75)).current;
  const glowOp   = useRef(new Animated.Value(0)).current;
  const screenOp = useRef(new Animated.Value(1)).current;

  const { line1, line2 } = getWelcomeMessage(userId, name);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(bgOp,   { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(glowOp, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(logoY,  { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(line1Op, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(line1Y,  { toValue: 0, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(line2Op,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(line2Sc,  { toValue: 1, friction: 5, tension: 55, useNativeDriver: true }),
      ]),
      Animated.delay(2000),
      Animated.timing(screenOp, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, styles.root, { opacity: screenOp }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: bgOp }]}>
        <LinearGradient
          colors={["#060E24", "#0D1E4A", "#1A3A7A", "#1A56DB"]}
          locations={[0, 0.35, 0.68, 1]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </Animated.View>

      <Animated.View style={[styles.glow, { opacity: glowOp }]} />

      <View style={styles.center}>
        <Animated.View style={{ opacity: logoOp, transform: [{ translateY: logoY }] }}>
          <Image
            source={require("../assets/images/logo-dark.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.dividerWrap}>
          <View style={styles.divider} />
        </View>

        <Animated.Text style={[styles.line1, { opacity: line1Op, transform: [{ translateY: line1Y }] }]}>
          {line1}
        </Animated.Text>

        <Animated.Text style={[styles.line2, { opacity: line2Op, transform: [{ scale: line2Sc }] }]}>
          {line2}
        </Animated.Text>
      </View>

      <Text style={styles.brand}>MENA EXPRESS</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 9999,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#060E24",
  },
  glow: {
    position: "absolute",
    width: W * 0.9,
    height: 200,
    borderRadius: 120,
    backgroundColor: "#1A56DB",
    shadowColor: "#3B7FFF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 70,
    elevation: 40,
    top: "40%",
  },
  center: {
    alignItems: "center",
    gap: 0,
  },
  logo: {
    width: W * 0.62,
    height: 80,
  },
  dividerWrap: {
    marginTop: 24,
    marginBottom: 24,
    alignItems: "center",
  },
  divider: {
    width: 70,
    height: 2.5,
    backgroundColor: "#D4A017",
    borderRadius: 2,
    shadowColor: "#D4A017",
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  line1: {
    fontSize: 18,
    color: "rgba(255,255,255,0.75)",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 8,
  },
  line2: {
    fontSize: 36,
    color: "#fff",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: 0.5,
    textShadowColor: "rgba(26,86,219,0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
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
