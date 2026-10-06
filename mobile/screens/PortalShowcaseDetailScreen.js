import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Platform,
  Alert,
  Linking,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import axios from "axios";
import { BASE_URL } from "../config/apiConfig";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IS_WIDE = SCREEN_WIDTH > 860;

const BRAND_IMAGES = {
  OPEL:       "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80",
  FIAT:       "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80",
  JEEP:       "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80",
  RENAULT:    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80",
  PEUGEOT:    "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80",
  CITROEN:    "https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=1200&q=80",
  ALFA:       "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
  VOLKSWAGEN: "https://images.unsplash.com/photo-1471444308404-58537446522c?auto=format&fit=crop&w=1200&q=80",
  BMW:        "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80",
  TOYOTA:     "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80",
  FORD:       "https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1200&q=80",
  KIA:        "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=80",
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
  if (text.includes("HYBRID") || text.includes("MHEV")) return { label: "Ibrida (Hybrid)", color: "#22c55e", icon: "⚡" };
  if (text.includes("ELETTRIC") || text.includes("EV")) return { label: "100% Elettrica", color: "#06b6d4", icon: "🔋" };
  if (text.includes("DIESEL") || text.includes("HDI"))  return { label: "Diesel Eco", color: "#f59e0b", icon: "⛽" };
  if (text.includes("GPL") || text.includes("METANO")) return { label: "GPL / Bifuel", color: "#84cc16", icon: "🍃" };
  return { label: "Benzina Euro 6D", color: "#a78bfa", icon: "⛽" };
}

function detectGearbox(item) {
  const text = (item?.modello || "").toUpperCase();
  if (text.includes("AUT") || text.includes("EDCT") || text.includes("AT8") || text.includes("DSG")) {
    return "Automatico";
  }
  return "Manuale";
}

const C = {
  bg:      "#08101f",
  surface: "#0e1a2e",
  card:    "#111d31",
  cardAlt: "#16233b",
  border:  "#1a2d47",
  borderActive: "#22d3ee",
  accent:  "#22d3ee",
  accentG: "#22c55e",
  text:    "#e2eaf7",
  textMid: "#7a9bbf",
  textDim: "#3d5a7a",
  badgeBg: "#1e293b",
};

