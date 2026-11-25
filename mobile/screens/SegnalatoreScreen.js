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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function SegnalatoreScreen({ navigation, route }) {
  const { user, token, isAdminPreview, previewSegnalatore } = route.params || {};
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallPhone = width < 390;
  const isCompactTable = width < 880;

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

  // activeTab: 'home' (First page button) | 'qr' (Single QR Code Page) | 'history' (Excel-Style Client Progress Table)
  const [activeTab, setActiveTab] = useState(
    previewSegnalatore ? 'qr' : 'home'
  );
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchClient, setSearchClient] = useState('');

  // Always fetch exact Segnalatore profile from backend using token
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

  // Session lock check on mount
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

  const completedCount = useMemo(
    () => historyList.filter((x) => (x.progress || 25) === 100).length,
    [historyList]
  );

  // Short & clean QR / Form URL and App Install URL
  const qrFormUrl = `https://rossomandi-auto-srl.vercel.app/preventivo-qr?codice=${encodeURIComponent(
    personalCode
  )}`;
  const appMainUrl = 'https://rossomandi-auto-srl.vercel.app/';

  // High-res scannable QR Code image URL
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

  // Short & Clean WhatsApp Share Message to Client (with Name, Code, Form URL, and App Link)
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

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW 3: EXCEL-STYLE PROFESSIONAL CLIENT PROGRESS TABLE
          (Compact, sleek table matching AdminSegnalatoriScreen)
         ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' ? (
        <View style={{ flex: 1 }}>
          {/* Sub-Header Toolbar with KPI Pills & Search */}
          <View style={styles.excelTopBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.excelTitle}>
                📊 Avanzamento Clienti • {displayName}{' '}
                <Text style={{ color: '#F87171' }}>({personalCode})</Text>
              </Text>
              <Text style={styles.excelSub}>
                25% Richiesta BDC → 50% Preventivo → 75% Finanziamento → 100% Consegna
              </Text>
            </View>

            <View style={styles.excelKpiGroup}>
              <View style={styles.kpiPill}>
                <Text style={styles.kpiLabel}>CLIENTI</Text>
                <Text style={styles.kpiValue}>{historyList.length}</Text>
              </View>
              <View style={[styles.kpiPill, styles.kpiPillGreen]}>
                <Text style={[styles.kpiLabel, { color: '#34D399' }]}>CONSEGNATI (100%)</Text>
                <Text style={[styles.kpiValue, { color: '#34D399' }]}>{completedCount}</Text>
              </View>
              <TouchableOpacity
                style={styles.excelRefreshBtn}
                onPress={() => fetchHistory(false)}
              >
                <Text style={styles.excelRefreshBtnText}>↻ Aggiorna</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Compact Search Bar */}
          <View style={styles.excelSearchSection}>
            <View style={styles.excelSearchBox}>
              <Text style={{ fontSize: 13, marginRight: 8 }}>🔍</Text>
              <TextInput
                style={styles.excelSearchInput}
                placeholder="Cerca cliente per Cognome Nome o N° Pratica..."
                placeholderTextColor="#64748B"
                value={searchClient}
                onChangeText={setSearchClient}
              />
              {searchClient.length > 0 && (
                <TouchableOpacity onPress={() => setSearchClient('')}>
                  <Text style={{ color: '#94A3B8', fontSize: 13, paddingHorizontal: 6 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Excel Data Grid */}
          <View style={styles.tableOuterPad}>
            <View style={styles.tableCard}>
              <ScrollView
                horizontal={isCompactTable}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1 }}
              >
                <View style={{ flex: 1, minWidth: isCompactTable ? 880 : '100%' }}>
                  {/* Table Header Row */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.thText, styles.colPratica]}>PRATICA</Text>
                    <Text style={[styles.thText, styles.colCliente]}>COGNOME E NOME CLIENTE</Text>
                    <Text style={[styles.thText, styles.colStep]}>25% RICHIESTA BDC</Text>
                    <Text style={[styles.thText, styles.colStep]}>50% PREVENTIVO</Text>
                    <Text style={[styles.thText, styles.colStep]}>75% FINANZIAMENTO</Text>
                    <Text style={[styles.thText, styles.colStep]}>100% CONSEGNA</Text>
                    <Text style={[styles.thText, styles.colProgress]}>AVANZAMENTO</Text>
                  </View>

                  {loadingHistory ? (
                    <View style={styles.emptyTableBox}>
                      <ActivityIndicator size="large" color="#38BDF8" />
                    </View>
                  ) : filteredClients.length === 0 ? (
                    <View style={styles.emptyTableBox}>
                      <Text style={styles.emptyTableText}>
                        Nessun cliente collegato al codice {personalCode}.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={{ flex: 1 }}>
                      {filteredClients.map((item, idx) => {
                        const isEven = idx % 2 === 0;
                        const progress = item.progress || 25;
                        const s1 = progress >= 25;
                        const s2 = progress >= 50;
                        const s3 = progress >= 75;
                        const s4 = progress >= 100;

                        const barColor =
                          progress === 100
                            ? '#10B981'
                            : progress === 75
                            ? '#8B5CF6'
                            : progress === 50
                            ? '#3B82F6'
                            : '#F59E0B';

                        const bdcDate = item.qr_date
                          ? new Date(item.qr_date).toLocaleDateString('it-IT')
                          : 'Registrata';

                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.tableRow,
                              isEven ? styles.tableRowEven : styles.tableRowOdd,
                            ]}
                          >
                            {/* 1. PRATICA / INDICE */}
                            <View style={[styles.tdCell, styles.colPratica]}>
                              <View style={styles.praticaChip}>
                                <Text style={styles.praticaChipText}>
                                  {item.indice ? `#${item.indice}` : 'QR'}
                                </Text>
                              </View>
                            </View>

                            {/* 2. COGNOME E NOME CLIENTE */}
                            <View style={[styles.tdCell, styles.colCliente]}>
                              <Text style={styles.clientNameCell} numberOfLines={1}>
                                {item.client_name}
                              </Text>
                              {item.client_phone ? (
                                <Text style={styles.clientPhoneSub} numberOfLines={1}>
                                  📞 {item.client_phone}
                                </Text>
                              ) : null}
                            </View>

                            {/* 3. 25% RICHIESTA BDC */}
                            <View style={[styles.tdCell, styles.colStep]}>
                              <View style={[styles.stepPill, s1 ? styles.stepPillDoneGreen : styles.stepPillPending]}>
                                <Text style={[styles.stepPillText, s1 ? { color: '#34D399' } : { color: '#64748B' }]}>
                                  {s1 ? `✓ ${bdcDate}` : '—'}
                                </Text>
                              </View>
                            </View>

                            {/* 4. 50% PREVENTIVO */}
                            <View style={[styles.tdCell, styles.colStep]}>
                              <View style={[styles.stepPill, s2 ? styles.stepPillDoneBlue : styles.stepPillPending]}>
                                <Text style={[styles.stepPillText, s2 ? { color: '#60A5FA' } : { color: '#64748B' }]}>
                                  {item.preventivo_data ? `✓ ${item.preventivo_data}` : s2 ? '✓ Completato' : 'In attesa'}
                                </Text>
                              </View>
                            </View>

                            {/* 5. 75% FINANZIAMENTO */}
                            <View style={[styles.tdCell, styles.colStep]}>
                              <View style={[styles.stepPill, s3 ? styles.stepPillDonePurple : styles.stepPillPending]}>
                                <Text style={[styles.stepPillText, s3 ? { color: '#C084FC' } : { color: '#64748B' }]}>
                                  {item.approvazione_finanziamento
                                    ? `✓ ${item.approvazione_finanziamento}`
                                    : s3
                                    ? '✓ Approvato'
                                    : 'In attesa'}
                                </Text>
                              </View>
                            </View>

                            {/* 6. 100% CONSEGNA */}
                            <View style={[styles.tdCell, styles.colStep]}>
                              <View style={[styles.stepPill, s4 ? styles.stepPillDoneEmerald : styles.stepPillPending]}>
                                <Text style={[styles.stepPillText, s4 ? { color: '#34D399' } : { color: '#64748B' }]}>
                                  {item.consegne ? `🏆 ${item.consegne}` : 'In attesa'}
                                </Text>
                              </View>
                            </View>

                            {/* 7. AVANZAMENTO (Compact Progress Bar + %) */}
                            <View style={[styles.tdCell, styles.colProgress]}>
                              <View style={styles.inlineProgressRow}>
                                <View style={styles.miniBarTrack}>
                                  <View
                                    style={[
                                      styles.miniBarFill,
                                      { width: `${progress}%`, backgroundColor: barColor },
                                    ]}
                                  />
                                </View>
                                <Text style={[styles.inlinePctText, { color: barColor }]}>
                                  {progress}%
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      ) : (
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
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
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,71,87,0.18)',
    borderWidth: 1,
    borderColor: '#FF4757',
    paddingHorizontal: 12,
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
    padding: 16,
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
  areaTag: {
    fontSize: 11,
    fontWeight: '900',
    color: '#DC002E',
    letterSpacing: 1.2,
    marginBottom: 6,
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
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
  },
  whatsappBtnText: {
    color: '#111827',
    fontSize: 14,
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

  // ── Excel-Style Table Styles for Avanzamento Clienti ──
  excelTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  excelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  excelSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  excelKpiGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  kpiPillGreen: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  excelRefreshBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  excelRefreshBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  excelSearchSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0B0F19',
  },
  excelSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
  },
  excelSearchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 12.5,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  tableOuterPad: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  tableCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  thText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableRowEven: {
    backgroundColor: '#111827',
  },
  tableRowOdd: {
    backgroundColor: '#151E2E',
  },
  tdCell: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  // Proportional Excel Columns
  colPratica: { width: 86 },
  colCliente: { flex: 1.4, minWidth: 175 },
  colStep: { flex: 1, minWidth: 125 },
  colProgress: { width: 155, paddingRight: 0 },

  praticaChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  praticaChipText: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '800',
  },
  clientNameCell: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  clientPhoneSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1,
  },
  stepPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  stepPillPending: {
    backgroundColor: 'rgba(100,116,139,0.08)',
    borderColor: 'rgba(100,116,139,0.2)',
  },
  stepPillDoneGreen: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderColor: 'rgba(16,185,129,0.35)',
  },
  stepPillDoneBlue: {
    backgroundColor: 'rgba(59,130,246,0.14)',
    borderColor: 'rgba(59,130,246,0.38)',
  },
  stepPillDonePurple: {
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderColor: 'rgba(139,92,246,0.38)',
  },
  stepPillDoneEmerald: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(16,185,129,0.5)',
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inlineProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniBarTrack: {
    flex: 1,
    height: 7,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  inlinePctText: {
    fontSize: 12,
    fontWeight: '900',
    width: 38,
    textAlign: 'right',
  },
  emptyTableBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableText: {
    color: '#64748B',
    fontSize: 13,
  },
});
