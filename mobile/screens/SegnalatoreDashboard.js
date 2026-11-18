import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

const PROVINCE_ITALIANE = [
  'Seleziona provincia',
  'AG - Agrigento', 'AL - Alessandria', 'AN - Ancona', 'AO - Aosta', 'AR - Arezzo',
  'AP - Ascoli Piceno', 'AT - Asti', 'AV - Avellino', 'BA - Bari', 'BT - Barletta-Andria-Trani',
  'BL - Belluno', 'BN - Benevento', 'BG - Bergamo', 'BI - Biella', 'BO - Bologna',
  'BZ - Bolzano', 'BS - Brescia', 'BR - Brindisi', 'CA - Cagliari', 'CL - Caltanissetta',
  'CB - Campobasso', 'CE - Caserta', 'CT - Catania', 'CZ - Catanzaro', 'CH - Chieti',
  'CO - Como', 'CS - Cosenza', 'CR - Cremona', 'KR - Crotone', 'CN - Cuneo',
  'EN - Enna', 'FM - Fermo', 'FE - Ferrara', 'FI - Firenze', 'FG - Foggia',
  'FC - Forlì-Cesena', 'FR - Frosinone', 'GE - Genova', 'GO - Gorizia', 'GR - Grosseto',
  'IM - Imperia', 'IS - Isernia', 'SP - La Spezia', "AQ - L'Aquila", 'LT - Latina',
  'LE - Lecce', 'LC - Lecco', 'LI - Livorno', 'LO - Lodi', 'LU - Lucca',
  'MC - Macerata', 'MN - Mantova', 'MS - Massa-Carrara', 'MT - Matera', 'ME - Messina',
  'MI - Milano', 'MO - Modena', 'MB - Monza e Brianza', 'NA - Napoli', 'NO - Novara',
  'NU - Nuoro', 'OR - Oristano', 'PD - Padova', 'PA - Palermo', 'PR - Parma',
  'PV - Pavia', 'PG - Perugia', 'PU - Pesaro e Urbino', 'PE - Pescara', 'PC - Piacenza',
  'PI - Pisa', 'PT - Pistoia', 'PN - Pordenone', 'PZ - Potenza', 'PO - Prato',
  'RG - Ragusa', 'RA - Ravenna', 'RC - Reggio Calabria', 'RE - Reggio Emilia', 'RI - Rieti',
  'RN - Rimini', 'RM - Roma', 'RO - Rovigo', 'SA - Salerno', 'SS - Sassari',
  'SV - Savona', 'SI - Siena', 'SR - Siracusa', 'SO - Sondrio', 'SU - Sud Sardegna',
  'TA - Taranto', 'TE - Teramo', 'TR - Terni', 'TO - Torino', 'TP - Trapani',
  'TN - Trento', 'TV - Treviso', 'TS - Trieste', 'UD - Udine', 'VA - Varese',
  'VE - Venezia', 'VB - Verbano-Cusio-Ossola', 'VC - Vercelli', 'VR - Verona', 'VV - Vibo Valentia',
  'VI - Vicenza', 'VT - Viterbo',
];