export default function PortalShowcaseDetailScreen({ navigation, route }) {
  const { car, user, token } = route.params || {};

  const scrollViewRef = useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [imageFit, setImageFit] = useState("contain"); // default to "contain" so the car is NEVER cut off!

  // Lightbox Zoom & Pan Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const fuel = detectFuelType(car);
  const gearbox = detectGearbox(car);
  const imgUri = getCarImage(car);
  const brand = (car?.marca || "N/A").toUpperCase();
  const rawModel = car?.modello || "Veicolo non specificato";
  const model = rawModel
    .replace(/^N+UOVA\b/i, "NUOVA")
    .replace(/\bCVd\b/i, "CV")
    .trim();
  const price = parseFloat(car?.rata_f_zero || 0);
  const rimborso = parseFloat(car?.rimborso || 0);
  const indice = car?.indice || "N/D";
  const nota1 = car?.nota1 ? String(car.nota1).trim() : "";
  const tipoVendita = car?.tipo_appunt_vendita || "Esterno";
  const colore = car?.colore_vn || "Di Serie / Da Scheda";

  // PDF target calculation matching Rossomandi rule
  const targetPdfCode = nota1 || indice;
  const [hasPdf, setHasPdf] = useState(Boolean(car?.has_pdf));
  const [pdfUrl, setPdfUrl] = useState(car?.pdf_url || `/uploads/preventivi_pdf/${targetPdfCode}.pdf`);
  const [pdfFilename, setPdfFilename] = useState(car?.pdf_filename || `${targetPdfCode}.pdf`);
  const [uploading, setUploading] = useState(false);
  const [deletingPdf, setDeletingPdf] = useState(false);

  // Auto-check PDF presence on server / cloud storage
  useEffect(() => {
    if (!targetPdfCode) return;
    axios.get(`${BASE_URL}/api/portal/pdf-status/${targetPdfCode}`)
      .then(res => {
        if (res.data && res.data.exists) {
          setHasPdf(true);
          if (res.data.filename) setPdfFilename(res.data.filename);
          if (res.data.url) setPdfUrl(res.data.url);
        }
      })
      .catch(() => {});
  }, [targetPdfCode]);

  // Email to Client modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [clientEmail, setClientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState(`Preventivo Rossomandi NLT: ${model}`);
  const [emailMessage, setEmailMessage] = useState(
    `Gentile Cliente,\n\nIn allegato trova il preventivo per la vettura ${brand} ${model}.\n\nCordiali saluti,\nRossomandi Automotive SRL`
  );
  const [sendingEmail, setSendingEmail] = useState(false);

  const handleOpenPdf = () => {
    if (!hasPdf && !targetPdfCode) {
      const msg = "Preventivo PDF non ancora associato a questo veicolo.";
      if (Platform.OS === "web") alert(msg);
      else Alert.alert("Avviso", msg);
      return;
    }
    const currentPdfUrl = (pdfUrl && (pdfUrl.startsWith("http://") || pdfUrl.startsWith("https://")))
      ? pdfUrl
      : `${BASE_URL}/api/portal/pdf/${targetPdfCode}`;
    const cacheBuster = currentPdfUrl.includes("?") ? `&_t=${Date.now()}` : `?_t=${Date.now()}`;
    const fullUrl = `${currentPdfUrl}${cacheBuster}`;
    if (Platform.OS === "web") {
      try {
        const win = window.open(fullUrl, "_blank");
        if (!win || win.closed || typeof win.closed === "undefined") {
          window.location.href = fullUrl;
        }
      } catch (e) {
        window.location.href = fullUrl;
      }
    } else {
      Linking.openURL(fullUrl).catch(() => {
        Alert.alert("Errore", "Impossibile aprire il file PDF.");
      });
    }
  };

  // Send Email to Client
  const handleSendEmail = async () => {
    if (!clientEmail || !clientEmail.includes("@")) {
      const err = "Inserisci un indirizzo email valido.";
      if (Platform.OS === "web") alert(err);
      else Alert.alert("Errore", err);
      return;
    }

    setSendingEmail(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${BASE_URL}/api/portal/send-pdf-email`,
        {
          client_email: clientEmail.trim(),
          target_pdf_code: targetPdfCode,
          car_model: model || "Veicolo",
          subject: emailSubject,
          message: emailMessage,
        },
        { headers }
      );

      const successMsg = res.data?.message || `Email inviata con successo a ${clientEmail}!`;
      if (Platform.OS === "web") alert(successMsg);
      else Alert.alert("Successo", successMsg);

      setEmailModalVisible(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Errore durante l'invio dell'email.";
      if (Platform.OS === "web") alert(errorMsg);
      else Alert.alert("Errore", errorMsg);
    } finally {
      setSendingEmail(false);
    }
  };

  // Handle PDF removal from server
  const handleDeletePdf = () => {
    const doDelete = async () => {
      setDeletingPdf(true);
      try {
        await axios.delete(`${BASE_URL}/api/portal/pdf/${targetPdfCode}`);
        setHasPdf(false);
        setPdfFilename(null);
        setPdfUrl(null);
        const msg = `PDF per codice ${targetPdfCode} eliminato con successo dal server.`;
        if (Platform.OS === "web") alert(msg);
        else Alert.alert("Rimosso", msg);
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || "Errore durante la rimozione del PDF.";
        if (Platform.OS === "web") alert(errorMsg);
        else Alert.alert("Errore", errorMsg);
      } finally {
        setDeletingPdf(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Sei sicuro di voler eliminare il file PDF collegato (${pdfFilename || `${targetPdfCode}.pdf`}) dal server?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        "Rimuovi PDF",
        `Sei sicuro di voler eliminare il file PDF collegato (${pdfFilename || `${targetPdfCode}.pdf`}) dal server?`,
        [
          { text: "Annulla", style: "cancel" },
          { text: "Elimina", style: "destructive", onPress: doDelete },
        ]
      );
    }
  };

  // Upload or replace PDF from USB / Computer
  const handleUploadClick = () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "application/pdf";
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("target_code", targetPdfCode);
        formData.append("file", file);

        try {
          const res = await axios.post(`${BASE_URL}/api/portal/upload-pdf?target_code=${targetPdfCode}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          const successMsg = res.data?.message || `PDF ${res.data?.filename || `${targetPdfCode}.pdf`} caricato con successo!`;
          alert(successMsg);
          setHasPdf(true);
          setPdfFilename(res.data?.filename || `${targetPdfCode}.pdf`);
          setPdfUrl(res.data?.url || `/uploads/preventivi_pdf/${targetPdfCode}.pdf`);
        } catch (uploadErr) {
          alert("Errore caricamento PDF: " + (uploadErr.response?.data?.error || uploadErr.message));
        } finally {
          setUploading(false);
        }
      };
      input.click();
    } else {
      Alert.alert(
        "Caricamento Server",
        `Carica il file PDF nominato "${targetPdfCode}.pdf" nella cartella backend/uploads/preventivi_pdf/ sul server.`
      );
    }
  };

  const handleOpenGestionale = () => {
    navigation.navigate("PortalCarDetail", {
      car,
      user,
      token,
    });
  };

  // Zoom and Pan controls for Lightbox
  const handleZoomIn = () => {
    setZoomScale((s) => Math.min(Number((s + 0.25).toFixed(2)), 4.0));
  };

  const handleZoomOut = () => {
    setZoomScale((s) => {
      const next = Math.max(Number((s - 0.25).toFixed(2)), 1.0);
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handlePan = (dx, dy) => {
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  const openLightbox = () => {
    setZoomScale(1.0);
    setPan({ x: 0, y: 0 });
    setModalVisible(true);
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#08101f" />

      {/* Web Custom Visible Scrollbar */}
      {Platform.OS === "web" && (
        <style>{`
          /* Custom Luxury Scrollbar */
          ::-webkit-scrollbar {
            width: 12px;
            height: 12px;
          }
          ::-webkit-scrollbar-track {
            background: #08101F;
          }
          ::-webkit-scrollbar-thumb {
            background: #1B2E4B;
            border-radius: 6px;
            border: 2px solid #08101F;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #00E5FF;
          }
          html, body {
            overflow-y: auto !important;
          }
        `}</style>
      )}

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backBtnIcon}>‹</Text>
          <Text style={styles.backBtnText}>Torna alla Vetrina</Text>
        </TouchableOpacity>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.gestionaleBtn}
            onPress={handleOpenGestionale}
            activeOpacity={0.8}
          >
            <Text style={styles.gestionaleBtnText}>⚙️ Vista Gestionale</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          setShowScrollTop(offsetY > 150);
        }}
      >
        <View style={styles.pageContainer}>
          {/* ── Breadcrumb ── */}
          <View style={styles.breadcrumb}>
            <Text style={styles.breadcrumbLink} onPress={() => navigation.goBack()}>Vetrina Auto</Text>
            <Text style={styles.breadcrumbSep}> › </Text>
            <Text style={styles.breadcrumbLink}>{brand}</Text>
            <Text style={styles.breadcrumbSep}> › </Text>
            <Text style={styles.breadcrumbActive} numberOfLines={1}>{model}</Text>
          </View>

        {/* ── Vehicle Hero Banner with Full Image Framing & Zoom Lightbox ── */}
        <View style={styles.heroSection}>
          <View style={styles.heroImageCard}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={openLightbox}
              style={styles.heroImageTouchable}
            >
              <Image
                source={{ uri: imgUri }}
                style={styles.heroImage}
                resizeMode={imageFit}
              />
            </TouchableOpacity>

            {/* Badges Overlay */}
            <View style={styles.heroBadgesRow}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>{brand}</Text>
              </View>
              {hasPdf && (
                <View style={styles.pdfHeroBadge}>
                  <Text style={styles.pdfHeroBadgeText}>📄 PDF Preventivo Pronto</Text>
                </View>
              )}
            </View>

            {/* Interactive Photo Controls on the Card */}
            <View style={styles.heroActionControlsRow}>
              <TouchableOpacity
                style={styles.heroZoomTriggerBtn}
                onPress={openLightbox}
                activeOpacity={0.85}
              >
                <Text style={styles.heroZoomTriggerIcon}>🔍</Text>
                <Text style={styles.heroZoomTriggerText}>Ingrandisci & Zoom</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.heroFitToggleBtn}
                onPress={() => setImageFit((f) => (f === "contain" ? "cover" : "contain"))}
                activeOpacity={0.85}
              >
                <Text style={styles.heroFitToggleText}>
                  {imageFit === "contain" ? "🖼️ Foto Intera (100%)" : "📐 Modalità Riempi"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroFooterBar}>
              <Text style={styles.heroRefText}>Rif. Indice #{indice} {nota1 ? `• Nota1 #${nota1}` : ""}</Text>
              <TouchableOpacity onPress={openLightbox} activeOpacity={0.8}>
                <Text style={styles.heroClickHint}>💡 Clicca sulla foto per ingrandire e muoverla a tutto schermo ↗</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── Main Content Grid (Responsive Layout) ── */}
        <View style={[styles.mainLayout, IS_WIDE && styles.mainLayoutWide]}>
          
          {/* ── Left Column: Specs & Offer Highlights ── */}
          <View style={[styles.leftColumn, IS_WIDE && styles.leftColumnWide]}>
            
            {/* Title Header Card */}
            <View style={styles.titleCard}>
              <Text style={styles.titleBrand}>{brand}</Text>
              <Text style={styles.titleModel}>{model}</Text>
            </View>

            {/* Quick Specs Grid */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>SPECIFICHE DEL VEICOLO</Text>
              <View style={styles.specsGrid}>
                
                <View style={styles.specBox}>
                  <Text style={styles.specIcon}>{fuel.icon}</Text>
                  <Text style={styles.specLabel}>Alimentazione</Text>
                  <Text style={[styles.specVal, { color: fuel.color }]}>{fuel.label}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specIcon}>⚙️</Text>
                  <Text style={styles.specLabel}>Cambio</Text>
                  <Text style={styles.specVal}>{gearbox}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specIcon}>🎨</Text>
                  <Text style={styles.specLabel}>Colore</Text>
                  <Text style={styles.specVal}>{colore}</Text>
                </View>

                <View style={styles.specBox}>
                  <Text style={styles.specIcon}>📋</Text>
                  <Text style={styles.specLabel}>Tipo Vendita</Text>
                  <Text style={styles.specVal}>{tipoVendita}</Text>
                </View>

              </View>
            </View>


          </View>

          {/* ── Right Column: Sticky Pricing & Action Card ── */}
          <View style={[styles.rightColumn, IS_WIDE && styles.rightColumnWide]}>
            
            <View style={styles.pricingCard}>
              <View style={styles.pricingHeader}>
                <Text style={styles.pricingHeaderBadge}>OFFERTA PROMOZIONALE</Text>
                <Text style={styles.pricingHeaderTag}>Anticipo 1000 Euro</Text>
              </View>

              <View style={styles.pricingMain}>
                <Text style={styles.pricingSmallLabel}>Rata F/Zero Mensile da</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingEuro}>€</Text>
                  <Text style={styles.pricingAmount}>
                    {price > 0 ? price.toFixed(0) : "—"}
                  </Text>
                  <Text style={styles.pricingPer}>/ mese</Text>
                </View>
                <Text style={styles.pricingIva}>IVA Inclusa • Canone fisso e trasparente</Text>
              </View>

              {/* Rimborso Highlight if exists */}
              {rimborso > 0 && (
                <View style={styles.rimborsoBanner}>
                  <View>
                    <Text style={styles.rimborsoTitle}>Rimborso VN Previsto</Text>
                  </View>
                  <Text style={styles.rimborsoAmount}>€ {rimborso.toFixed(0)}</Text>
                </View>
              )}

              {/* Summary bullets */}
              <View style={styles.pricingBullets}>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletCheck}>✓</Text>
                  <Text style={styles.bulletText}>Nessuna sorpresa: canone 100% bloccato</Text>
                </View>
                <View style={styles.bulletRow}>
                  <Text style={styles.bulletCheck}>✓</Text>
                  <Text style={styles.bulletText}>Valutazione permuta del tuo usato</Text>
                </View>
              </View>

              {/* ── Luxury PDF Management Panel (Ultra-Attractive Styling) ── */}
              <View style={styles.pdfCardContainer}>
                {/* Header with status badge */}
                <View style={styles.pdfCardHeader}>
                  <View style={styles.pdfCardIconBox}>
                    <Text style={styles.pdfCardIcon}>📄</Text>
                  </View>
                  <View style={styles.pdfCardHeaderText}>
                    <View style={styles.pdfTitleRow}>
                      <Text style={styles.pdfCardTitle}>
                        {hasPdf ? "Documento Preventivo" : "Preventivo Assente"}
                      </Text>
                      <View style={[styles.pdfStatusPill, hasPdf ? styles.pdfStatusPillOk : styles.pdfStatusPillWait]}>
                        <Text style={[styles.pdfStatusPillText, hasPdf ? styles.pdfStatusPillTextOk : styles.pdfStatusPillTextWait]}>
                          {hasPdf ? `✓ ${pdfFilename || `${targetPdfCode}.pdf`}` : "DA CARICARE"}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.pdfCardSub}>
                      {hasPdf
                        ? `Rif. ${nota1 ? `Nota1 #${nota1}` : `Indice #${indice}`} • Pronto per apertura o invio via email`
                        : `Carica il file PDF per consultarlo o inviarlo al cliente.`}
                    </Text>
                  </View>
                </View>

                {/* Buttons Action Matrix */}
                {hasPdf ? (
                  <View style={styles.pdfButtonsContainer}>
                    {/* Primary Pair: Visualizza & Invia al Cliente */}
                    <View style={styles.pdfPrimaryRow}>
                      {/* 1. Visualizza PDF */}
                      <TouchableOpacity
                        style={styles.btnVisualizzaLux}
                        onPress={handleOpenPdf}
                        activeOpacity={0.82}
                      >
                        <View style={styles.btnIconCircleBlue}>
                          <Text style={styles.btnIconText}>👁️</Text>
                        </View>
                        <View style={styles.btnTextCol}>
                          <Text style={styles.btnVisualizzaTitle}>Visualizza PDF</Text>
                          <Text style={styles.btnVisualizzaSub}>Apri il documento</Text>
                        </View>
                      </TouchableOpacity>

                      {/* 2. Invia PDF al Cliente */}
                      <TouchableOpacity
                        style={styles.btnEmailLux}
                        onPress={() => setEmailModalVisible(true)}
                        activeOpacity={0.82}
                      >
                        <View style={styles.btnIconCircleGreen}>
                          <Text style={styles.btnIconText}>✉️</Text>
                        </View>
                        <View style={styles.btnTextCol}>
                          <Text style={styles.btnEmailTitle}>Invia al Cliente</Text>
                          <Text style={styles.btnEmailSub}>Spedisci via email</Text>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* Secondary Utility Row: Sostituisci & Rimuovi */}
                    <View style={styles.pdfSecondaryRow}>
                      {/* 3. Sostituisci PDF */}
                      <TouchableOpacity
                        style={styles.btnSecondaryLux}
                        onPress={handleUploadClick}
                        activeOpacity={0.82}
                        disabled={uploading}
                      >
                        {uploading ? (
                          <ActivityIndicator size="small" color="#38BDF8" />
                        ) : (
                          <>
                            <Text style={styles.btnSecondaryIcon}>🕹️</Text>
                            <Text style={styles.btnSecondaryText}>Sostituisci PDF (USB/PC)</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      {/* 4. Rimuovi PDF */}
                      <TouchableOpacity
                        style={styles.btnDeleteLux}
                        onPress={handleDeletePdf}
                        activeOpacity={0.82}
                        disabled={deletingPdf}
                      >
                        {deletingPdf ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <>
                            <Text style={styles.btnDeleteIcon}>🗑️</Text>
                            <Text style={styles.btnDeleteText}>Rimuovi PDF</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.btnUploadBigLux}
                    onPress={handleUploadClick}
                    activeOpacity={0.85}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <View style={styles.btnUploadBigIconCircle}>
                          <Text style={styles.btnUploadBigIcon}>📤</Text>
                        </View>
                        <View style={{ alignItems: "center" }}>
                          <Text style={styles.btnUploadBigTitle}>Carica Preventivo PDF</Text>
                          <Text style={styles.btnUploadBigSub}>Da Computer / Chiavetta USB ({targetPdfCode}.pdf)</Text>
                        </View>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Agency signature */}
              <View style={styles.agencyFooter}>
                <Text style={styles.agencyTitle}>Rossomandi Automotive SRL</Text>
                <Text style={styles.agencySub}>Partner autorizzato per il Noleggio a Lungo Termine</Text>
              </View>

            </View>

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

      {/* ── High-Definition Lightbox / Zoom & Pan Modal ── */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderInfo}>
              <Text style={styles.modalBrandText}>{brand} {model}</Text>
              <Text style={styles.modalSubText}>
                Rif. Indice #{indice} {nota1 ? `• Nota1 #${nota1}` : ""} • Naviga nei dettagli dell'auto
              </Text>
            </View>

            <View style={styles.modalHeaderRight}>
              <View style={styles.zoomBadgePill}>
                <Text style={styles.zoomBadgeText}>{Math.round(zoomScale * 100)}%</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCloseBtnText}>✕ Chiudi</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Image Viewport */}
          <View style={styles.modalViewport}>
            <Image
              source={{ uri: imgUri }}
              style={[
                styles.modalImage,
                {
                  transform: [
                    { scale: zoomScale },
                    { translateX: pan.x },
                    { translateY: pan.y },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>

          {/* Floating Interactive Controls Bar */}
          <View style={styles.modalControlsBar}>
            {/* Zoom Controls */}
            <View style={styles.controlGroup}>
              <TouchableOpacity
                style={[styles.controlBtn, zoomScale <= 1.0 && styles.controlBtnDisabled]}
                onPress={handleZoomOut}
                disabled={zoomScale <= 1.0}
              >
                <Text style={styles.controlBtnText}>➖ Zoom -</Text>
              </TouchableOpacity>

              <View style={styles.controlScaleIndicator}>
                <Text style={styles.controlScaleText}>{Math.round(zoomScale * 100)}%</Text>
              </View>

              <TouchableOpacity
                style={[styles.controlBtn, zoomScale >= 4.0 && styles.controlBtnDisabled]}
                onPress={handleZoomIn}
                disabled={zoomScale >= 4.0}
              >
                <Text style={styles.controlBtnText}>➕ Zoom +</Text>
              </TouchableOpacity>
            </View>

            {/* Pan / Direction Controls */}
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.controlIconBtn} onPress={() => handlePan(80, 0)}>
                <Text style={styles.controlIconText}>◀ SX</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlIconBtn} onPress={() => handlePan(0, 80)}>
                <Text style={styles.controlIconText}>▲ SU</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlIconBtn} onPress={() => handlePan(0, -80)}>
                <Text style={styles.controlIconText}>▼ GIÙ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlIconBtn} onPress={() => handlePan(-80, 0)}>
                <Text style={styles.controlIconText}>DX ▶</Text>
              </TouchableOpacity>
            </View>

            {/* Reset / Center */}
            <View style={styles.controlGroup}>
              <TouchableOpacity style={styles.resetBtn} onPress={handleResetZoom}>
                <Text style={styles.resetBtnText}>🔄 Centra (1:1)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Modal Invia Email al Cliente ── */}
      <Modal
        visible={emailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.emailModalBackdrop}>
          <View style={styles.emailModalBox}>
            <View style={styles.emailModalHeader}>
              <Text style={styles.emailModalTitle}>✉️ Invia PDF al Cliente via Email</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Text style={styles.emailModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18 }}>
              {/* Attachment badge */}
              <View style={styles.attachmentBadge}>
                <Text style={{ color: "#38BDF8", fontWeight: "700", fontSize: 13 }}>
                  📎 Allegato: {pdfFilename || `${targetPdfCode}.pdf`}
                </Text>
                <Text style={{ color: "#94A3B8", fontSize: 11, marginTop: 2 }}>
                  Veicolo: {brand} {model}
                </Text>
              </View>

              {/* Form Input: Client Email */}
              <Text style={styles.emailInputLabel}>Email Cliente *</Text>
              <TextInput
                style={styles.emailInput}
                placeholder="Es. cliente@gmail.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={clientEmail}
                onChangeText={setClientEmail}
              />

              {/* Form Input: Subject */}
              <Text style={styles.emailInputLabel}>Oggetto Email</Text>
              <TextInput
                style={styles.emailInput}
                placeholder="Oggetto dell'email"
                placeholderTextColor="#64748B"
                value={emailSubject}
                onChangeText={setEmailSubject}
              />

              {/* Form Input: Message Body */}
              <Text style={styles.emailInputLabel}>Messaggio</Text>
              <TextInput
                style={[styles.emailInput, { minHeight: 90, textAlignVertical: "top" }]}
                multiline
                numberOfLines={4}
                placeholder="Testo dell'email per il cliente..."
                placeholderTextColor="#64748B"
                value={emailMessage}
                onChangeText={setEmailMessage}
              />

              {/* Action Buttons */}
              <View style={styles.emailModalButtonsRow}>
                <TouchableOpacity
                  style={[styles.emailModalBtn, styles.emailCancelBtn]}
                  onPress={() => setEmailModalVisible(false)}
                  disabled={sendingEmail}
                >
                  <Text style={styles.emailCancelBtnText}>Annulla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.emailModalBtn, styles.emailSendBtn]}
                  onPress={handleSendEmail}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <ActivityIndicator size="small" color="#0F0F13" />
                  ) : (
                    <Text style={styles.emailSendBtnText}>Invia Email 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    ...(Platform.OS === 'web' ? { height: '100vh', overflow: 'hidden' } : {}),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
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
  backBtnIcon: {
    color: "#00E5FF",
    fontSize: 20,
    fontWeight: "800",
    marginRight: 6,
    marginTop: -2,
  },
  backBtnText: {
    color: "#00E5FF",
    fontSize: 13,
    fontWeight: "700",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  gestionaleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13223B",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E365D",
  },
  gestionaleBtnText: {
    color: "#00E5FF",
    fontSize: 13,
    fontWeight: "700",
  },

  scroll: {
    flex: 1,
    ...(Platform.OS === 'web' ? { overflowY: 'auto' } : {}),
  },
  scrollContent: {
    paddingBottom: 60,
  },

  // ── Breadcrumbs ──
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  breadcrumbLink: {
    color: C.textMid,
    fontSize: 12,
    fontWeight: "500",
  },
  breadcrumbSep: {
    color: C.textDim,
    fontSize: 12,
  },
  breadcrumbActive: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },

  pageContainer: {
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
  },

  // ── Hero Section ──
  heroSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  heroImageCard: {
    width: "100%",
    height: IS_WIDE ? 440 : 270,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#050B14",
    borderWidth: 1,
    borderColor: C.border,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 18,
    elevation: 8,
  },
  heroImageTouchable: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroBadgesRow: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    zIndex: 4,
  },
  heroActionControlsRow: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 5,
  },
  heroZoomTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00E5FF22",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#00E5FF",
    gap: 6,
    cursor: "pointer",
  },
  heroZoomTriggerIcon: {
    fontSize: 13,
  },
  heroZoomTriggerText: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "800",
  },
  heroFitToggleBtn: {
    backgroundColor: "#08101Fcc",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1B2E4B",
    cursor: "pointer",
  },
  heroFitToggleText: {
    color: "#E2EAF7",
    fontSize: 11,
    fontWeight: "700",
  },
  brandBadge: {
    backgroundColor: "#08101fdd",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent + "66",
  },
  brandBadgeText: {
    color: C.accent,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  dispoBadge: {
    backgroundColor: "#22c55edd",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dispoBadgeText: {
    color: "#000",
    fontSize: 11,
    fontWeight: "800",
  },
  pdfHeroBadge: {
    backgroundColor: "#08101fee",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f59e0b88",
  },
  pdfHeroBadgeText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
  },
  heroFooterBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#08101fcc",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  heroRefText: {
    color: C.textMid,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // ── Layout ──
  mainLayout: {
    paddingHorizontal: 16,
    gap: 16,
  },
  mainLayoutWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  leftColumn: {
    width: "100%",
    gap: 16,
  },
  leftColumnWide: {
    flex: 1.6,
  },
  rightColumn: {
    width: "100%",
  },
  rightColumnWide: {
    flex: 1,
    position: "sticky",
    top: 20,
  },

  // ── Left Cards ──
  titleCard: {
    backgroundColor: C.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  titleBrand: {
    color: C.accent,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  titleModel: {
    color: C.text,
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 6,
    lineHeight: 30,
  },
  titleSub: {
    color: C.textMid,
    fontSize: 13,
  },

  sectionCard: {
    backgroundColor: C.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    color: C.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: C.textMid,
    fontSize: 12,
    marginBottom: 16,
  },

  // Specs Grid
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  specBox: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    width: "48%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: C.border,
  },
  specIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  specLabel: {
    color: C.textMid,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  specVal: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
  },

  // Services Included
  servicesList: {
    gap: 14,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  serviceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: C.accent + "18",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.accent + "33",
  },
  serviceIcon: {
    fontSize: 18,
  },
  serviceText: {
    flex: 1,
  },
  serviceTitle: {
    color: C.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  serviceDesc: {
    color: C.textMid,
    fontSize: 11,
    lineHeight: 16,
  },

  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#1e293b55",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    gap: 10,
  },
  infoBannerIcon: {
    fontSize: 18,
  },
  infoBannerText: {
    color: C.textMid,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },

  // ── Right Column: Pricing Card ──
  pricingCard: {
    backgroundColor: C.surface,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.accent + "44",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 8,
  },
  pricingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  pricingHeaderBadge: {
    backgroundColor: C.accent + "22",
    color: C.accent,
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.8,
  },
  pricingHeaderTag: {
    backgroundColor: "#22c55e22",
    color: "#22c55e",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pricingMain: {
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 14,
    alignItems: "center",
  },
  pricingSmallLabel: {
    color: C.textMid,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 4,
  },
  pricingEuro: {
    color: C.accentG,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  pricingAmount: {
    color: C.accentG,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: -1,
  },
  pricingPer: {
    color: C.textMid,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
  },
  pricingIva: {
    color: C.textDim,
    fontSize: 11,
  },

  // Rimborso
  rimborsoBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f59e0b15",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f59e0b44",
    marginBottom: 14,
  },
  rimborsoTitle: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "700",
  },
  rimborsoSub: {
    color: C.textMid,
    fontSize: 10,
  },
  rimborsoAmount: {
    color: "#f59e0b",
    fontSize: 16,
    fontWeight: "900",
  },

  // Bullets
  pricingBullets: {
    gap: 8,
    marginBottom: 18,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulletCheck: {
    color: C.accentG,
    fontSize: 13,
    fontWeight: "900",
  },
  bulletText: {
    color: C.textMid,
    fontSize: 12,
  },

  // Actions
  actionsBox: {
    gap: 10,
    marginBottom: 18,
  },
  primaryActionBtn: {
    backgroundColor: C.accent,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionBtnGhost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: C.accent,
  },
  primaryActionBtnText: {
    color: "#08101f",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  contractActionBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  contractActionBtnText: {
    color: "#08101f",
    fontSize: 13,
    fontWeight: "800",
  },
  contactActionBtn: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  contactActionBtnText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
  },

  // Agency
  agencyFooter: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    alignItems: "center",
  },
  agencyTitle: {
    color: C.textMid,
    fontSize: 11,
    fontWeight: "700",
  },
  agencySub: {
    color: C.textDim,
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },

  // ── Hero Bottom Hint ──
  heroClickHint: {
    color: "#00E5FF",
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Floating Quick Scroll Buttons (Su / Giù) ──
  floatingScrollControls: {
    position: "absolute",
    right: 22,
    bottom: 30,
    gap: 12,
    zIndex: 99,
  },
  scrollFloatBtn: {
    backgroundColor: "rgba(10, 22, 40, 0.9)",
    borderWidth: 1.5,
    borderColor: "#00E5FF",
    width: 46,
    height: 46,
    borderRadius: 23,
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

  // ── Lightbox Zoom & Pan Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(4, 9, 18, 0.96)",
    justifyContent: "space-between",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "rgba(9, 18, 34, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "#1B2E4B",
    zIndex: 10,
  },
  modalHeaderInfo: {
    flex: 1,
    marginRight: 16,
  },
  modalBrandText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  modalSubText: {
    fontSize: 11.5,
    color: "#7A9BBF",
    marginTop: 2,
  },
  modalHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  zoomBadgePill: {
    backgroundColor: "#00E5FF22",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#00E5FF66",
  },
  zoomBadgeText: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "800",
  },
  modalCloseBtn: {
    backgroundColor: "#E11D48",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    cursor: "pointer",
  },
  modalCloseBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  modalViewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  modalImage: {
    width: "90%",
    height: "90%",
  },
  modalControlsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "rgba(9, 18, 34, 0.96)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#1B2E4B",
    zIndex: 10,
  },
  controlGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#13223B",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E365D",
    padding: 4,
    gap: 4,
  },
  controlBtn: {
    backgroundColor: "#1E365D",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
  controlBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  controlBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  controlScaleIndicator: {
    paddingHorizontal: 10,
    minWidth: 54,
    alignItems: "center",
  },
  controlScaleText: {
    color: "#00E5FF",
    fontSize: 12,
    fontWeight: "900",
  },
  controlIconBtn: {
    backgroundColor: "#1E365D",
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 6,
    cursor: "pointer",
  },
  controlIconText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  resetBtn: {
    backgroundColor: "#22D3EE22",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#22D3EE55",
    cursor: "pointer",
  },
  resetBtnText: {
    color: "#22D3EE",
    fontSize: 12,
    fontWeight: "800",
  },

  // ── PDF Card Container (Matches exact UI from user screenshot) ──
  pdfCardContainer: {
    backgroundColor: "#0B1526",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#10B98155",
    padding: 14,
    marginBottom: 16,
  },
  pdfCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 10,
  },
  pdfCardIcon: {
    fontSize: 22,
    marginTop: 1,
  },
  pdfCardHeaderText: {
    flex: 1,
  },
  pdfCardTitle: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  pdfCardSub: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  pdfButtonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    cursor: "pointer",
    minHeight: 40,
    flexGrow: 1,
  },
  pdfBtnView: {
    backgroundColor: "#13233C",
    borderColor: "#1D4ED8",
  },
  pdfBtnViewText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
  },
  pdfBtnEmail: {
    backgroundColor: "#10B981",
    borderColor: "#059669",
  },
  pdfBtnEmailText: {
    color: "#062817",
    fontSize: 12,
    fontWeight: "900",
  },
  pdfBtnReplace: {
    backgroundColor: "#1E293B",
    borderColor: "#334155",
  },
  pdfBtnReplaceText: {
    color: "#E2E8F0",
    fontSize: 11.5,
    fontWeight: "800",
  },
  pdfBtnDelete: {
    backgroundColor: "#2A141A",
    borderColor: "#7F1D1D",
  },
  pdfBtnDeleteText: {
    color: "#F87171",
    fontSize: 11.5,
    fontWeight: "800",
  },
  pdfBtnUpload: {
    backgroundColor: "#0284C7",
    borderColor: "#0369A1",
    width: "100%",
  },
  pdfBtnUploadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  // ── Email Modal Styles ──
  emailModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  emailModalBox: {
    backgroundColor: "#141C2E",
    borderRadius: 14,
    width: "100%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "#1E2E4A",
    overflow: "hidden",
  },
  emailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2E4A",
    backgroundColor: "#0D1524",
  },
  emailModalTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  emailModalCloseText: {
    color: "#94A3B8",
    fontSize: 18,
    fontWeight: "700",
    cursor: "pointer",
  },
  attachmentBadge: {
    backgroundColor: "#0B1526",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E2E4A",
    marginBottom: 14,
  },
  emailInputLabel: {
    color: "#94A3B8",
    fontSize: 11.5,
    fontWeight: "700",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  emailInput: {
    backgroundColor: "#0B1526",
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#1E2E4A",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    marginBottom: 14,
  },
  emailModalButtonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  emailModalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  emailCancelBtn: {
    backgroundColor: "#1E2E4A",
  },
  emailCancelBtnText: {
    color: "#94A3B8",
    fontWeight: "700",
    fontSize: 12,
  },
  emailSendBtn: {
    backgroundColor: "#10B981",
  },
  emailSendBtnText: {
    color: "#062817",
    fontWeight: "900",
    fontSize: 12,
  },

  // ── PDF Card Icon Box ──
  pdfCardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#10B98122",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#10B98144",
  },

  // ── PDF Status Pills ──
  pdfTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 4,
  },
  pdfStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  pdfStatusPillOk: {
    backgroundColor: "#10B98118",
    borderColor: "#10B98155",
  },
  pdfStatusPillWait: {
    backgroundColor: "#F59E0B18",
    borderColor: "#F59E0B55",
  },
  pdfStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  pdfStatusPillTextOk: {
    color: "#10B981",
  },
  pdfStatusPillTextWait: {
    color: "#F59E0B",
  },

  // ── PDF Buttons Container ──
  pdfButtonsContainer: {
    gap: 8,
  },
  pdfPrimaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  pdfSecondaryRow: {
    flexDirection: "row",
    gap: 8,
  },

  // ── Luxury Button: Visualizza PDF ──
  btnVisualizzaLux: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0F2044",
    borderWidth: 1.5,
    borderColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    cursor: "pointer",
  },
  btnVisualizzaTitle: {
    color: "#60A5FA",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  btnVisualizzaSub: {
    color: "#3B82F6",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },

  // ── Luxury Button: Invia Email al Cliente ──
  btnEmailLux: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#062817",
    borderWidth: 1.5,
    borderColor: "#10B981",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
    cursor: "pointer",
  },
  btnEmailTitle: {
    color: "#34D399",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  btnEmailSub: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 1,
  },

  // ── Luxury Button: Sostituisci PDF ──
  btnSecondaryLux: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#111D31",
    borderWidth: 1.5,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    cursor: "pointer",
  },
  btnSecondaryIcon: {
    fontSize: 14,
  },
  btnSecondaryText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Luxury Button: Rimuovi PDF (Red) ──
  btnDeleteLux: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#2A0E11",
    borderWidth: 1.5,
    borderColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    cursor: "pointer",
  },
  btnDeleteIcon: {
    fontSize: 14,
  },
  btnDeleteText: {
    color: "#F87171",
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Luxury Big Upload Button (when no PDF) ──
  btnUploadBigLux: {
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#06213A",
    borderWidth: 2,
    borderColor: "#0284C7",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    shadowColor: "#0284C7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    cursor: "pointer",
    borderStyle: "dashed",
  },
  btnUploadBigIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#0284C722",
    borderWidth: 2,
    borderColor: "#0284C788",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  btnUploadBigIcon: {
    fontSize: 24,
  },
  btnUploadBigTitle: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  btnUploadBigSub: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },

  // ── Shared icon circles for buttons ──
  btnIconCircleBlue: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563EB22",
    borderWidth: 1,
    borderColor: "#2563EB55",
    alignItems: "center",
    justifyContent: "center",
  },
  btnIconCircleGreen: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B98122",
    borderWidth: 1,
    borderColor: "#10B98155",
    alignItems: "center",
    justifyContent: "center",
  },
  btnIconText: {
    fontSize: 16,
  },
  btnTextCol: {
    flex: 1,
  },
});