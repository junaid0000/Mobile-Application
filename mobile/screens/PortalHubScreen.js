import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Platform,
  ScrollView,
} from "react-native";

function AnimatedOrb({ color, size, top, left, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 4000 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 4000 + delay, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.15, 0.3, 0.15] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }],
      }}
    />
  );
}

function ActionHubButton({
  emoji,
  title,
  themeColor,
  glowColor,
  borderColor,
  onPress,
  delay,
  isWide,
}) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, delay, useNativeDriver: true, tension: 65, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 450, delay, useNativeDriver: true }),
    ]).start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [delay, scaleAnim, opacityAnim, glowAnim]);

  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, speed: 45 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 35 }).start();

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.28] });

  return (
    <Animated.View
      style={[
        styles.actionCardOuter,
        isWide && styles.actionCardOuterWide,
        { transform: [{ scale: scaleAnim }], opacity: opacityAnim, borderColor },
      ]}
    >
      <Animated.View style={[styles.cardGlow, { backgroundColor: glowColor, opacity: glowOpacity }]} />
      
      <TouchableOpacity
        style={styles.actionCardTouchable}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.88}
      >
        {/* Glowing Top Accent Bar */}
        <View style={[styles.topBarStrip, { backgroundColor: themeColor }]} />

        {/* Big Icon Shield */}
        <View style={[styles.iconShield, { backgroundColor: themeColor + "18", borderColor: themeColor + "55" }]}>
          <Text style={styles.iconShieldEmoji}>{emoji}</Text>
        </View>

        {/* Clean, Bold Title Only */}
        <Text style={[styles.actionTitle, { color: "#FFFFFF" }]}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function PortalHubScreen({ navigation, route }) {
  const { user, token } = route.params || {};
  const isAdmin = user?.role === "admin";
  const { width: SW, height: SH } = useWindowDimensions();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.spring(headerTranslate, { toValue: 0, useNativeDriver: true, tension: 75, friction: 9 }),
    ]).start();
  }, [headerAnim, headerTranslate]);

  const isWide = SW > 720;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060D1A" />
      <AnimatedOrb color="#0284C7" size={280} top={-60} left={-60} delay={0} />
      <AnimatedOrb color="#00E5FF" size={220} top={SH * 0.35} left={SW - 130} delay={600} />
      <AnimatedOrb color="#9333EA" size={200} top={SH * 0.65} left={-30} delay={1200} />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backIcon}>{"\u2039"}</Text>
          <Text style={styles.backText}>Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.topBarCenter}>
          <View style={styles.topBarLogo}><Text style={styles.topBarLogoText}>R</Text></View>
          <Text style={styles.topBarBrand}>ROSSOMANDI</Text>
        </View>

        <View style={styles.userPill}>
          <View style={[styles.userDot, { backgroundColor: isAdmin ? "#F59E0B" : (user?.role === "external" ? "#A855F7" : "#00E5FF") }]} />
          <Text style={styles.userPillText}>{isAdmin ? "Admin" : (user?.role === "external" ? "Esterno" : "Venditore")}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerBlock, { opacity: headerAnim, transform: [{ translateY: headerTranslate }] }]}>
          <View style={styles.headerPill}>
            <Text style={styles.headerPillText}>PORTALE GESTIONE</Text>
          </View>
          <Text style={[styles.headerTitle, { fontSize: SW > 500 ? 32 : 26 }]}>
            Scegli la sezione
          </Text>
        </Animated.View>

        {/* 2 Clean, Attractive, Bold Buttons */}
        <View style={[styles.cardsRow, isWide && styles.cardsRowWide]}>
          <ActionHubButton
            isWide={isWide}
            delay={100}
            emoji="📋"
            title="Preventivi Esterni"
            themeColor="#00E5FF"
            glowColor="#00E5FF"
            borderColor="#00E5FF66"
            onPress={() => navigation.navigate("PortalList", { user, token })}
          />

          <ActionHubButton
            isWide={isWide}
            delay={240}
            emoji="🚗"
            title="Vista Vetrina"
            themeColor="#A855F7"
            glowColor="#A855F7"
            borderColor="#A855F766"
            onPress={() => navigation.navigate("PortalShowcase", { user, token })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060D1A",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#0F1E35",
    backgroundColor: "#070F1F",
    zIndex: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13223B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E365D",
  },
  backIcon: {
    color: "#00E5FF",
    fontSize: 20,
    fontWeight: "800",
    marginRight: 6,
    marginTop: -2,
  },
  backText: {
    color: "#00E5FF",
    fontSize: 13,
    fontWeight: "700",
  },
  topBarCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topBarLogo: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  topBarLogoText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
  topBarBrand: {
    color: "#E2EAF7",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 2,
  },
  userPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#0F1E35",
    borderWidth: 1,
    borderColor: "#1B2D4A",
  },
  userDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  userPillText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 40,
    flexGrow: 1,
  },
  headerBlock: {
    alignItems: "center",
    marginBottom: 36,
    maxWidth: 580,
    width: "100%",
  },
  headerPill: {
    backgroundColor: "#0F1E35",
    borderWidth: 1,
    borderColor: "#1E3A5F",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 12,
  },
  headerPillText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: "#F8FAFC",
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  cardsRow: {
    width: "100%",
    maxWidth: 720,
    flexDirection: "column",
    gap: 22,
  },
  cardsRowWide: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  actionCardOuter: {
    borderRadius: 24,
    borderWidth: 1.5,
    backgroundColor: "#0B1628",
    overflow: "hidden",
    position: "relative",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    ...(Platform.OS === "web" ? { boxShadow: "0 10px 40px rgba(0,0,0,0.55)" } : {}),
  },
  actionCardOuterWide: {
    flex: 1,
  },
  cardGlow: {
    position: "absolute",
    top: -50,
    left: "50%",
    marginLeft: -110,
    width: 220,
    height: 220,
    borderRadius: 110,
    zIndex: 0,
  },
  actionCardTouchable: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  topBarStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  iconShield: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  iconShieldEmoji: {
    fontSize: 40,
  },
  actionTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
    textAlign: "center",
  },
});