export default function SegnalatoreDashboard({ navigation, route }) {
  const { user, token, isAdminPreview } = route.params || {};
  const [clubProfile, setClubProfile] = useState(null);
  const [richieste, setRichieste] = useState([]);

  // View Mode: 'club' ("Il mio Rossomandi Club") | 'richiedi_preventivo' ("LA TUA RICHIESTA - Richiedi preventivo auto")
  const [activeView, setActiveView] = useState('club');

  // Form state for "LA TUA RICHIESTA - Richiedi preventivo auto"
  const [codiceSconto, setCodiceSconto] = useState('');
  const [scontoStatus, setScontoStatus] = useState(null); // { valid, message }
  const [reqNome, setReqNome] = useState('');
  const [reqTelefono, setReqTelefono] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqProvincia, setReqProvincia] = useState('');
  const [reqAutoDesiderata, setReqAutoDesiderata] = useState('');
  const [reqCodiceInvito, setReqCodiceInvito] = useState('');
  const [reqPrivacy, setReqPrivacy] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);

  const fetchMyClub = useCallback(() => {
    if (!token) return;
    axios
      .get(`${BASE_URL}/api/club/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (res.data?.clubProfile) {
          setClubProfile(res.data.clubProfile);
          if (!reqCodiceInvito && res.data.clubProfile.code) {
            setReqCodiceInvito(String(res.data.clubProfile.code));
          }
        }
        if (res.data?.richieste) {
          setRichieste(res.data.richieste);
        }
      })
      .catch(() => {});
  }, [token, reqCodiceInvito]);

  useEffect(() => {
    fetchMyClub();
  }, [fetchMyClub]);

  const displayName = clubProfile?.person_name || user?.name || "Alex D'Alise";
  const personalCode = clubProfile?.code || user?.venditore_code || '17754654';
  const shareUrl = `https://rossomandi-auto-srl.vercel.app/?codice=${encodeURIComponent(personalCode)}`;

  const showAlert = (title, msg) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

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

  const handleOpenRichiediPreventivo = () => {
    setReqCodiceInvito(personalCode);
    setReqNome(displayName);
    setReqEmail(clubProfile?.person_email || user?.email || '');
    setActiveView('richiedi_preventivo');
  };

  const handleVerificaSconto = async () => {
    const codeToVerify = codiceSconto.trim() || reqCodiceInvito.trim();
    if (!codeToVerify) {
      setScontoStatus({ valid: false, message: 'Inserisci un codice sconto da verificare.' });
      return;
    }
    try {
      const res = await axios.post(`${BASE_URL}/api/club/verify-code`, { code: codeToVerify });
      setScontoStatus(res.data);
    } catch (err) {
      setScontoStatus({ valid: false, message: 'Errore durante la verifica del codice.' });
    }
  };

  const handleSubmitRichiesta = async () => {
    if (!reqNome.trim() || !reqTelefono.trim() || !reqEmail.trim()) {
      showAlert('Campi obbligatori', 'Compila Nome e cognome, Telefono ed Email.');
      return;
    }
    if (!reqPrivacy) {
      showAlert(
        'Informativa Privacy',
        "Conferma di aver letto l'informativa privacy e autorizza il contatto per questa richiesta."
      );
      return;
    }

    setSubmittingReq(true);
    try {
      await axios.post(`${BASE_URL}/api/club/richiesta-preventivo`, {
        request_type: 'preventivo_personale',
        segnalatore_code: reqCodiceInvito.trim() || personalCode,
        segnalatore_email: clubProfile?.person_email || user?.email || null,
        discount_code: codiceSconto.trim() || reqCodiceInvito.trim() || personalCode,
        client_name: reqNome.trim(),
        client_phone: reqTelefono.trim(),
        client_email: reqEmail.trim(),
        provincia: reqProvincia,
        car_details: reqAutoDesiderata.trim(),
      });

      showAlert('Richiesta registrata', 'La tua richiesta di preventivo auto è stata registrata con successo!');
      setReqAutoDesiderata('');
      fetchMyClub();
      setActiveView('club');
    } catch (err) {
      showAlert('Errore', err.response?.data?.error || 'Errore durante la registrazione della richiesta.');
    } finally {
      setSubmittingReq(false);
    }
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
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {isAdminPreview && (
                <TouchableOpacity style={styles.adminBackBtn} onPress={() => navigation.goBack()}>
                  <Text style={styles.adminBackBtnText}>← Admin</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.userIconCircle}
                onPress={() => setActiveView('club')}
              >
                <Text style={{ fontSize: 15, color: '#111827' }}>♟</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════════════
              VIEW 1: IL MIO ROSSOMANDI CLUB (Main Area Personale)
             ════════════════════════════════════════════════════════════════ */}
          {activeView === 'club' && (
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
                onPress={handleOpenRichiediPreventivo}
                activeOpacity={0.85}
              >
                <Text style={styles.outlineBtnText}>Richiedi un preventivo per me</Text>
              </TouchableOpacity>

              <Text style={styles.clientsSectionTitle}>Clienti collegati al mio codice</Text>
              {richieste.length === 0 ? (
                <Text style={styles.clientsEmptyText}>
                  Non ci sono ancora richieste collegate al tuo codice in questo browser.
                </Text>
              ) : (
                richieste.map((item) => (
                  <View key={item.id} style={styles.richiestaCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.richiestaName}>{item.client_name}</Text>
                      <Text style={styles.richiestaSub}>
                        {item.client_phone} • {item.client_email}{' '}
                        {item.provincia ? `(${item.provincia})` : ''}
                      </Text>
                      {item.car_details ? (
                        <Text style={styles.richiestaAuto}>🚗 {item.car_details}</Text>
                      ) : null}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        item.contract_signed && styles.statusBadgeGreen,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          item.contract_signed && styles.statusBadgeTextGreen,
                        ]}
                      >
                        {item.contract_signed ? '✅ Contratto Firmato' : '⏳ In corso'}
                      </Text>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity style={[styles.outlineBtn, { marginTop: 14 }]} onPress={handleLogout}>
                <Text style={styles.outlineBtnText}>
                  {isAdminPreview ? 'Torna al Pannello Admin' : 'Esci dal mio Club'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ════════════════════════════════════════════════════════════════
              VIEW 2: LA TUA RICHIESTA — Richiedi preventivo auto
              (Exact page when clicking "Richiedi un preventivo per me")
             ════════════════════════════════════════════════════════════════ */}
          {activeView === 'richiedi_preventivo' && (
            <View style={styles.richiestaFormBox}>
              <Text style={styles.areaPersonaleTag}>LA TUA RICHIESTA</Text>
              <Text style={styles.clubHeading}>Richiedi preventivo auto</Text>
              <Text style={styles.richiestaSubHeading}>
                Richiesta di preventivo auto senza costo di invio. I benefit Club richiedono un codice valido.
              </Text>

              {/* Codice sconto + Verifica sconto */}
              <Text style={styles.fieldLabel}>Codice sconto</Text>
              <View style={styles.scontoRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                  placeholder="Inserisci codice"
                  placeholderTextColor="#9CA3AF"
                  value={codiceSconto}
                  onChangeText={setCodiceSconto}
                />
                <TouchableOpacity style={styles.verificaScontoBtn} onPress={handleVerificaSconto}>
                  <Text style={styles.verificaScontoBtnText}>Verifica sconto</Text>
                </TouchableOpacity>
              </View>

              {scontoStatus && (
                <Text
                  style={[
                    styles.scontoFeedbackText,
                    { color: scontoStatus.valid ? '#16A34A' : '#DC2626' },
                  ]}
                >
                  {scontoStatus.message}
                </Text>
              )}

              {/* Nome e cognome */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Nome e cognome</Text>
              <TextInput
                style={styles.input}
                value={reqNome}
                onChangeText={setReqNome}
              />

              {/* Telefono */}
              <Text style={styles.fieldLabel}>Telefono</Text>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                value={reqTelefono}
                onChangeText={setReqTelefono}
              />

              {/* Email */}
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                value={reqEmail}
                onChangeText={setReqEmail}
              />

              {/* Provincia Dropdown */}
              <Text style={styles.fieldLabel}>Provincia</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.webSelectWrapper}>
                  <select
                    value={reqProvincia}
                    onChange={(e) => setReqProvincia(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '14px',
                      color: '#111827',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    {PROVINCE_ITALIANE.map((prov) => (
                      <option key={prov} value={prov === 'Seleziona provincia' ? '' : prov}>
                        {prov}
                      </option>
                    ))}
                  </select>
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Seleziona provincia (es. PO, FI, MI)"
                  placeholderTextColor="#9CA3AF"
                  value={reqProvincia}
                  onChangeText={setReqProvincia}
                />
              )}

              {/* Auto desiderata / informazioni utili */}
              <Text style={styles.fieldLabel}>Auto desiderata / informazioni utili</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Marca, modello, permuta, esigenze..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={reqAutoDesiderata}
                onChangeText={setReqAutoDesiderata}
              />

              {/* Codice invito (facoltativo per richieste senza invito) */}
              <Text style={styles.fieldLabel}>Codice invito (facoltativo per richieste senza invito)</Text>
              <TextInput
                style={styles.input}
                value={reqCodiceInvito}
                onChangeText={setReqCodiceInvito}
              />

              {/* Privacy Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setReqPrivacy(!reqPrivacy)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, reqPrivacy && styles.checkboxBoxChecked]}>
                  {reqPrivacy && <Text style={styles.checkboxTick}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Confermo di aver letto l'informativa privacy e autorizzo il contatto per questa richiesta.
                </Text>
              </TouchableOpacity>

              {/* Red Submit Button */}
              <TouchableOpacity
                style={styles.redPrimaryBtn}
                onPress={handleSubmitRichiesta}
                disabled={submittingReq}
                activeOpacity={0.88}
              >
                {submittingReq ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.redPrimaryBtnText}>Registra richiesta nella demo</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.demoFooterNote}>
                Demo: nessuna richiesta viene inviata a Rossomandi, nessun file viene caricato sul server e nessun pagamento viene effettuato.
              </Text>

              <TouchableOpacity
                style={[styles.outlineBtn, { marginTop: 14 }]}
                onPress={() => setActiveView('club')}
              >
                <Text style={styles.outlineBtnText}>← Torna al mio Rossomandi Club</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar matching screenshot: Home | Il mio Club | Altro */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity
          style={[styles.bottomNavTab, activeView === 'richiedi_preventivo' && styles.bottomNavTabActive]}
          onPress={() => setActiveView('richiedi_preventivo')}
        >
          <Text style={styles.bottomNavIcon}>⌂</Text>
          <Text style={styles.bottomNavLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomNavTab, activeView === 'club' && styles.bottomNavTabActive]}
          onPress={() => setActiveView('club')}
        >
          <Text style={styles.bottomNavIcon}>▤</Text>
          <Text style={styles.bottomNavLabel}>Il mio Club</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={handleLogout}
        >
          <Text style={styles.bottomNavIcon}>☷</Text>
          <Text style={styles.bottomNavLabel}>Altro</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 90,
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
  userIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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
  richiestaFormBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
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
  richiestaSubHeading: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
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
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    marginBottom: 14,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  webSelectWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 14,
    overflow: 'hidden',
  },
  scontoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificaScontoBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  verificaScontoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  scontoFeedbackText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxBoxChecked: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
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
  demoFooterNote: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
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
    marginBottom: 8,
  },
  clientsEmptyText: {
    fontSize: 12,
    color: '#6B7280',
  },
  richiestaCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  richiestaName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  richiestaSub: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  richiestaAuto: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
  },
  statusBadgeTextGreen: {
    color: '#15803D',
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 58,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  bottomNavTab: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  bottomNavTabActive: {
    borderWidth: 1.5,
    borderColor: '#111827',
  },
  bottomNavIcon: {
    fontSize: 15,
    color: '#374151',
  },
  bottomNavLabel: {
    fontSize: 10,
    color: '#374151',
    marginTop: 2,
  },
});
