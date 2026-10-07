import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Image,
  Animated,
  Platform,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";
import { BASE_URL } from "../config/apiConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Professional Brand Fallback Images ──
const BRAND_IMAGES = {
  OPEL:       "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
  FIAT:       "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
  KIA:        "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
  TOYOTA:     "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80",
  TOYOTA1:    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80",
  BYD:        "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80",
  DEFAULT:    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
};

function getCarImage(item) {
  if (item?.image_url) {
    if (item.image_url.startsWith("http")) return item.image_url;
    return `${BASE_URL}${item.image_url.startsWith("/") ? "" : "/"}${item.image_url}`;
  }
  const brand = (item?.marca || "").toUpperCase().trim();
  return BRAND_IMAGES[brand] || BRAND_IMAGES.DEFAULT;
}

function detectFuelType(item) {
  const text = (((item?.modello || "") + " " + (item?.tipo_appunt_vendita || ""))).toUpperCase();
  if (text.includes("HYBRID") || text.includes("MHEV")) return { label: "Ibrido", color: "#34D399" };
  if (text.includes("ELETTRIC") || text.includes("EV")) return { label: "Elettrico", color: "#38BDF8" };
  if (text.includes("DIESEL") || text.includes("HDI"))  return { label: "Diesel", color: "#FBBF24" };
  if (text.includes("GPL") || text.includes("METANO")) return { label: "GPL", color: "#A3E635" };
  return { label: "Benzina", color: "#F472B6" };
}

function detectGearbox(item) {
  const text = (item?.modello || "").toUpperCase();
  if (text.includes("AUT") || text.includes("EDCT") || text.includes("AT8") || text.includes("DSG")) {
    return "Automatico";
  }
  return "Manuale";
}

