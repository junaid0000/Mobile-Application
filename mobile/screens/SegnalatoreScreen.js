import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
  Linking,
  useWindowDimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

// Compact, Sleek Row-Style Progress Diagram Card (with visual progress line & 4 percentage nodes)
function CompactClientDiagramRow({ item, idx }) {
  const progress = item.progress || 25;
  const step1Done = progress >= 25;
  const step2Done = progress >= 50;
  const step3Done = progress >= 75;
  const step4Done = progress >= 100;

  const badgeBg =
    progress === 100
      ? '#DCFCE7'
      : progress === 75
      ? '#EDE9FE'
      : progress === 50
      ? '#DBEAFE'
      : '#FEF3C7';

  const badgeColor =
    progress === 100
      ? '#15803D'
      : progress === 75
      ? '#6D28D9'
      : progress === 50
      ? '#1D4ED8'
      : '#B45309';

  const barFillColor =
    progress === 100
      ? '#16A34A'
      : progress === 75
      ? '#7C3AED'
      : progress === 50
      ? '#2563EB'
      : '#F59E0B';

  const steps = [
    {
      pct: '25%',
      label: 'Richiesta BDC',
      sub: item.qr_date
        ? new Date(item.qr_date).toLocaleDateString('it-IT')
        : 'Inviata',
      done: step1Done,
    },
    {
      pct: '50%',
      label: 'Preventivo',
      sub: item.preventivo_data || 'In attesa',
      done: step2Done,
    },
    {
      pct: '75%',
      label: 'Finanziamento',
      sub: item.approvazione_finanziamento || 'In attesa',
      done: step3Done,
    },
    {
      pct: '100%',
      label: 'Consegna',
      sub: item.consegne || 'In attesa',
      done: step4Done,
    },
  ];

  const isEven = idx % 2 === 0;

  return (
    <View
      style={[
        styles.compactDiagramCard,
        { backgroundColor: isEven ? '#FFFFFF' : '#F8FAFC' },
      ]}
    >
      {/* Top Compact Row: Client Name + Pratica Chip on Left, Percentage Pill on Right */}
      <View style={styles.compactCardTop}>
        <View style={styles.compactNameRow}>
          <Text style={styles.compactClientName} numberOfLines={1}>
            {item.client_name}
          </Text>
          {item.indice ? (
            <View style={styles.compactPraticaBadge}>
              <Text style={styles.compactPraticaText}>#{item.indice}</Text>
            </View>
          ) : null}
          {item.client_phone ? (
            <Text style={styles.compactPhoneText}>📞 {item.client_phone}</Text>
          ) : null}
        </View>

        <View style={[styles.compactPctPill, { backgroundColor: badgeBg }]}>
          <Text style={[styles.compactPctPillText, { color: badgeColor }]}>
            {progress}% {progress === 100 ? '✓ Completato' : 'In corso'}
          </Text>
        </View>
      </View>

      {/* Sleek Visual Progress Line (25% -> 50% -> 75% -> 100%) */}
      <View style={styles.compactBarTrack}>
        <View
          style={[
            styles.compactBarFill,
            { width: `${progress}%`, backgroundColor: barFillColor },
          ]}
        />
      </View>

      {/* Compact 4-Step Nodes Row (Circle + % + Label + Date inline/compact) */}
      <View style={styles.compactStepsRow}>
        {steps.map((st, sIdx) => (
          <View key={st.pct} style={styles.compactStepCol}>
            <View style={styles.compactStepHeader}>
              <View
                style={[
                  styles.compactCircle,
                  st.done && {
                    backgroundColor: barFillColor,
                    borderColor: barFillColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.compactCircleText,
                    st.done && { color: '#FFFFFF', fontWeight: '900' },
                  ]}
                >
                  {st.done ? '✓' : sIdx + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.compactStepPct,
                  st.done && { color: barFillColor, fontWeight: '800' },
                ]}
              >
                {st.pct}
              </Text>
              <Text
                style={[
                  styles.compactStepLabel,
                  st.done && { color: '#0F172A', fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {st.label}
              </Text>
            </View>
            <Text
              style={[
                styles.compactStepDate,
                st.done && { color: '#475569', fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {st.sub}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SegnalatoreScreen({ navigation, route }) {
  const { user, token, isAdminPreview, previewSegnalatore } = route.params || {};
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallPhone = width < 390;

  // Resolve real user object even after browser F5 refresh
  const [resolvedUser, setResolvedUser] = useState(() => {
    if (user && typeof user === 'object' && user.name) return user;
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const cached = window.sessionStorage.getItem('rossomandi_active_user');
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState(
    previewSegnalatore ? 'qr' : 'home'
  );
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchClient, setSearchClient] = useState('');

  useEffect(() => {
    if (previewSegnalatore) return;
    const activeToken =
      token ||
      (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage
        ? window.sessionStorage.getItem('rossomandi_active_session')
        : null);
    if (!activeToken) return;
    axios
      .get(`${BASE_URL}/api/segnalatori/me`, {
        headers: { Authorization: `Bearer ${activeToken}` },
      })
      .then((res) => {
        if (res.data?.user) {
          setResolvedUser(res.data.user);
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
            window.sessionStorage.setItem('rossomandi_active_user', JSON.stringify(res.data.user));
          }
        }
      })
      .catch(() => {});
  }, [token, previewSegnalatore]);

  const displayName =
    previewSegnalatore?.cognome_nome ||
    resolvedUser?.name ||
    (user && typeof user === 'object' ? user.name : null) ||
    'Segnalatore';
  const personalCode =
    previewSegnalatore?.full_code ||
    resolvedUser?.venditore_code ||
    (user && typeof user === 'object' ? user.venditore_code : null) ||
    '';

  useEffect(() => {
    if (isAdminPreview) return;
    if (!token) {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      return;
    }
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
      const activeSession = window.sessionStorage.getItem('rossomandi_active_session');
      if (!activeSession) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }
  }, [token, isAdminPreview, navigation]);

  const fetchHistory = useCallback(async (isSilent = false) => {
    if (!personalCode) return;
    try {
      if (!isSilent) setLoadingHistory(true);
      const res = await axios.get(
        `${BASE_URL}/api/segnalatori/history/${encodeURIComponent(personalCode)}`
      );
      if (res.data?.history) {
        setHistoryList(res.data.history);
      }
    } catch (err) {
      console.log('Notice fetching segnalatore history:', err.message);
    } finally {
      if (!isSilent) setLoadingHistory(false);
    }
  }, [personalCode]);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'qr') {
      fetchHistory(false);
      const interval = setInterval(() => {
        fetchHistory(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, fetchHistory]);

  const filteredClients = useMemo(() => {
    const q = searchClient.toLowerCase().trim();
    if (!q) return historyList;
    return historyList.filter(
      (item) =>
        String(item.client_name || '').toLowerCase().includes(q) ||
        String(item.indice || '').toLowerCase().includes(q) ||
        String(item.client_phone || '').toLowerCase().includes(q)
    );
  }, [historyList, searchClient]);

  const qrFormUrl = `https://rossomandi-auto-srl.vercel.app/preventivo-qr?codice=${encodeURIComponent(
    personalCode
  )}`;
  const appMainUrl = 'https://rossomandi-auto-srl.vercel.app/';

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=12&data=${encodeURIComponent(
    qrFormUrl
  )}`;

  const handleLogout = async () => {
    if (isAdminPreview) {
      navigation.goBack();
      return;
    }
    try {
      await AsyncStorage.removeItem('@active_auth_session');
      await AsyncStorage.removeItem('@active_auth_user');
    } catch (e) {}
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('rossomandi_active_session');
      window.sessionStorage.removeItem('rossomandi_active_user');
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleShareWhatsApp = () => {
    const msg = `Ciao da ${displayName} (Codice: ${personalCode})!\nRichiedi preventivo: ${qrFormUrl}\nApp Rossomandi: ${appMainUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    } else {
      Linking.openURL(waUrl).catch(() => {});
    }
  };

  const handleOpenClientFormPreview = () => {
    navigation.navigate('QrPreventivo', {
      codice: personalCode,
      nome: displayName,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerBrand}>Rossomandi Auto</Text>
        </View>

        <View style={styles.headerRight}>
          {activeTab === 'history' && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setActiveTab('qr')}
            >
              <Text style={styles.backBtnText}>← Torna al QR</Text>
            </TouchableOpacity>
          )}
          {activeTab === 'qr' && !previewSegnalatore && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setActiveTab('home')}
            >
              <Text style={styles.backBtnText}>← Indietro</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>
              {isAdminPreview ? '← Lista Admin' : '🚪 Esci'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ═══════════════════════════════════════════════════════════════════
            VIEW 1: FIRST PAGE WHEN SEGNALATORE LOGS IN
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <View style={styles.firstPageCenter}>
            <View style={styles.bannerContainer}>
              <Image
                source={require('../assets/images/banner.png')}
                style={styles.bannerImage}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.welcomeTitle}>Benvenuto, {displayName}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Area Riservata Segnalatore • Codice{' '}
              <Text style={{ fontWeight: '900', color: '#FF4757' }}>{personalCode}</Text>
            </Text>

            <View style={[styles.buttonStack, { maxWidth: isMobile ? '88%' : 340, width: '100%' }]}>
              <TouchableOpacity
                style={styles.segnalatore3DButton}
                activeOpacity={0.85}
                onPress={() => setActiveTab('qr')}
              >
                <View style={styles.segnalatoreButtonInner}>
                  <Text style={styles.segnalatoreButtonEmoji}>📣</Text>
                  <Text style={styles.segnalatoreButtonText}>Segnalatore</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW 2: SINGLE CLEAN QR CODE PAGE
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'qr' && (
          <View style={[styles.qrCard, isSmallPhone && { padding: 20 }]}>
            <Text style={styles.areaTag}>AREA RISERVATA SEGNALATORE</Text>

            <Text style={styles.segnalatoreName}>{displayName}</Text>

            <Text style={styles.boldCodeLabel}>Il mio codice personale</Text>
            <View style={styles.codeBadgeBox}>
              <Text style={styles.codeBadgeValue}>{personalCode}</Text>
            </View>

            <View style={styles.qrFrame}>
              <Image
                source={{ uri: qrImageUrl }}
                style={[
                  styles.qrImage,
                  isSmallPhone && { width: 195, height: 195 },
                ]}
                resizeMode="contain"
              />
              <Text style={styles.qrHintText}>
                Fai scansionare questo QR Code al cliente con la fotocamera del telefono per richiedere un preventivo con il codice{' '}
                <Text style={{ fontWeight: '900', color: '#111827' }}>{personalCode}</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={styles.redPrimaryBtn}
              onPress={handleOpenClientFormPreview}
              activeOpacity={0.88}
            >
              <Text style={styles.redPrimaryBtnText}>
                📋 Richiedi un preventivo per me ({personalCode})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={handleShareWhatsApp}
              activeOpacity={0.85}
            >
              <Text style={styles.whatsappBtnText}>
                📲 Condividi su WhatsApp
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.historyDiagramBtn}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.88}
            >
              <Text style={styles.historyDiagramBtnText}>
                📊 Storico e Avanzamento Clienti ({historyList.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW 3: COMPACT PROFESSIONAL PROGRESS LINE DIAGRAM LIST
            (Same visual progress line & 4 percentage steps, but compact & sleek!)
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <View style={[styles.historyPageCard, isSmallPhone && { padding: 14 }]}>
            {/* Top Bar */}
            <View style={styles.historyTopBar}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.areaTag}>TRACKING SEGNALATORI</Text>
                <Text style={styles.historyPageTitle}>
                  Avanzamento Clienti • {displayName} ({personalCode})
                </Text>
              </View>

              <TouchableOpacity
                style={styles.refreshHistBtn}
                onPress={() => fetchHistory(false)}
              >
                <Text style={styles.refreshHistBtnText}>↻ Aggiorna</Text>
              </TouchableOpacity>
            </View>

            {/* Compact Legend & Search Bar Row */}
            <View style={styles.legendAndSearchRow}>
              <View style={styles.legendBar}>
                <Text style={styles.legendItem}>
                  🟢 <Text style={{ fontWeight: '800' }}>25%</Text> Richiesta BDC
                </Text>
                <Text style={styles.legendItem}>
                  🔵 <Text style={{ fontWeight: '800' }}>50%</Text> Preventivo
                </Text>
                <Text style={styles.legendItem}>
                  🟣 <Text style={{ fontWeight: '800' }}>75%</Text> Finanziamento
                </Text>
                <Text style={styles.legendItem}>
                  🏆 <Text style={{ fontWeight: '800' }}>100%</Text> Consegna
                </Text>
              </View>

              {historyList.length > 2 && (
                <View style={styles.compactSearchBox}>
                  <Text style={{ fontSize: 12, marginRight: 6 }}>🔍</Text>
                  <TextInput
                    style={styles.compactSearchInput}
                    placeholder="Cerca cliente o pratica..."
                    placeholderTextColor="#94A3B8"
                    value={searchClient}
                    onChangeText={setSearchClient}
                  />
                  {searchClient.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchClient('')}>
                      <Text style={{ fontSize: 12, color: '#64748B', paddingHorizontal: 4 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>

            {loadingHistory ? (
              <View style={styles.emptyHistoryBox}>
                <ActivityIndicator size="large" color="#DC002E" />
              </View>
            ) : filteredClients.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Text style={styles.emptyHistoryEmoji}>📊</Text>
                <Text style={styles.emptyHistoryTitle}>
                  Nessun cliente collegato al codice {personalCode}
                </Text>
                <Text style={styles.emptyHistoryDesc}>
                  Non appena un cliente scansiona il tuo QR Code o viene inserito in TrackingSegnalatori, vedrai qui la linea di avanzamento (25% → 50% → 75% → 100%).
                </Text>
              </View>
            ) : (
              <View style={styles.compactListContainer}>
                {filteredClients.map((item, idx) => (
                  <CompactClientDiagramRow
                    key={item.id}
                    item={item}
                    idx={idx}
                  />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.whatsappBtn, { marginTop: 12, marginBottom: 0 }]}
              onPress={() => setActiveTab('qr')}
              activeOpacity={0.85}
            >
              <Text style={styles.whatsappBtnText}>
                ← Torna al mio QR Code ({personalCode})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0E',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  headerBrand: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,71,87,0.18)',
    borderWidth: 1,
    borderColor: '#FF4757',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#FF4757',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  firstPageCenter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    width: '100%',
    maxWidth: 420,
    height: 150,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 28,
  },
  buttonStack: {
    alignItems: 'center',
  },
  segnalatore3DButton: {
    width: '100%',
    backgroundColor: '#1E1B2E',
    borderColor: '#FF4757',
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 24,
    shadowColor: '#FF4757',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  segnalatoreButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segnalatoreButtonEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  segnalatoreButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF4757',
    letterSpacing: 0.5,
  },
  qrCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 26,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  historyPageCard: {
    width: '100%',
    maxWidth: 920,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  areaTag: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC002E',
    letterSpacing: 1,
    marginBottom: 2,
  },
  segnalatoreName: {
    fontSize: 23,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  boldCodeLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeBadgeBox: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  codeBadgeValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 2,
  },
  qrFrame: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  qrImage: {
    width: 230,
    height: 230,
    marginBottom: 10,
  },
  qrHintText: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  redPrimaryBtn: {
    width: '100%',
    backgroundColor: '#DC002E',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  redPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  whatsappBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginBottom: 10,
  },
  whatsappBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  historyDiagramBtn: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 2,
  },
  historyDiagramBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
  },
  historyTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyPageTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
  },
  refreshHistBtn: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshHistBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  legendAndSearchRow: {
    marginBottom: 10,
    gap: 8,
  },
  legendBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 10,
    justifyContent: 'space-between',
  },
  legendItem: {
    fontSize: 11,
    color: '#334155',
  },
  compactSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 32,
  },
  compactSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  emptyHistoryBox: {
    minHeight: 180,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyHistoryDesc: {
    fontSize: 11.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 17,
  },

  // ── Compact Excel-Density Visual Progress Line Cards ──
  compactListContainer: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  compactDiagramCard: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  compactCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  compactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 8,
    paddingRight: 8,
  },
  compactClientName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  compactPraticaBadge: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  compactPraticaText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  compactPhoneText: {
    fontSize: 11,
    color: '#64748B',
  },
  compactPctPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  compactPctPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  compactBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  compactBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  compactStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactStepCol: {
    flex: 1,
    paddingRight: 4,
  },
  compactStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCircleText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
  },
  compactStepPct: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748B',
  },
  compactStepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  compactStepDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 22,
    marginTop: 1,
  },
});
