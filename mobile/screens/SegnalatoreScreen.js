import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

// Visual 4-Step Progress Diagram Component (25% -> 50% -> 75% -> 100%) for each individual client
function ClientProgressDiagramCard({ item, isSmallPhone }) {
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
      active: progress === 25,
    },
    {
      pct: '50%',
      label: 'Preventivo',
      sub: item.preventivo_data || 'In attesa',
      done: step2Done,
      active: progress === 50,
    },
    {
      pct: '75%',
      label: 'Finanziamento',
      sub: item.approvazione_finanziamento || 'In attesa',
      done: step3Done,
      active: progress === 75,
    },
    {
      pct: '100%',
      label: 'Consegna',
      sub: item.consegne || 'In attesa',
      done: step4Done,
      active: progress === 100,
    },
  ];

  return (
    <View style={[styles.clientDiagramCard, isSmallPhone && { padding: 14 }]}>
      {/* Top Row: Client Cognome e Nome + Overall Percentage Pill */}
      <View style={styles.clientCardHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.clientLabelSmall}>CLIENTE SEGNALATO</Text>
          <Text style={styles.clientFullName}>{item.client_name}</Text>
          {item.client_phone || item.indice ? (
            <Text style={styles.clientMetaSub}>
              {item.indice ? `Pratica #${item.indice}` : ''}
              {item.indice && item.client_phone ? ' • ' : ''}
              {item.client_phone ? `📞 ${item.client_phone}` : ''}
            </Text>
          ) : null}
        </View>

        <View style={[styles.pctBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.pctBadgeText, { color: badgeColor }]}>
            {progress}% {progress === 100 ? '✓ Completato' : 'In corso'}
          </Text>
        </View>
      </View>

      {/* Smooth Horizontal Progress Bar (25% -> 50% -> 75% -> 100%) */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${progress}%`, backgroundColor: barFillColor },
          ]}
        />
      </View>

      {/* 4-Stage Visual Diagram Nodes */}
      <View style={styles.stepsDiagramRow}>
        {steps.map((st, idx) => (
          <View key={st.pct} style={styles.stepNodeCol}>
            <View
              style={[
                styles.stepCircle,
                st.done && { backgroundColor: barFillColor, borderColor: barFillColor },
                st.active && styles.stepCircleActiveGlow,
              ]}
            >
              <Text
                style={[
                  styles.stepCircleText,
                  st.done && { color: '#FFFFFF', fontWeight: '900' },
                ]}
              >
                {st.done ? '✓' : idx + 1}
              </Text>
            </View>
            <Text
              style={[
                styles.stepPctText,
                st.done && { color: barFillColor, fontWeight: '900' },
              ]}
            >
              {st.pct}
            </Text>
            <Text
              style={[
                styles.stepTitleText,
                st.done && { color: '#111827', fontWeight: '800' },
              ]}
              numberOfLines={1}
            >
              {st.label}
            </Text>
            <Text style={styles.stepDateSub} numberOfLines={1}>
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

  // Segnalatore starts on the First Page with the beautiful "Segnalatore" button,
  // or if Admin clicked a specific Segnalatore from AdminSegnalatoriScreen, opens QR view directly.
  // activeTab: 'home' (First page button) | 'qr' (Single QR Code Page) | 'history' (Client Progress Diagram Page)
  const [activeTab, setActiveTab] = useState(
    previewSegnalatore ? 'qr' : 'home'
  );
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Change Password Modal state
  const [passModalVisible, setPassModalVisible] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const displayName =
    previewSegnalatore?.cognome_nome ||
    user?.name ||
    'Autoscuola Pistoiese';
  const personalCode =
    previewSegnalatore?.full_code ||
    user?.venditore_code ||
    '20C';

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

  const fetchHistory = useCallback(async () => {
    if (!personalCode) return;
    try {
      setLoadingHistory(true);
      const res = await axios.get(
        `${BASE_URL}/api/segnalatori/history/${encodeURIComponent(personalCode)}`
      );
      if (res.data?.history) {
        setHistoryList(res.data.history);
      }
    } catch (err) {
      console.log('Notice fetching segnalatore history:', err.message);
    } finally {
      setLoadingHistory(false);
    }
  }, [personalCode]);

  useEffect(() => {
    if (activeTab === 'history' || activeTab === 'qr') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Short & clean QR / Form URL and App Install URL
  const qrFormUrl = `https://rossomandi-auto-srl.vercel.app/preventivo-qr?codice=${encodeURIComponent(
    personalCode
  )}`;
  const appMainUrl = 'https://rossomandi-auto-srl.vercel.app/';

  // High-res scannable QR Code image URL
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=12&data=${encodeURIComponent(
    qrFormUrl
  )}`;

  const showNotice = (title, msg) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleLogout = async () => {
    if (isAdminPreview) {
      navigation.goBack();
      return;
    }
    try {
      await AsyncStorage.removeItem('@active_auth_session');
    } catch (e) {}
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem('rossomandi_active_session');
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

  const handleChangePassword = async () => {
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      showNotice('Password troppo corta', 'Inserisci almeno 4 caratteri.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      showNotice('Errore', 'Le due password non coincidono.');
      return;
    }

    setSavingPass(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/api/segnalatori/change-password`,
        { newPassword: newPassword.trim() },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setPassModalVisible(false);
      setNewPassword('');
      setConfirmPassword('');
      showNotice('Successo', res.data?.message || 'Password modificata con successo!');
    } catch (err) {
      showNotice(
        'Errore',
        err.response?.data?.error || 'Impossibile aggiornare la password.'
      );
    } finally {
      setSavingPass(false);
    }
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

          {!isAdminPreview && (
            <TouchableOpacity
              style={styles.passBtn}
              onPress={() => setPassModalVisible(true)}
            >
              <Text style={styles.passBtnText}>🔑 Password</Text>
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
            Shows ONLY the beautiful "Segnalatore" 3D Button
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
            + New Button at the Bottom to Open Client History Progress Diagram
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'qr' && (
          <View style={[styles.qrCard, isSmallPhone && { padding: 20 }]}>
            <Text style={styles.areaTag}>AREA RISERVATA SEGNALATORE</Text>

            {/* Nome Segnalatore */}
            <Text style={styles.segnalatoreName}>{displayName}</Text>

            {/* Il mio codice personale (BOLD as requested) */}
            <Text style={styles.boldCodeLabel}>Il mio codice personale</Text>
            <View style={styles.codeBadgeBox}>
              <Text style={styles.codeBadgeValue}>{personalCode}</Text>
            </View>

            {/* Scannable QR Code Box */}
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

            {/* Button 1: Richiedi un preventivo per me */}
            <TouchableOpacity
              style={styles.redPrimaryBtn}
              onPress={handleOpenClientFormPreview}
              activeOpacity={0.88}
            >
              <Text style={styles.redPrimaryBtnText}>
                📋 Richiedi un preventivo per me ({personalCode})
              </Text>
            </TouchableOpacity>

            {/* Button 2: Condividi su WhatsApp (Short Message with App Link) */}
            <TouchableOpacity
              style={styles.whatsappBtn}
              onPress={handleShareWhatsApp}
              activeOpacity={0.85}
            >
              <Text style={styles.whatsappBtnText}>
                📲 Condividi su WhatsApp
              </Text>
            </TouchableOpacity>

            {/* Button 3 (NEW AT THE END): Open Client History & 25%-100% Progress Diagram */}
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
            VIEW 3: CLIENT HISTORY & 4-STAGE PROGRESS DIAGRAM (25% -> 50% -> 75% -> 100%)
            Synced from TrackingSegnalatori in Access + QR referrals
           ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'history' && (
          <View style={[styles.historyPageCard, isSmallPhone && { padding: 18 }]}>
            <View style={styles.historyTopBar}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.areaTag}>TRACKING SEGNALATORI</Text>
                <Text style={styles.historyPageTitle}>
                  Avanzamento Clienti • {displayName} ({personalCode})
                </Text>
              </View>

              <TouchableOpacity style={styles.refreshHistBtn} onPress={fetchHistory}>
                <Text style={styles.refreshHistBtnText}>↻ Aggiorna</Text>
              </TouchableOpacity>
            </View>

            {/* Legend Pill Bar explaining 25% -> 50% -> 75% -> 100% */}
            <View style={styles.legendBar}>
              <Text style={styles.legendItem}>🟢 <Text style={{ fontWeight: '800' }}>25%</Text> Richiesta BDC</Text>
              <Text style={styles.legendItem}>🔵 <Text style={{ fontWeight: '800' }}>50%</Text> Preventivo</Text>
              <Text style={styles.legendItem}>🟣 <Text style={{ fontWeight: '800' }}>75%</Text> Finanziamento</Text>
              <Text style={styles.legendItem}>🏆 <Text style={{ fontWeight: '800' }}>100%</Text> Consegna</Text>
            </View>

            {loadingHistory ? (
              <View style={styles.emptyHistoryBox}>
                <ActivityIndicator size="large" color="#DC002E" />
              </View>
            ) : historyList.length === 0 ? (
              <View style={styles.emptyHistoryBox}>
                <Text style={styles.emptyHistoryEmoji}>📊</Text>
                <Text style={styles.emptyHistoryTitle}>
                  Nessun cliente collegato al codice {personalCode}
                </Text>
                <Text style={styles.emptyHistoryDesc}>
                  Non appena un cliente scansiona il tuo QR Code o viene inserito in TrackingSegnalatori, vedrai qui il diagramma di avanzamento (25% → 50% → 75% → 100%).
                </Text>
              </View>
            ) : (
              <View style={{ width: '100%' }}>
                {historyList.map((item) => (
                  <ClientProgressDiagramCard
                    key={item.id}
                    item={item}
                    isSmallPhone={isSmallPhone}
                  />
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.whatsappBtn, { marginTop: 14 }]}
              onPress={() => setActiveTab('qr')}
              activeOpacity={0.85}
            >
              <Text style={styles.whatsappBtnText}>← Torna al mio QR Code ({personalCode})</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Change Password Modal for Segnalatore */}
      <Modal visible={passModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🔑 Modifica la tua Password</Text>
            <Text style={styles.modalSub}>
              Scegli una nuova password personale per accedere al tuo account Segnalatore ({personalCode}).
            </Text>

            <Text style={styles.modalLabel}>Nuova Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Inserisci nuova password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.modalLabel}>Conferma Nuova Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ripeti nuova password"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setPassModalVisible(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalCancelBtnText}>Annulla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleChangePassword}
                disabled={savingPass}
              >
                {savingPass ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Salva Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
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
  passBtn: {
    backgroundColor: 'rgba(56,189,248,0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  passBtnText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
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
  historyPageCard: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
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
  historyTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  historyPageTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#111827',
  },
  refreshHistBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshHistBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  legendBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 12,
    justifyContent: 'space-between',
  },
  legendItem: {
    fontSize: 11,
    color: '#334155',
  },
  emptyHistoryBox: {
    minHeight: 220,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHistoryEmoji: {
    fontSize: 38,
    marginBottom: 10,
  },
  emptyHistoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyHistoryDesc: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  clientDiagramCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  clientCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientLabelSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  clientFullName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  clientMetaSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pctBadgeText: {
    fontSize: 12,
    fontWeight: '900',
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  stepsDiagramRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepNodeCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActiveGlow: {
    transform: [{ scale: 1.08 }],
  },
  stepCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepPctText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
  },
  stepTitleText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
    marginTop: 1,
  },
  stepDateSub: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#DC002E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
