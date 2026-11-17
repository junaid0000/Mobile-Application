import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function SegnalatoreDashboard({ navigation, route }) {
  const { user, token, isAdminPreview } = route.params || {};
  const [clubProfile, setClubProfile] = useState(null);

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${BASE_URL}/api/club/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.clubProfile) {
          setClubProfile(res.data.clubProfile);
        }
      })
      .catch(() => {});
  }, [token]);

  const displayName = clubProfile?.person_name || user?.name || 'Collaboratore';
  const personalCode = clubProfile?.code || user?.venditore_code || '17754654';
  const shareUrl = `https://rossomandi-auto-srl.vercel.app/?codice=${encodeURIComponent(personalCode)}`;

  const handleCopyLink = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      window.alert(`Link personale copiato:\n${shareUrl}`);
    } else {
      Alert.alert('Link Personale', `Il tuo link da condividere:\n${shareUrl}`);
    }
  };

  const handleShareWhatsApp = () => {
    const msg = `Ciao! Ecco il mio codice personale Rossomandi Club (${personalCode}): ${shareUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(waUrl).catch(() => {});
  };

  const handleLogout = () => {
    if (isAdminPreview) {
      navigation.goBack();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView style={styles.pageBg}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.mainCard}>
          {/* Top Brand Header */}
          <View style={styles.topBrandBar}>
            <View style={styles.brandLeft}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle}>Rossomandi Auto</Text>
            </View>

            {isAdminPreview && (
              <TouchableOpacity style={styles.adminBackBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.adminBackBtnText}>← Torna alla Gestione Admin</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Main Area Personale Box matching Image 2 */}
          <View style={styles.areaPersonaleBox}>
            <Text style={styles.areaPersonaleTag}>AREA PERSONALE</Text>
            <Text style={styles.clubHeading}>Il mio Rossomandi Club</Text>
            <Text style={styles.greetingText}>
              Ciao, <Text style={{ fontWeight: '800' }}>{displayName}</Text>
            </Text>

            <Text style={styles.codeLabel}>Il mio codice personale</Text>
            <View style={styles.codeDisplayBox}>
              <Text style={styles.codeDisplayText}>{personalCode}</Text>
            </View>

            <TouchableOpacity style={styles.redPrimaryBtn} onPress={handleCopyLink} activeOpacity={0.88}>
              <Text style={styles.redPrimaryBtnText}>Copia link personale</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.outlineBtn} onPress={handleShareWhatsApp} activeOpacity={0.85}>
              <Text style={styles.outlineBtnText}>Condividi su WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => navigation.navigate('PortalShowcase', { user, token })}
              activeOpacity={0.85}
            >
              <Text style={styles.outlineBtnText}>Richiedi un preventivo per me</Text>
            </TouchableOpacity>

            <Text style={styles.clientsSectionTitle}>Clienti collegati al mio codice</Text>
            <Text style={styles.clientsEmptyText}>
              Non ci sono ancora richieste collegate al tuo codice in questo browser.
            </Text>

            <TouchableOpacity style={[styles.outlineBtn, { marginTop: 14 }]} onPress={handleLogout}>
              <Text style={styles.outlineBtnText}>
                {isAdminPreview ? 'Torna al Pannello Admin' : 'Esci dal mio Club'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pageBg: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  mainCard: {
    width: '100%',
    maxWidth: 820,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  topBrandBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 22,
  },
  brandLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  adminBackBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  adminBackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  areaPersonaleBox: {
    paddingHorizontal: 6,
  },
  areaPersonaleTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC002E',
    letterSpacing: 1,
    marginBottom: 4,
  },
  clubHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  greetingText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  codeDisplayBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 22,
    alignItems: 'center',
    marginBottom: 14,
  },
  codeDisplayText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1,
  },
  redPrimaryBtn: {
    backgroundColor: '#DC002E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  redPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  outlineBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  outlineBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  clientsSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 14,
    marginBottom: 4,
  },
  clientsEmptyText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
