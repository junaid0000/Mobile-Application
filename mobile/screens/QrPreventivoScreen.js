import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function QrPreventivoScreen({ navigation, route }) {
  // Read code & name from route params or URL query string on web
  let initialCode = route?.params?.codice || '';
  let initialNome = route?.params?.nome || '';

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (!initialCode && params.get('codice')) initialCode = params.get('codice');
    if (!initialNome && params.get('nome')) initialNome = params.get('nome');
  }

  const [segnalatoreCode, setSegnalatoreCode] = useState(
    String(initialCode || '20C').toUpperCase()
  );
  const [segnalatoreName, setSegnalatoreName] = useState(
    initialNome || 'Partner Rossomandi'
  );
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (!segnalatoreCode) return;
    axios
      .get(`${BASE_URL}/api/segnalatori/public/${encodeURIComponent(segnalatoreCode)}`)
      .then((res) => {
        if (res.data?.segnalatore) {
          if (res.data.segnalatore.cognome_nome) {
            setSegnalatoreName(res.data.segnalatore.cognome_nome);
          }
          if (res.data.segnalatore.full_code) {
            setSegnalatoreCode(res.data.segnalatore.full_code);
          }
        }
      })
      .catch(() => {});
  }, [segnalatoreCode]);

  const showNotice = (title, msg) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleSendRequest = async () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      showNotice('Dati richiesti', 'Inserisci il tuo Nome e Cognome e il numero di Telefono.');
      return;
    }

    setSending(true);
    try {
      await axios.post(`${BASE_URL}/api/segnalatori/send-preventivo-request`, {
        segnalatore_code: segnalatoreCode,
        segnalatore_name: segnalatoreName,
        client_name: clientName.trim(),
        client_phone: clientPhone.trim(),
        client_email: clientEmail.trim(),
        message: message.trim(),
      });

      setSentSuccess(true);
      showNotice(
        'Richiesta Inviata!',
        `La tua richiesta di preventivo con Codice Segnalatore ${segnalatoreCode} è stata inviata al BDC Rossomandi Auto. Verrai ricontattato al più presto per fissare un appuntamento!`
      );
    } catch (err) {
      showNotice(
        'Errore',
        err.response?.data?.error || 'Impossibile inviare la richiesta. Riprova.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.pageBg}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle}>Rossomandi Auto</Text>
            </View>
            {navigation.canGoBack() && (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backBtnText}>← Indietro</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.tag}>RICHIESTA PREVENTIVO BDC</Text>
          <Text style={styles.heading}>Richiedi un preventivo per me</Text>

          {/* Segnalatore Code Banner (Attached automatically from QR) */}
          <View style={styles.codeBanner}>
            <View>
              <Text style={styles.codeBannerLabel}>CODICE SEGNALATORE ASSOCIATO</Text>
              <Text style={styles.codeBannerPartner}>{segnalatoreName}</Text>
            </View>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{segnalatoreCode}</Text>
            </View>
          </View>

          {sentSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successTitle}>Richiesta Inviata al BDC!</Text>
              <Text style={styles.successSub}>
                Codice Segnalatore: <Text style={{ fontWeight: '900' }}>{segnalatoreCode}</Text>
                {'\n'}Il nostro reparto BDC ti contatterà a breve per fissare il tuo appuntamento in sede.
              </Text>
              <TouchableOpacity
                style={[styles.redSubmitBtn, { marginTop: 18 }]}
                onPress={() => {
                  setSentSuccess(false);
                  setClientName('');
                  setClientPhone('');
                  setClientEmail('');
                  setMessage('');
                }}
              >
                <Text style={styles.redSubmitBtnText}>Invia un'altra richiesta</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.fieldLabel}>Nome e Cognome *</Text>
              <TextInput
                style={styles.input}
                placeholder="Inserisci il tuo nome e cognome"
                placeholderTextColor="#9CA3AF"
                value={clientName}
                onChangeText={setClientName}
              />

              <Text style={styles.fieldLabel}>Telefono *</Text>
              <TextInput
                style={styles.input}
                placeholder="Inserisci il tuo numero di telefono"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={clientPhone}
                onChangeText={setClientPhone}
              />

              <Text style={styles.fieldLabel}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="Inserisci la tua email"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={clientEmail}
                onChangeText={setClientEmail}
              />

              <Text style={styles.fieldLabel}>Auto desiderata / Messaggio per BDC</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Scrivi marca, modello o richiesta per il tuo preventivo..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={message}
                onChangeText={setMessage}
              />

              <TouchableOpacity
                style={styles.redSubmitBtn}
                onPress={handleSendRequest}
                disabled={sending}
                activeOpacity={0.88}
              >
                {sending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.redSubmitBtnText}>
                    ✉️ Invia Richiesta Preventivo ({segnalatoreCode})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
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
  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
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
  backBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC002E',
    letterSpacing: 1,
    marginBottom: 4,
  },
  heading: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 14,
  },
  codeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  codeBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.6,
  },
  codeBannerPartner: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
    marginTop: 2,
  },
  codePill: {
    backgroundColor: '#DC002E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  codePillText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  redSubmitBtn: {
    backgroundColor: '#DC002E',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  redSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  successBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 42,
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#16A34A',
    marginBottom: 6,
  },
  successSub: {
    fontSize: 13,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
  },
});
