import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
  Alert,
  Linking,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SegnalatoreScreen({ navigation, route }) {
  const { user, token, isAdminPreview, previewSegnalatore } = route.params || {};
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Segnalatore starts on the First Page with the beautiful "Segnalatore" button,
  // or if Admin clicked a specific Segnalatore from AdminSegnalatoriScreen, opens QR view directly.
  const [showQrPage, setShowQrPage] = useState(Boolean(previewSegnalatore));

  React.useEffect(() => {
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

  const displayName =
    previewSegnalatore?.cognome_nome ||
    user?.name ||
    'Autoscuola Pistoiese';
  const personalCode =
    previewSegnalatore?.full_code ||
    user?.venditore_code ||
    '20C';

  // Public QR Destination URL: opens the client Quote Request page with code attached
  const qrTargetUrl = `https://rossomandi-auto-srl.vercel.app/preventivo-qr?codice=${encodeURIComponent(
    personalCode
  )}&nome=${encodeURIComponent(displayName)}`;

  // High-res scannable QR Code image URL
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=340x340&margin=12&data=${encodeURIComponent(
    qrTargetUrl
  )}`;

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

  const handleShareWhatsApp = () => {
    const msg = `Ciao! Scansiona il QR Code o clicca qui per richiedere il tuo preventivo auto con il Codice Segnalatore ${personalCode} (${displayName}):\n${qrTargetUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(waUrl).catch(() => {});
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
          {showQrPage && !previewSegnalatore && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setShowQrPage(false)}
            >
              <Text style={styles.backBtnText}>← Indietro</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>
              {isAdminPreview ? '← Torna a Lista Admin' : '🚪 Esci'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ═══════════════════════════════════════════════════════════════════
            FIRST PAGE WHEN SEGNALATORE LOGS IN:
            Shows ONLY the beautiful "Segnalatore" 3D Button (isolated portal)
           ═══════════════════════════════════════════════════════════════════ */}
        {!showQrPage ? (
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
                onPress={() => setShowQrPage(true)}
              >
                <View style={styles.segnalatoreButtonInner}>
                  <Text style={styles.segnalatoreButtonEmoji}>📣</Text>
                  <Text style={styles.segnalatoreButtonText}>Segnalatore</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════
             STEP 3 PAGE: SEGNALATORE PERSONAL CODE (BOLD) & SCANNABLE QR CODE
             ═══════════════════════════════════════════════════════════════════ */
          <View style={styles.qrCard}>
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
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrHintText}>
                Fai scansionare questo QR Code al cliente con la fotocamera del telefono per richiedere un preventivo con il codice{' '}
                <Text style={{ fontWeight: '900', color: '#111827' }}>{personalCode}</Text>
              </Text>
            </View>

            {/* Direct Action Buttons */}
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
                📲 Condividi QR / Link su WhatsApp
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    gap: 10,
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
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
    padding: 20,
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
    padding: 28,
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
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 18,
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
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  codeBadgeValue: {
    fontSize: 32,
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
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  qrImage: {
    width: 240,
    height: 240,
    marginBottom: 12,
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
    paddingVertical: 15,
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  whatsappBtnText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
});
