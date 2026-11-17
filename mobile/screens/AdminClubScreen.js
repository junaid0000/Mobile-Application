import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

function generateRandomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass + '!';
}

// Exact Dropdown matching colleague's screenshot
function CustomDropdown({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const selectedObj = options.find((o) => o.value === value) || options[0];

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View
          style={[
            styles.webSelectWrapper,
            focused && styles.webSelectWrapperRed,
          ]}
        >
          <select
            value={value}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => onSelect(e.target.value)}
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
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 14, zIndex: open ? 100 : 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          open && styles.dropdownTriggerRed,
        ]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.85}
      >
        <Text style={styles.dropdownTriggerText}>{selectedObj?.label}</Text>
        <Text style={styles.dropdownChevron}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={styles.dropdownMenu}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                opt.value === value && styles.dropdownItemActive,
              ]}
              onPress={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.dropdownItemText,
                  opt.value === value && styles.dropdownItemTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AdminClubScreen({ navigation, route }) {
  const { user, token } = route.params || {};

  // 1. Tipo utente: ONLY 'segnalatore' | 'cliente'
  const [userType, setUserType] = useState('segnalatore');
  // 2. Segnalatore: ONLY 'privato' | 'azienda'
  const [subType, setSubType] = useState('privato');
  // 3. Tipo di azienda (when Segnalatore === 'azienda')
  const [tipoAzienda, setTipoAzienda] = useState('');

  // Common fields
  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState(() => generateRandomPassword());
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Dati aziendali stacked fields (when userType === 'segnalatore' && subType === 'azienda')
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [cap, setCap] = useState('');
  const [comune, setComune] = useState('');
  const [provincia, setProvincia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(
    'Password iniziale generata. Al salvataggio il segnalatore riceverà un link per scegliere la propria password.'
  );
  const [clubUsers, setClubUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const isAziendaMode = userType === 'segnalatore' && subType === 'azienda';

  const fetchClubUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await axios.get(`${BASE_URL}/api/club/admin/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.users) {
        setClubUsers(res.data.users);
      }
    } catch (err) {
      console.log('Notice fetching club users:', err.message);
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  useEffect(() => {
    fetchClubUsers();
  }, [fetchClubUsers]);

  const showNotice = (title, msg) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}: ${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleGeneratePassword = () => {
    const newPass = generateRandomPassword();
    setPassword(newPass);
    setStatusMessage(
      'Password iniziale generata. Al salvataggio il segnalatore riceverà un link per scegliere la propria password.'
    );
  };

  const handleSaveUser = async () => {
    if (!personName.trim() || !personEmail.trim() || !code.trim()) {
      showNotice('Campi obbligatori', 'Inserisci Nome e cognome, Email e Codice.');
      return;
    }

    if (isAziendaMode && !privacyChecked) {
      showNotice(
        'Informativa Privacy',
        "Spunta la casella per dichiarare di aver fornito al referente l'informativa privacy."
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_type: userType,
        sub_type: userType === 'segnalatore' ? subType : 'cliente',
        person_name: personName.trim(),
        person_email: personEmail.trim().toLowerCase(),
        code: code.trim(),
        password: userType === 'segnalatore' ? password.trim() : null,
        valid_until: validUntil.trim() || null,
        is_active: isActive,
        ragione_sociale: isAziendaMode ? ragioneSociale.trim() : null,
        partita_iva: isAziendaMode ? partitaIva.trim() : null,
        tipo_azienda: isAziendaMode ? tipoAzienda : null,
        indirizzo: isAziendaMode ? indirizzo.trim() : null,
        cap: isAziendaMode ? cap.trim() : null,
        comune: isAziendaMode ? comune.trim() : null,
        provincia: isAziendaMode ? provincia.trim() : null,
        telefono: isAziendaMode ? telefono.trim() : null,
      };

      const res = await axios.post(`${BASE_URL}/api/club/admin/create-user`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      setStatusMessage(
        res.data?.message || `Utente ${personName} salvato con codice ${code}!`
      );
      showNotice(
        'Salvato con successo',
        res.data?.message || `Utente ${personName} salvato con codice ${code}!`
      );

      setPersonName('');
      setPersonEmail('');
      setCode('');
      setPassword(generateRandomPassword());
      setValidUntil('');
      setRagioneSociale('');
      setPartitaIva('');
      setTipoAzienda('');
      setIndirizzo('');
      setCap('');
      setComune('');
      setProvincia('');
      setTelefono('');
      setPrivacyChecked(false);
      fetchClubUsers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Errore durante il salvataggio';
      showNotice('Errore', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (item) => {
    try {
      await axios.delete(`${BASE_URL}/api/club/admin/users/${item.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchClubUsers();
    } catch (err) {
      showNotice('Errore', 'Impossibile eliminare il segnalatore');
    }
  };

  return (
    <SafeAreaView style={styles.pageBg}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Main White Card Container matching screenshot */}
        <View style={styles.mainCard}>
          {/* Top Brand Bar */}
          <View style={styles.topBrandBar}>
            <View style={styles.brandLeft}>
              <Image
                source={require('../assets/images/logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
              <Text style={styles.brandTitle}>Rossomandi Auto</Text>
            </View>

            <View style={styles.topRightActions}>
              <TouchableOpacity
                style={styles.previewRoleBtn}
                onPress={() =>
                  navigation.navigate('SegnalatoreDashboard', {
                    user: {
                      ...user,
                      name: personName || user?.name || "Alex D'Alise",
                      venditore_code: code || '17754654',
                    },
                    token,
                    isAdminPreview: true,
                  })
                }
              >
                <Text style={styles.previewRoleBtnText}>Visualizza come</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.userIconCircle}
                onPress={() => navigation.goBack()}
              >
                <Text style={{ fontSize: 15, color: '#111827' }}>♟</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Box: Nuovo utente e codice associato */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Nuovo utente e codice associato</Text>
            <Text style={styles.sectionSub}>
              Scegli il tipo di utente. Per tutti i tipi di utente il codice viene inserito manualmente; per i segnalatori la password può essere generata.
            </Text>

            {/* DROPDOWN 1: Tipo utente (ONLY Segnalatore | Cliente) */}
            <CustomDropdown
              label="Tipo utente"
              value={userType}
              onSelect={(val) => setUserType(val)}
              options={[
                { label: 'Segnalatore', value: 'segnalatore' },
                { label: 'Cliente', value: 'cliente' },
              ]}
            />

            {/* DROPDOWN 2: Segnalatore (ONLY Privato | Azienda) — visible only when Tipo utente === 'segnalatore' */}
            {userType === 'segnalatore' && (
              <CustomDropdown
                label="Segnalatore"
                value={subType}
                onSelect={(val) => setSubType(val)}
                options={[
                  { label: 'Privato', value: 'privato' },
                  { label: 'Azienda', value: 'azienda' },
                ]}
              />
            )}

            {/* DATI AZIENDALI (Visible ONLY when Tipo utente === 'segnalatore' AND Segnalatore === 'azienda') */}
            {isAziendaMode && (
              <View style={styles.datiAziendaliBlock}>
                <Text style={styles.datiAziendaliHeading}>Dati aziendali</Text>

                {/* Dropdown: Tipo di azienda */}
                <CustomDropdown
                  label="Tipo di azienda"
                  value={tipoAzienda}
                  onSelect={(val) => setTipoAzienda(val)}
                  options={[
                    { label: 'Seleziona tipo', value: '' },
                    { label: 'Officina', value: 'Officina' },
                    { label: 'Carrozzeria', value: 'Carrozzeria' },
                    { label: 'Autoscuola', value: 'Autoscuola' },
                    { label: 'Azienda collaboratrice', value: 'Azienda collaboratrice' },
                  ]}
                />

                <Text style={styles.datiAziendaliSubNote}>
                  Un solo codice aziendale per tutti i clienti. L’email e la password di accesso sono quelle del referente.
                </Text>

                {/* Stacked full-width inputs matching exact screenshot */}
                <Text style={styles.fieldLabel}>Ragione sociale</Text>
                <TextInput
                  style={styles.input}
                  value={ragioneSociale}
                  onChangeText={setRagioneSociale}
                />

                <Text style={styles.fieldLabel}>Partita IVA (facoltativa)</Text>
                <TextInput
                  style={styles.input}
                  value={partitaIva}
                  onChangeText={setPartitaIva}
                />

                <Text style={styles.fieldLabel}>Indirizzo della sede</Text>
                <TextInput
                  style={styles.input}
                  value={indirizzo}
                  onChangeText={setIndirizzo}
                />

                <Text style={styles.fieldLabel}>CAP</Text>
                <TextInput
                  style={styles.input}
                  value={cap}
                  onChangeText={setCap}
                />

                <Text style={styles.fieldLabel}>Comune</Text>
                <TextInput
                  style={styles.input}
                  value={comune}
                  onChangeText={setComune}
                />

                <Text style={styles.fieldLabel}>Provincia (sigla)</Text>
                <TextInput
                  style={styles.input}
                  autoCapitalize="characters"
                  maxLength={4}
                  value={provincia}
                  onChangeText={setProvincia}
                />

                <Text style={styles.fieldLabel}>Telefono aziendale</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={telefono}
                  onChangeText={setTelefono}
                />

                {/* Privacy Checkbox & Link for Azienda */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setPrivacyChecked(!privacyChecked)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkboxBox, privacyChecked && styles.checkboxBoxChecked]}>
                    {privacyChecked && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Dichiaro di aver fornito al referente l’informativa privacy e di essere autorizzato a inserire questi dati aziendali e di contatto.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setPrivacyModalVisible(true)} style={{ marginBottom: 12 }}>
                  <Text style={styles.privacyLinkText}>Leggi l’informativa privacy</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Nome e cognome / referente aziendale */}
            <Text style={styles.fieldLabel}>Nome e cognome / referente aziendale</Text>
            <TextInput
              style={styles.input}
              value={personName}
              onChangeText={setPersonName}
            />

            {/* Email */}
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              value={personEmail}
              onChangeText={setPersonEmail}
            />

            {/* Codice segnalatore OR Codice cliente (inserimento manuale) */}
            <Text style={styles.fieldLabel}>
              {userType === 'cliente'
                ? 'Codice cliente (inserimento manuale)'
                : 'Codice segnalatore (inserimento manuale)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Inserisci il codice manualmente"
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={setCode}
            />

            {/* Password iniziale del segnalatore + Genera password (ONLY when Tipo utente === 'segnalatore') */}
            {userType === 'segnalatore' && (
              <>
                <Text style={styles.fieldLabel}>Password iniziale del segnalatore</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10 }]}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    style={styles.generatePassBtn}
                    onPress={handleGeneratePassword}
                  >
                    <Text style={styles.generatePassBtnText}>Genera password</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Valido fino al (facoltativo) */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Valido fino al (facoltativo)</Text>
            <View style={styles.dateInputWrapper}>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    outline: 'none',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              ) : (
                <TextInput
                  style={[styles.input, { marginBottom: 0 }]}
                  placeholder="gg/mm/aaaa"
                  placeholderTextColor="#9CA3AF"
                  value={validUntil}
                  onChangeText={setValidUntil}
                />
              )}
            </View>

            {/* Codice attivo checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsActive(!isActive)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkboxBox, isActive && styles.checkboxBoxChecked]}>
                {isActive && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Codice attivo</Text>
            </TouchableOpacity>

            {/* Red Save Button: Salva utente e codice */}
            <TouchableOpacity
              style={styles.redSaveButton}
              onPress={handleSaveUser}
              disabled={saving}
              activeOpacity={0.88}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.redSaveButtonText}>Salva utente e codice</Text>
              )}
            </TouchableOpacity>

            {/* Status note under button matching colleague's text */}
            <Text style={styles.statusNoteText}>{statusMessage}</Text>
          </View>

          {/* Bottom Sections: Aziende e clienti / Utenti e codici inseriti */}
          <View style={styles.listSection}>
            <Text style={styles.sectionHeading}>Aziende e clienti</Text>
            <View style={styles.listHeaderRow}>
              <Text style={styles.subSectionHeading}>
                Utenti e codici inseriti ({clubUsers.length})
              </Text>
              <TouchableOpacity onPress={fetchClubUsers} style={styles.refreshBtn}>
                <Text style={styles.refreshBtnText}>↻ Aggiorna</Text>
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <ActivityIndicator color="#DC2626" style={{ marginVertical: 20 }} />
            ) : clubUsers.length === 0 ? (
              <Text style={styles.emptyText}>Nessun utente ancora registrato.</Text>
            ) : (
              clubUsers.map((u) => (
                <View key={u.id} style={styles.userRowCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={styles.userRowName}>{u.person_name}</Text>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>Codice: {u.code}</Text>
                      </View>
                      <View
                        style={[
                          styles.typeBadge,
                          u.sub_type === 'azienda' && { backgroundColor: '#DBEAFE' },
                        ]}
                      >
                        <Text style={styles.typeBadgeText}>
                          {u.user_type === 'cliente' ? 'Cliente' : u.sub_type === 'azienda' ? 'Azienda' : 'Privato'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.userRowEmail}>{u.person_email}</Text>
                    {u.ragione_sociale ? (
                      <Text style={styles.userRowCompany}>
                        🏢 {u.ragione_sociale} {u.tipo_azienda ? `(${u.tipo_azienda})` : ''}{' '}
                        {u.comune ? `- ${u.comune}` : ''}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.deleteUserBtn}
                    onPress={() => handleDeleteUser(u)}
                  >
                    <Text style={styles.deleteUserBtnText}>Elimina</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Navigation Bar matching screenshot: Home | Il mio Club | Altro */}
      <View style={styles.bottomNavBar}>
        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() => navigation.navigate('AdminDashboard', { user, token })}
        >
          <Text style={styles.bottomNavIcon}>⌂</Text>
          <Text style={styles.bottomNavLabel}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomNavTab, styles.bottomNavTabActive]}
          onPress={() => {}}
        >
          <Text style={styles.bottomNavIcon}>▤</Text>
          <Text style={styles.bottomNavLabel}>Il mio Club</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomNavTab}
          onPress={() =>
            navigation.navigate('SegnalatoreDashboard', {
              user: {
                ...user,
                name: personName || user?.name || "Alex D'Alise",
                venditore_code: code || '17754654',
              },
              token,
              isAdminPreview: true,
            })
          }
        >
          <Text style={styles.bottomNavIcon}>☷</Text>
          <Text style={styles.bottomNavLabel}>Altro</Text>
        </TouchableOpacity>
      </View>

      {/* Informativa Privacy Modal */}
      <Modal visible={privacyModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Informativa privacy — Rossomandi Club</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <Text style={styles.modalBodyText}>
                Informativa ai sensi degli articoli 13 e 14 del Regolamento (UE) 2016/679 (GDPR).{'\n\n'}
                1. Titolare e contatti: Il titolare del trattamento è ROSSOMANDI AUTO S.R.L., partita IVA 01550200974 (info@rossomandi.com / rossomandiclub@rossomandi.com).{'\n\n'}
                2. Dati trattati: Per gli account: nome del referente, email, credenziali, tipo di utente, codice associato. Per le aziende: ragione sociale, partita IVA, tipo di attività, sede, CAP, comune, provincia e telefono.{'\n\n'}
                3. Finalità: Gestire adesione, account, accesso, attribuzione del cliente al codice e gestione del rapporto di collaborazione.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.redSaveButton, { marginTop: 14 }]}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.redSaveButtonText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    maxWidth: 880,
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
    marginBottom: 20,
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
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRoleBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewRoleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  formSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  subSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  sectionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  webSelectWrapper: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  webSelectWrapperRed: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownTriggerRed: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  dropdownTriggerText: {
    fontSize: 14,
    color: '#111827',
  },
  dropdownChevron: {
    fontSize: 13,
    color: '#6B7280',
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#FEF2F2',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  datiAziendaliBlock: {
    marginTop: 6,
    marginBottom: 10,
  },
  datiAziendaliHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  datiAziendaliSubNote: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },
  privacyLinkText: {
    fontSize: 12,
    color: '#DC002E',
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  dateInputWrapper: {
    marginBottom: 10,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generatePassBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  generatePassBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
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
  redSaveButton: {
    backgroundColor: '#DC002E',
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  redSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  statusNoteText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 10,
  },
  listSection: {
    marginTop: 28,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  refreshBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  userRowCard: {
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
  userRowName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginRight: 8,
  },
  codeBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  typeBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  userRowEmail: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 3,
  },
  userRowCompany: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
    marginTop: 2,
  },
  deleteUserBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteUserBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 22,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  modalBodyText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },
});
