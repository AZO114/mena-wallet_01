import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Defs, Line, LinearGradient as SvgGrad, Rect, Stop } from "react-native-svg";

const { width: W, height: H } = Dimensions.get("window");
const CX = W / 2;
const CY = H / 2;

interface Props { onFinish: () => void; }

/* ── tiny random particles ── */
const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * W,
  y: Math.random() * H,
  size: Math.random() * 2.5 + 1,
  delay: Math.random() * 1200,
  duration: Math.random() * 1800 + 1400,
}));

/* ── hex labels that float in ── */
const HEX_LABELS = ["0x4D454E41", "AES-256", "v2.1.0", "TX_SECURE", "0xFF3A9B"];

function Particle({ x, y, size, delay, duration }: typeof PARTICLES[0]) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(op, { toValue: 0.7, duration: duration * 0.4, useNativeDriver: true }),
          Animated.timing(ty, { toValue: -18, duration, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ]),
        Animated.parallel([
          Animated.timing(op, { toValue: 0, duration: duration * 0.4, useNativeDriver: true }),
          Animated.timing(ty, { toValue: 0, duration: duration * 0.4, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View style={{
      position: "absolute", left: x, top: y, width: size, height: size,
      borderRadius: size, backgroundColor: "#60A5FA",
      opacity: op, transform: [{ translateY: ty }],
    }} />
  );
}

function HexLabel({ label, index }: { label: string; index: number }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(1600 + index * 220),
      Animated.timing(op, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);
  const angle = (index / HEX_LABELS.length) * Math.PI * 2;
  const r = W * 0.38;
  const lx = CX + r * Math.cos(angle) - 36;
  const ly = CY + r * Math.sin(angle) - 8;
  return (
    <Animated.Text style={[styles.hexLabel, { left: lx, top: ly, opacity: op }]}>
      {label}
    </Animated.Text>
  );
}

export default function AnimatedSplash({ onFinish }: Props) {
  const screenOp   = useRef(new Animated.Value(1)).current;
  const gridOp     = useRef(new Animated.Value(0)).current;
  const r1         = useRef(new Animated.Value(0)).current;
  const r1op       = useRef(new Animated.Value(0)).current;
  const r2         = useRef(new Animated.Value(0)).current;
  const r2op       = useRef(new Animated.Value(0)).current;
  const r3         = useRef(new Animated.Value(0)).current;
  const r3op       = useRef(new Animated.Value(0)).current;
  const radarRot   = useRef(new Animated.Value(0)).current;
  const radarOp    = useRef(new Animated.Value(0)).current;
  const logoOp     = useRef(new Animated.Value(0)).current;
  const logoScale  = useRef(new Animated.Value(0.85)).current;
  const scanY      = useRef(new Animated.Value(-55)).current;
  const scanOp     = useRef(new Animated.Value(0)).current;
  const barWidth   = useRef(new Animated.Value(0)).current;
  const initOp     = useRef(new Animated.Value(0)).current;
  const readyOp    = useRef(new Animated.Value(0)).current;
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const ring = (anim: Animated.Value, opAnim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(anim, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
            Animated.sequence([
              Animated.timing(opAnim, { toValue: 0.55, duration: 400, useNativeDriver: true }),
              Animated.timing(opAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
            ]),
          ]),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const radarSpin = Animated.loop(
      Animated.timing(radarRot, { toValue: 1, duration: 3000, useNativeDriver: true, easing: Easing.linear })
    );

    const counter = setInterval(() => setProgress(p => { if (p >= 100) { clearInterval(counter); return 100; } return p + 2; }), 40);

    Animated.sequence([
      Animated.timing(gridOp, { toValue: 1, duration: 600, useNativeDriver: true }),

      Animated.parallel([
        ring(r1, r1op, 0),
        ring(r2, r2op, 700),
        ring(r3, r3op, 1400),
        Animated.sequence([
          Animated.timing(radarOp, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
      ]),

      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
        Animated.timing(logoOp, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(scanOp, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(scanY, { toValue: 55, duration: 700, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
          Animated.timing(scanOp, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
      ]),

      Animated.timing(initOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(barWidth, { toValue: 1, duration: 1800, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),

      Animated.sequence([
        Animated.timing(initOp, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(readyOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),

      Animated.delay(700),
      Animated.timing(screenOp, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => onFinish());

    radarSpin.start();
    ring(r1, r1op, 0).start();
    ring(r2, r2op, 700).start();
    ring(r3, r3op, 1400).start();

    return () => { radarSpin.stop(); clearInterval(counter); };
  }, []);

  const radarRotDeg = radarRot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const RING_MAX = W * 0.88;

  return (
    <Animated.View style={[styles.screen, { opacity: screenOp }]}>
      {/* Background */}
      <LinearGradient colors={["#020817", "#060F2E", "#040D24"]} style={StyleSheet.absoluteFillObject} />

      {/* SVG Grid */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: gridOp }]}>
        <Svg width={W} height={H}>
          <Defs>
            <SvgGrad id="vg" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#1E3A8A" stopOpacity="0.08" />
              <Stop offset="0.5" stopColor="#3B82F6" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#1E3A8A" stopOpacity="0.08" />
            </SvgGrad>
          </Defs>
          {/* Vertical lines */}
          {Array.from({ length: 12 }, (_, i) => (
            <Line key={`v${i}`} x1={(W / 11) * i} y1={0} x2={(W / 11) * i} y2={H}
              stroke="#1E40AF" strokeWidth="0.4" strokeOpacity="0.35" />
          ))}
          {/* Horizontal lines */}
          {Array.from({ length: 22 }, (_, i) => (
            <Line key={`h${i}`} x1={0} y1={(H / 21) * i} x2={W} y2={(H / 21) * i}
              stroke="#1E40AF" strokeWidth="0.4" strokeOpacity="0.35" />
          ))}
          {/* Center crosshair */}
          <Line x1={CX} y1={CY - 22} x2={CX} y2={CY + 22} stroke="#60A5FA" strokeWidth="0.8" strokeOpacity="0.5" />
          <Line x1={CX - 22} y1={CY} x2={CX + 22} y2={CY} stroke="#60A5FA" strokeWidth="0.8" strokeOpacity="0.5" />
          {/* Corner brackets */}
          <Rect x={18} y={18} width={28} height={28} fill="none" stroke="#3B82F6" strokeWidth="1.2" strokeOpacity="0.5" rx={2} />
          <Rect x={W - 46} y={18} width={28} height={28} fill="none" stroke="#3B82F6" strokeWidth="1.2" strokeOpacity="0.5" rx={2} />
          <Rect x={18} y={H - 46} width={28} height={28} fill="none" stroke="#3B82F6" strokeWidth="1.2" strokeOpacity="0.5" rx={2} />
          <Rect x={W - 46} y={H - 46} width={28} height={28} fill="none" stroke="#3B82F6" strokeWidth="1.2" strokeOpacity="0.5" rx={2} />
        </Svg>
      </Animated.View>

      {/* Particles */}
      {PARTICLES.map(p => <Particle key={p.id} {...p} />)}

      {/* Hex labels */}
      {HEX_LABELS.map((l, i) => <HexLabel key={l} label={l} index={i} />)}

      {/* Pulsing rings */}
      {[{ anim: r1, op: r1op }, { anim: r2, op: r2op }, { anim: r3, op: r3op }].map(({ anim, op }, i) => (
        <Animated.View key={i} style={[styles.ring, {
          opacity: op,
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
          width: RING_MAX, height: RING_MAX, borderRadius: RING_MAX / 2,
          marginLeft: -RING_MAX / 2, marginTop: -RING_MAX / 2,
        }]} />
      ))}

      {/* Radar sweep */}
      <Animated.View style={[styles.radarWrap, { opacity: radarOp, transform: [{ rotate: radarRotDeg }] }]}>
        <Svg width={W * 0.72} height={W * 0.72} viewBox={`0 0 100 100`}>
          <Defs>
            <SvgGrad id="sweep" x1="0.5" y1="0.5" x2="1" y2="0.5">
              <Stop offset="0" stopColor="#3B82F6" stopOpacity="0.5" />
              <Stop offset="1" stopColor="#3B82F6" stopOpacity="0" />
            </SvgGrad>
          </Defs>
          <Circle cx="50" cy="50" r="49" stroke="#1E40AF" strokeWidth="0.3" fill="none" strokeOpacity="0.3" />
          <Circle cx="50" cy="50" r="33" stroke="#1E40AF" strokeWidth="0.3" fill="none" strokeOpacity="0.25" />
          <Line x1="50" y1="50" x2="99" y2="50" stroke="url(#sweep)" strokeWidth="1" />
        </Svg>
      </Animated.View>

      {/* Logo */}
      <Animated.View style={[styles.logoWrap, { opacity: logoOp, transform: [{ scale: logoScale }] }]}>
        <Image
          source={require("../assets/images/logo-dark.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        {/* Scan line */}
        <Animated.View style={[styles.scanLine, { opacity: scanOp, transform: [{ translateY: scanY }] }]} />
      </Animated.View>

      {/* Bottom HUD */}
      <View style={styles.hud}>
        <Animated.Text style={[styles.initText, { opacity: initOp }]}>
          INITIALIZING SYSTEM...
        </Animated.Text>
        <Animated.Text style={[styles.readyText, { opacity: readyOp }]}>
          ✦  SYSTEM READY  ✦
        </Animated.Text>

        {/* Progress bar */}
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, {
            transform: [{ scaleX: barWidth }],
          }]} />
        </View>

        <Text style={styles.percentText}>{progress}%</Text>

        <Text style={styles.tagline}>محفظة مينا السريعة</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1, width: W, height: H,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "#020817",
  },
  ring: {
    position: "absolute",
    top: "50%", left: "50%",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  radarWrap: {
    position: "absolute",
    width: W * 0.72, height: W * 0.72,
    justifyContent: "center", alignItems: "center",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 6,
  },
  logo: {
    width: W * 0.62,
    height: 88,
    tintColor: undefined,
  },
  scanLine: {
    position: "absolute",
    width: "120%",
    height: 2,
    backgroundColor: "#60A5FA",
    opacity: 0.85,
    shadowColor: "#60A5FA",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  hud: {
    position: "absolute",
    bottom: H * 0.1,
    left: 0, right: 0,
    alignItems: "center",
    gap: 8,
  },
  initText: {
    fontSize: 10,
    color: "#60A5FA",
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 3,
  },
  readyText: {
    fontSize: 11,
    color: "#34D399",
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  barTrack: {
    width: W * 0.55,
    height: 2,
    backgroundColor: "#1E3A5F",
    borderRadius: 2,
    overflow: "hidden",
    marginTop: 4,
  },
  barFill: {
    height: "100%",
    width: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 2,
    transformOrigin: "left",
  },
  percentText: {
    fontSize: 9,
    color: "#475569",
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    marginTop: 2,
  },
  tagline: {
    fontSize: 12,
    color: "#334155",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1.5,
    marginTop: 8,
  },
  hexLabel: {
    position: "absolute",
    fontSize: 8,
    color: "#1E40AF",
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
});