// ── Compact, Ultra-Beautiful Car Card ──
function LuxuryCarCard({ item, onPress }) {
  const fuel = detectFuelType(item);
  const gearbox = detectGearbox(item);
  const price = parseFloat(item.rata_f_zero || 0);
  const rimborso = parseFloat(item.rimborso || 0);
  const imgUri = getCarImage(item);
  const brand = (item.marca || "").toUpperCase();
  const rawModel = item.modello || "Veicolo";
  const model = rawModel
    .replace(/^N+UOVA\b/i, "NUOVA")
    .replace(/\bCVd\b/i, "CV")
    .trim();
  const tipo = item.tipo_appunt_vendita || "Disponibile";

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  const isSpecialPromo = (item.indice % 2 === 0);

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={styles.cardOuter}
    >
      <Animated.View style={[styles.cardContainer, { transform: [{ scale: scaleAnim }] }]}>
        
        {/* Top Tag Strip with Neon Accents */}
        <View style={[styles.cardTopBanner, isSpecialPromo ? styles.bannerGold : styles.bannerCyan]}>
          <Text style={styles.bannerText}>
            {isSpecialPromo ? "⚡ PROMO ROSSOMANDI" : "✨ OFFERTA SPECIALE"}
          </Text>
        </View>

        <View style={styles.cardInner}>
          
          {/* Badges: Consegna Rapida & PDF */}
          <View style={styles.badgeRow}>
            <View style={styles.consegnaBadge}>
              <Text style={styles.consegnaText}>CONSEGNA RAPIDA</Text>
            </View>
            {item.has_pdf && (
              <View style={styles.pdfBadgeMini}>
                <Text style={styles.pdfBadgeMiniText}>PDF ✓</Text>
              </View>
            )}
          </View>

          {/* Title & Trim */}
          <View style={styles.cardHeaderBox}>
            <Text style={styles.cardBrand}>{brand}</Text>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {model.replace(new RegExp(`^${brand}\\s*`, 'i'), '') || model}
            </Text>
            <Text style={styles.cardSubtitle} numberOfLines={1}>
              {item.colore_vn ? `${item.colore_vn} • ` : ""}{tipo}
            </Text>
          </View>

          {/* HD Image Frame - Full Car Visibility */}
          <View style={styles.cardImageFrame}>
            <Image
              source={{ uri: imgUri }}
              style={styles.cardImage}
              resizeMode="contain"
            />
            {/* Subtle Gradient Shadow under car */}
            <View style={styles.imageOverlayGlow} />
          </View>

          {/* Specs Mini Bar */}
          <View style={styles.specsRow}>
            <View style={styles.specItem}>
              <Text style={styles.specIcon}>⛽</Text>
              <Text style={[styles.specText, { color: fuel.color }]}>{fuel.label}</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specItem}>
              <Text style={styles.specIcon}>⚙️</Text>
              <Text style={styles.specText}>{gearbox}</Text>
            </View>
            {item.km ? (
              <>
                <View style={styles.specDivider} />
                <View style={styles.specItem}>
                  <Text style={styles.specIcon}>🛣️</Text>
                  <Text style={styles.specText}>{item.km} km</Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Price Container */}
          <View style={styles.priceContainer}>
            {rimborso > 0 && (
              <View style={styles.promoTagRow}>
                <Text style={styles.promoOldPrice}>Rimb. €{rimborso.toFixed(0)}</Text>
                <View style={styles.promoPill}>
                  <Text style={styles.promoPillText}>BONUS ATTIVO</Text>
                </View>
              </View>
            )}
            <View style={styles.priceRow}>
              <Text style={styles.pricePrefix}>da </Text>
              <Text style={styles.priceNumber}>
                {price > 0 ? price.toFixed(0) : "110"} €
              </Text>
              <View style={styles.priceSuffixBox}>
                <Text style={styles.pricePerMonth}>/mese</Text>
                <Text style={styles.priceIva}>IVA Inclusa</Text>
              </View>
            </View>
          </View>

          {/* Attractive Cyan / Emerald Gradient Action Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPress}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>PERSONALIZZA L'OFFERTA</Text>
          </TouchableOpacity>

          {/* Card Footer Micro Bar */}
          <View style={styles.cardFooter}>
            <Text style={styles.footerLeft}>ANCHE CON ANTICIPO ZERO</Text>
            <Text style={styles.footerRight}>NUOVO</Text>
          </View>

        </View>

      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Left Filter Sidebar (Luxury Dark Style) ──
function LuxurySidebar({
  targetType, setTargetType,
  anticipoZero, setAnticipoZero,
  brands, activeBrands, onToggleBrand,
  tipi, activeTipi, onToggleTipo,
  onReset,
}) {
  return (
    <View style={styles.sidebarCard}>
      {/* Header with Glowing Accent */}
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarHeaderText}>FILTRA LE OFFERTE</Text>
      </View>

      <View style={styles.sidebarBody}>
        
        {/* Offerte per: Privati vs Aziende */}
        <View style={styles.filterGroup}>
          <Text style={styles.groupLabel}>Offerte per</Text>
          <View style={styles.targetToggleRow}>
            <TouchableOpacity
              style={[styles.targetBtn, targetType === "Privati" ? styles.targetBtnActive : styles.targetBtnInactive]}
              onPress={() => setTargetType("Privati")}
            >
              <Text style={[styles.targetBtnText, targetType === "Privati" ? styles.targetTextActive : styles.targetTextInactive]}>
                Privati
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.targetBtn, targetType === "Aziende" ? styles.targetBtnActive : styles.targetBtnInactive]}
              onPress={() => setTargetType("Aziende")}
            >
              <Text style={[styles.targetBtnText, targetType === "Aziende" ? styles.targetTextActive : styles.targetTextInactive]}>
                Aziende e P.IVA
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Anticipo Zero Checkbox */}
        <View style={styles.filterGroup}>
          <Text style={styles.groupLabel}>Anticipo zero</Text>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setAnticipoZero(!anticipoZero)}
          >
            <View style={[styles.checkboxBox, anticipoZero && styles.checkboxBoxActive]}>
              {anticipoZero && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Mostra offerte ad anticipo zero</Text>
          </TouchableOpacity>
        </View>

        {/* Marca Auto */}
        <View style={styles.filterGroup}>
          <Text style={styles.groupLabel}>Marca auto</Text>
          {brands.slice(0, 10).map((b) => {
            const isChecked = activeBrands.includes(b);
            return (
              <TouchableOpacity
                key={b}
                style={styles.checkboxRow}
                onPress={() => onToggleBrand(b)}
              >
                <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxActive]}>
                  {isChecked && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{b}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tipologia Appuntamento / Canale */}
        {tipi.length > 0 && (
          <View style={styles.filterGroup}>
            <Text style={styles.groupLabel}>Tipologia</Text>
            {tipi.map((t) => {
              const isChecked = activeTipi.includes(t);
              return (
                <TouchableOpacity
                  key={t}
                  style={styles.checkboxRow}
                  onPress={() => onToggleTipo(t)}
                >
                  <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxActive]}>
                    {isChecked && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Reset button */}
        <TouchableOpacity style={styles.resetFilterBtn} onPress={onReset}>
          <Text style={styles.resetFilterBtnText}>Azzera Filtri</Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}

// ── Main Screen ──
export default function PortalShowcaseScreen({ navigation, route }) {
  const user = route.params?.user;
  const token = route.params?.token;

  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [targetType, setTargetType] = useState("Privati");
  const [anticipoZero, setAnticipoZero] = useState(false);
  const [activeBrands, setActiveBrands] = useState([]);
  const [activeTipi, setActiveTipi] = useState([]);

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${BASE_URL}/api/portal/cars`, { headers });
      setCars(res.data.cars || []);
    } catch (e) {
      console.error("Errore vetrina:", e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCars();
  }, [fetchCars]);

  useFocusEffect(
    useCallback(() => {
      fetchCars();
    }, [fetchCars])
  );

  const brands = useMemo(() => [...new Set(cars.map((c) => c.marca).filter(Boolean))].sort(), [cars]);
  const tipi = useMemo(() => [...new Set(cars.map((c) => c.tipo_appunt_vendita).filter(Boolean))].sort(), [cars]);

  const onToggleBrand = (b) => {
    setActiveBrands((prev) => (prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]));
  };
  const onToggleTipo = (t) => {
    setActiveTipi((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };
  const onReset = () => {
    setActiveBrands([]);
    setActiveTipi([]);
    setAnticipoZero(false);
    setSearchQuery("");
  };

  // Normalization function to merge typos (e.g., NNUOVA -> NUOVA, trailing CV / CVd)
  const normalizeModelKey = (name) => {
    if (!name) return "";
    let clean = name.toUpperCase().trim();
    clean = clean.replace(/^N+UOVA\b/g, "NUOVA");
    clean = clean.replace(/\bCV[A-Za-z0-9]*\b/gi, "");
    return clean.replace(/\s+/g, " ").trim().toLowerCase();
  };

  const filtered = useMemo(() => {
    let list = [...cars];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          (c.marca || "").toLowerCase().includes(q) ||
          (c.modello || "").toLowerCase().includes(q) ||
          (c.tipo_appunt_vendita || "").toLowerCase().includes(q)
      );
    }
    if (activeBrands.length > 0) {
      list = list.filter((c) => activeBrands.includes(c.marca));
    }
    if (activeTipi.length > 0) {
      list = list.filter((c) => activeTipi.includes(c.tipo_appunt_vendita));
    }

    // Always deduplicate: show only 1 card per unique brand+model combination
    const uniqueMap = new Map();
    for (const car of list) {
      const key = `${(car.marca || "").toLowerCase().trim()}_${normalizeModelKey(car.modello)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, car);
      } else {
        // Prioritize entry with actual image, PDF, and clean name
        const existing = uniqueMap.get(key);
        const existingScore =
          (existing.image_url ? 2 : 0) +
          (existing.has_pdf ? 1 : 0) +
          (!existing.modello?.startsWith("NN") ? 1 : 0);
        const currentScore =
          (car.image_url ? 2 : 0) +
          (car.has_pdf ? 1 : 0) +
          (!car.modello?.startsWith("NN") ? 1 : 0);
        if (currentScore > existingScore) {
          uniqueMap.set(key, car);
        }
      }
    }
    return Array.from(uniqueMap.values());
  }, [cars, searchQuery, activeBrands, activeTipi]);

  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth > 860;

  const mainScrollRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const scrollToTop = () => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToBottom = () => {
    mainScrollRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#070D18" />

      {/* Web Custom Visible Scrollbar */}
      {Platform.OS === "web" && (
        <style>{`
          /* Custom Luxury Scrollbar */
          ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          ::-webkit-scrollbar-track {
            background: #070D18;
          }
          ::-webkit-scrollbar-thumb {
            background: #1B2E4B;
            border-radius: 6px;
            border: 2px solid #070D18;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #00E5FF;
          }
          html, body {
            overflow-y: auto !important;
          }
        `}</style>
      )}

      {/* Top Header Navigation - Full Screen Width */}
      <View style={[styles.topNav, isDesktop && styles.topNavDesktop]}>
        {isDesktop ? (
          <View style={styles.topNavDesktopRow}>
            {/* Pinned to the Left Side of the Screen */}
            <TouchableOpacity
              style={styles.navBackBtn}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('Login');
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.navBackIcon}>‹</Text>
              <Text style={styles.navBackText}>
                {user ? 'Torna al Portale' : '🔐 Accedi (Admin / Staff)'}
              </Text>
            </TouchableOpacity>

            {/* Center: Search Box */}
            <View style={styles.navSearchBoxDesktop}>
              <Text style={styles.navSearchIcon}>🔍</Text>
              <TextInput
                style={styles.navSearchInput}
                placeholder="Cerca marca o modello..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text style={styles.clearSearchIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Pinned to the Right Side of the Screen */}
            <View style={styles.navRightRow}>
              <View style={styles.navBrandCenter}>
                <Text style={styles.navBrandTitle}>ROSSOMANDI</Text>
                <Text style={styles.navBrandSub}>SHOWROOM VETRINA</Text>
              </View>

              <TouchableOpacity
                style={styles.navRefreshBtn}
                onPress={fetchCars}
                activeOpacity={0.7}
              >
                <Text style={styles.navRefreshIcon}>🔄</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.topNavMobileWrap}>
            <View style={styles.topNavMobileRow}>
              <TouchableOpacity
                style={styles.navBackBtn}
                onPress={() => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  } else {
                    navigation.navigate('Login');
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.navBackIcon}>‹</Text>
                <Text style={styles.navBackText}>
                  {user ? 'Torna al Portale' : '🔐 Accedi Staff'}
                </Text>
              </TouchableOpacity>

              <View style={styles.navRightRow}>
                <View style={styles.navBrandCenter}>
                  <Text style={styles.navBrandTitle}>ROSSOMANDI</Text>
                </View>
                <TouchableOpacity
                  style={styles.navRefreshBtn}
                  onPress={fetchCars}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navRefreshIcon}>🔄</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.navSearchBoxMobile}>
              <Text style={styles.navSearchIcon}>🔍</Text>
              <TextInput
                style={styles.navSearchInput}
                placeholder="Cerca marca o modello..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Text style={styles.clearSearchIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>

      <ScrollView
        ref={mainScrollRef}
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          setShowScrollTop(offsetY > 180);
        }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchCars}
            tintColor="#00E5FF"
            colors={["#00E5FF"]}
          />
        }
      >
        {/* Main Contained Wrapper - Centers the content and maintains clean layout */}
        <View style={styles.pageContainer}>

          {/* Top Description Heading */}
          <View style={styles.pageIntroHeader}>
            <Text style={styles.pageIntroText}>
              Scopri le <Text style={styles.boldText}>migliori offerte di noleggio a lungo termine per {targetType.toLowerCase()}</Text>, scegli l'auto che preferisci, clicca sull'offerta e personalizza anticipo, km inclusi e durata. Confronta Benzina, Hybrid, Diesel e Full Electric in modo chiaro, senza sorprese, e richiedi una consulenza per guidare senza pensieri.
            </Text>
          </View>

          {/* Results Count Banner with Neon Accent */}
          <View style={styles.countBanner}>
            <Text style={styles.countText}>
              🚗 <Text style={styles.boldText}>{filtered.length} offerte</Text> selezionate per te
              <Text style={{ color: '#64748B' }}>  •  </Text>
              <Text style={{ color: '#94A3B8' }}>Totale: </Text>
              <Text style={[styles.boldText, { color: '#00E5FF' }]}>{cars.length} veicoli</Text>
            </Text>
          </View>

          {/* 2-Column Responsive Body */}
          <View style={styles.layoutRow}>
            
            {/* Left Sidebar Filter (240px) */}
            <View style={styles.sidebarColumn}>
              <LuxurySidebar
                targetType={targetType}
                setTargetType={setTargetType}
                anticipoZero={anticipoZero}
                setAnticipoZero={setAnticipoZero}
                brands={brands}
                activeBrands={activeBrands}
                onToggleBrand={onToggleBrand}
                tipi={tipi}
                activeTipi={activeTipi}
                onToggleTipo={onToggleTipo}
                onReset={onReset}
              />
            </View>

            {/* Right Cards Grid */}
            <View style={styles.gridColumn}>
              {loading ? (
                <View style={styles.stateBox}>
                  <ActivityIndicator size="large" color="#00E5FF" />
                  <Text style={styles.stateText}>Caricamento showroom...</Text>
                </View>
              ) : filtered.length === 0 ? (
                <View style={styles.stateBox}>
                  <Text style={styles.stateEmoji}>🔍</Text>
                  <Text style={styles.stateTitle}>Nessuna offerta trovata</Text>
                  <Text style={styles.stateText}>Prova a modificare i filtri o la ricerca.</Text>
                  <TouchableOpacity style={styles.resetBtnBig} onPress={onReset}>
                    <Text style={styles.resetBtnBigText}>Azzera tutti i filtri</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.cardsGridWrap}>
                  {filtered.map((item) => (
                    <LuxuryCarCard
                      key={String(item.indice)}
                      item={item}
                      onPress={() =>
                        navigation.navigate("PortalShowcaseDetail", {
                          car: item,
                          user,
                          token,
                        })
                      }
                    />
                  ))}
                </View>
              )}
            </View>

          </View>

        </View>
      </ScrollView>

      {/* ── Floating Quick Scroll Buttons (Su / Giù) ── */}
      <View style={styles.floatingScrollControls}>
        {showScrollTop && (
          <TouchableOpacity
            style={styles.scrollFloatBtn}
            onPress={scrollToTop}
            activeOpacity={0.85}
          >
            <Text style={styles.scrollFloatIcon}>▲</Text>
            <Text style={styles.scrollFloatText}>SU</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.scrollFloatBtn}
          onPress={scrollToBottom}
          activeOpacity={0.85}
        >
          <Text style={styles.scrollFloatIcon}>▼</Text>
          <Text style={styles.scrollFloatText}>GIÙ</Text>
        </TouchableOpacity>
      </View>

      {/* Floating Gold/Yellow "Parla con noi" Badge */}
      <TouchableOpacity
        style={styles.floatingChatBadge}
        onPress={() => {
          if (Platform.OS === "web") alert("Contatta Rossomandi SRL: +39 348 171 4322");
        }}
        activeOpacity={0.9}
      >
        <Text style={styles.floatingChatText}>PARLA</Text>
        <Text style={styles.floatingChatSub}>CON</Text>
        <Text style={styles.floatingChatText}>NOI</Text>
      </TouchableOpacity>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#070D18",
    ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : {}),
  },

  // ── Top Navigation (Full Screen Width, No MaxWidth restriction) ──
  topNav: {
    backgroundColor: "#0C1628",
    borderBottomWidth: 1,
    borderBottomColor: "#1B2A44",
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  topNavDesktop: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  topNavDesktopRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavMobileWrap: {
    width: "100%",
  },
  topNavMobileRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  navBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13223B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E365D",
  },
  navBackIcon: {
    fontSize: 20,
    color: "#00E5FF",
    fontWeight: "800",
    marginRight: 6,
    marginTop: -2,
  },
  navBackText: {
    fontSize: 13,
    color: "#00E5FF",
    fontWeight: "700",
  },
  navSearchBoxDesktop: {
    flex: 1,
    maxWidth: 520,
    marginHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13223B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1E365D",
  },
  navSearchBoxMobile: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13223B",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#1E365D",
  },
  navSearchIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  navSearchInput: {
    fontSize: 12.5,
    color: "#F1F5F9",
    flex: 1,
    paddingVertical: 0,
  },
  clearSearchIcon: {
    color: "#64748B",
    fontSize: 13,
    paddingLeft: 6,
    fontWeight: "700",
  },
  navRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  navBrandCenter: {
    alignItems: "flex-end",
  },
  navBrandTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  navBrandSub: {
    fontSize: 9,
    fontWeight: "700",
    color: "#00E5FF",
    letterSpacing: 1.2,
  },
  navRefreshBtn: {
    backgroundColor: "#13223B",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E365D",
    alignItems: "center",
    justifyContent: "center",
  },
  navRefreshIcon: {
    fontSize: 15,
  },

  // ── Main Scroll ──
  mainScrollView: {
    flex: 1,
    ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}),
  },
  mainScrollContent: {
    paddingBottom: 60,
  },

  // ── Contained Width ──
  pageContainer: {
    maxWidth: 1240,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  pageIntroHeader: {
    marginBottom: 12,
    backgroundColor: "#0D182A",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1B2E4D",
  },
  pageIntroText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: "#94A3B8",
  },
  boldText: {
    fontWeight: "800",
    color: "#00E5FF",
  },

  countBanner: {
    marginBottom: 16,
  },
  countText: {
    fontSize: 15,
    color: "#F1F5F9",
    fontWeight: "600",
  },

  // ── Layout ──
  layoutRow: {
    flexDirection: SCREEN_WIDTH > 860 ? "row" : "column",
    alignItems: "flex-start",
    gap: 18,
  },
  sidebarColumn: {
    width: SCREEN_WIDTH > 860 ? 240 : "100%",
    flexShrink: 0,
  },
  gridColumn: {
    flex: 1,
    width: "100%",
  },

  // ── Luxury Dark Sidebar ──
  sidebarCard: {
    backgroundColor: "#0C1729",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1C2E4B",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  sidebarHeader: {
    backgroundColor: "#F59E0B",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  sidebarHeaderText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#070D18",
    letterSpacing: 1,
  },
  sidebarBody: {
    padding: 14,
  },
  filterGroup: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#16253D",
    paddingBottom: 14,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#00E5FF",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  targetToggleRow: {
    flexDirection: "row",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1E365D",
    overflow: "hidden",
    backgroundColor: "#070D18",
  },
  targetBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  targetBtnActive: {
    backgroundColor: "#F59E0B",
  },
  targetBtnInactive: {
    backgroundColor: "transparent",
  },
  targetBtnText: {
    fontSize: 11,
    fontWeight: "800",
  },
  targetTextActive: {
    color: "#070D18",
  },
  targetTextInactive: {
    color: "#94A3B8",
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4.5,
  },
  checkboxBox: {
    width: 17,
    height: 17,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#070D18",
  },
  checkboxBoxActive: {
    backgroundColor: "#00E5FF",
    borderColor: "#00E5FF",
  },
  checkboxCheck: {
    fontSize: 10,
    fontWeight: "900",
    color: "#070D18",
  },
  checkboxLabel: {
    fontSize: 12,
    color: "#CBD5E1",
    flex: 1,
  },

  resetFilterBtn: {
    backgroundColor: "#13223B",
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#1E365D",
  },
  resetFilterBtnText: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "700",
  },

  // ── Grid & Cards ──
  cardsGridWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: SCREEN_WIDTH > 860 ? "flex-start" : "center",
  },

  cardOuter: {
    width: SCREEN_WIDTH > 1150 ? 275 : SCREEN_WIDTH > 860 ? 250 : "100%",
    maxWidth: 320,
    marginBottom: 4,
  },
  cardContainer: {
    backgroundColor: "#0C1628",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1E3252",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTopBanner: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerGold: {
    backgroundColor: "#F59E0B",
  },
  bannerCyan: {
    backgroundColor: "#00E5FF",
  },
  bannerText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#070D18",
  },

  cardInner: {
    padding: 12,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  consegnaBadge: {
    backgroundColor: "#00E5FF18",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#00E5FF44",
  },
  consegnaText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#00E5FF",
    letterSpacing: 0.5,
  },
  pdfBadgeMini: {
    backgroundColor: "#10B98122",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#10B98155",
  },
  pdfBadgeMiniText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#34D399",
  },

  cardHeaderBox: {
    marginBottom: 8,
    minHeight: 46,
  },
  cardBrand: {
    fontSize: 10.5,
    fontWeight: "900",
    color: "#00E5FF",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },

  // ── Car Image Frame ──
  cardImageFrame: {
    width: "100%",
    height: 155,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#050B14",
    position: "relative",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#16253D",
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  imageOverlayGlow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: "#0C162866",
  },

  // Specs Row
  specsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#070D18",
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#16253D",
  },
  specItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
  },
  specIcon: {
    fontSize: 11,
  },
  specText: {
    fontSize: 11,
    color: "#CBD5E1",
    fontWeight: "700",
  },
  specDivider: {
    width: 1,
    height: 14,
    backgroundColor: "#1E365D",
  },

  // Price
  priceContainer: {
    marginBottom: 10,
  },
  promoTagRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  promoOldPrice: {
    fontSize: 10,
    color: "#64748B",
    textDecorationLine: "line-through",
  },
  promoPill: {
    backgroundColor: "#F59E0B22",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#F59E0B55",
  },
  promoPillText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#F59E0B",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  pricePrefix: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 2,
  },
  priceNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: "#34D399",
    letterSpacing: -0.5,
  },
  priceSuffixBox: {
    marginLeft: 4,
    marginBottom: 2,
  },
  pricePerMonth: {
    fontSize: 9.5,
    color: "#CBD5E1",
    fontWeight: "700",
    lineHeight: 12,
  },
  priceIva: {
    fontSize: 8,
    color: "#64748B",
    lineHeight: 10,
  },

  // Vibrant Action Button
  actionBtn: {
    backgroundColor: "#00E5FF",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnText: {
    color: "#070D18",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Footer
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#16253D",
    paddingTop: 6,
  },
  footerLeft: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#00E5FF",
    letterSpacing: 0.3,
  },
  footerRight: {
    fontSize: 8.5,
    fontWeight: "800",
    color: "#64748B",
  },

  // States
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  stateEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  stateText: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 8,
  },
  resetBtnBig: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  resetBtnBigText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#070D18",
  },

  // Floating Chat Badge
  floatingChatBadge: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#F59E0B",
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 99,
  },
  floatingChatText: {
    fontSize: 9,
    fontWeight: "900",
    color: "#070D18",
    lineHeight: 11,
  },
  floatingChatSub: {
    fontSize: 8,
    fontWeight: "800",
    color: "#070D18",
    lineHeight: 9,
  },

  // ── Floating Quick Scroll Buttons (Su / Giù) ──
  floatingScrollControls: {
    position: "absolute",
    right: 28,
    bottom: 96,
    gap: 10,
    zIndex: 98,
  },
  scrollFloatBtn: {
    backgroundColor: "rgba(10, 22, 40, 0.9)",
    borderWidth: 1.5,
    borderColor: "#00E5FF",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00E5FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    cursor: "pointer",
  },
  scrollFloatIcon: {
    color: "#00E5FF",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 14,
  },
  scrollFloatText: {
    color: "#00E5FF",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});