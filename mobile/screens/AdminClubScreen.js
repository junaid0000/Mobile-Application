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

// Custom Cross-Platform Dropdown matching exact screenshot style
function CustomDropdown({ label, value, options, onSelect, highlightRed }) {
  const [open, setOpen] = useState(false);
  const selectedObj = options.find((o) => o.value === value) || options[0];

  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View
          style={[
            styles.webSelectWrapper,
            highlightRed && styles.webSelectWrapperRed,
          ]}
        >
          <select
            value={value}
            onChange={(e) => onSelect(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '13px',
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
    <View style={{ marginBottom: 12, zIndex: open ? 100 : 1 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dropdownTrigger,
          (open || highlightRed) && styles.dropdownTriggerRed,
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

  // Form State matching exact screenshot ("Nuovo utente e codice associato")
  const [userType, setUserType] = useState('segnalatore'); // 'segnalatore' | 'azienda' | 'cliente'
  const [subType, setSubType] = useState('privato');       // 'privato' | 'azienda' | 'officina' | 'autoscuola' | 'carrozzeria'
  const [personName, setPersonName] = useState('');
  const [personEmail, setPersonEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState(() => generateRandomPassword());
  const [validUntil, setValidUntil] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Company / Officina fields (when subType !== 'privato' or userType === 'azienda')
  const [tipoAzienda, setTipoAzienda] = useState('Officina');
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [cap, setCap] = useState('');
  const [comune, setComune] = useState('');
  const [provincia, setProvincia] = useState('');
  const [telefono, setTelefono] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const [saving, setSaving] = useState(false);
  const [clubUsers, setClubUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const isCompanyMode = userType === 'azienda' || (userType === 'segnalatore' && subType !== 'privato');

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

  const handleSaveUser = async () => {
    if (!personName.trim() || !personEmail.trim() || !code.trim()) {
      showNotice('Campi mancanti', 'Inserisci Nome, Email e Codice segnalatore.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        user_type: userType,
        sub_type: subType,
        person_name: personName.trim(),
        person_email: personEmail.trim().toLowerCase(),
        code: code.trim(),
        password: password.trim(),
        valid_until: validUntil.trim() || null,
        is_active: isActive,
        ragione_sociale: isCompanyMode ? ragioneSociale.trim() : null,
        partita_iva: isCompanyMode ? partitaIva.trim() : null,
        tipo_azienda: isCompanyMode ? (subType !== 'privato' ? subType : tipoAzienda.trim()) : null,
        indirizzo: isCompanyMode ? indirizzo.trim() : null,
        cap: isCompanyMode ? cap.trim() : null,
        comune: isCompanyMode ? comune.trim() : null,
        provincia: isCompanyMode ? provincia.trim() : null,
        telefono: isCompanyMode ? telefono.trim() : null,
        lat: isCompanyMode && lat ? lat : null,
        lng: isCompanyMode && lng ? lng : null,
      };

      const res = await axios.post(`${BASE_URL}/api/club/admin/create-user`, payload, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

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
      setIndirizzo('');
      setCap('');
      setComune('');
      setProvincia('');
      setTelefono('');
      setLat('');
      setLng('');
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
        {/* Top White Card Container matching Rossomandi Club screenshot */}
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
                <Text style={styles.previewRoleBtnText}>👁️ Visualizza come Segnalatore</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.backBtnText}>← Admin</Text>
              </TouchableOpacity>

              <View style={styles.userIconCircle}>
                <Text style={{ fontSize: 14 }}>♟</Text>
              </View>
            </View>
          </View>

          {/* Form Box: Nuovo utente e codice associato */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>Nuovo utente e codice associato</Text>
            <Text style={styles.sectionSub}>
              Scegli il tipo di utente. Per tutti i tipi di utente il codice viene inserito manualmente; per i segnalatori la password può essere generata.
            </Text>

            {/* DROPDOWN 1: Tipo utente */}
            <CustomDropdown
              label="Tipo utente"
              value={userType}
              onSelect={(val) => setUserType(val)}
              options={[
                { label: 'Segnalatore', value: 'segnalatore' },
                { label: 'Azienda collaboratrice / Officina', value: 'azienda' },
                { label: 'Cliente con codice sconto', value: 'cliente' },
              ]}
            />

            {/* DROPDOWN 2: Segnalatore (Privato / Azienda / Officina / Autoscuola / Carrozzeria) */}
            {userType === 'segnalatore' && (
              <CustomDropdown
                label="Segnalatore"
                value={subType}
                highlightRed={true}
                onSelect={(val) => setSubType(val)}
                options={[
                  { label: 'Privato', value: 'privato' },
                  { label: 'Azienda / Partner', value: 'azienda' },
                  { label: 'Officina / Meccanico', value: 'officina' },
                  { label: 'Carrozzeria', value: 'carrozzeria' },
                  { label: 'Autoscuola / Agenzia Pratiche', value: 'autoscuola' },
                ]}
              />
            )}

            {/* Dati Aziendali (Shown when Azienda/Officina is selected) */}
            {isCompanyMode && (
              <View style={styles.companyBox}>
                <Text style={styles.companyBoxTitle}>Dati aziendali</Text>
                <Text style={styles.companyBoxSub}>
                  Un solo codice aziendale per tutti i clienti. L'email e la password di accesso sono quelle del referente.
                </Text>

                <Text style={styles.fieldLabel}>Ragione sociale</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ragione sociale azienda"
                  placeholderTextColor="#9CA3AF"
                  value={ragioneSociale}
                  onChangeText={setRagioneSociale}
                />

                <Text style={styles.fieldLabel}>Partita IVA (facoltativa)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Partita IVA"
                  placeholderTextColor="#9CA3AF"
                  value={partitaIva}
                  onChangeText={setPartitaIva}
                />

                <Text style={styles.fieldLabel}>Indirizzo della sede</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Via e numero civico"
                  placeholderTextColor="#9CA3AF"
                  value={indirizzo}
                  onChangeText={setIndirizzo}
                />

                <View style={styles.row3}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>CAP</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="CAP"
                      placeholderTextColor="#9CA3AF"
                      value={cap}
                      onChangeText={setCap}
                    />
                  </View>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>Comune</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Comune"
                      placeholderTextColor="#9CA3AF"
                      value={comune}
                      onChangeText={setComune}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Provincia (sigla)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Es. PO"
                      placeholderTextColor="#9CA3AF"
                      maxLength={4}
                      autoCapitalize="characters"
                      value={provincia}
                      onChangeText={setProvincia}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Telefono aziendale</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Telefono"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={telefono}
                  onChangeText={setTelefono}
                />

                <View style={styles.row3}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.fieldLabel}>Latitudine (opz.)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="43.8777"
                      placeholderTextColor="#9CA3AF"
                      value={lat}
                      onChangeText={setLat}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Longitudine (opz.)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="11.1022"
                      placeholderTextColor="#9CA3AF"
                      value={lng}
                      onChangeText={setLng}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Nome e cognome / referente aziendale */}
            <Text style={styles.fieldLabel}>Nome e cognome / referente aziendale</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              placeholderTextColor="#9CA3AF"
              value={personName}
              onChangeText={setPersonName}
            />

            {/* Email */}
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder=""
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              value={personEmail}
              onChangeText={setPersonEmail}
            />

            {/* Codice segnalatore (inserimento manuale) */}
            <Text style={styles.fieldLabel}>Codice segnalatore (inserimento manuale)</Text>
            <TextInput
              style={styles.input}
              placeholder="Inserisci il codice manualmente"
              placeholderTextColor="#9CA3AF"
              value={code}
              onChangeText={setCode}
            />

            {/* Password iniziale del segnalatore + Genera password */}
            {userType !== 'cliente' && (
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
                    onPress={() => setPassword(generateRandomPassword())}
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
                    padding: '10px 12px',
                    fontSize: '13px',
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    outline: 'none',
                    fontFamily: 'inherit',
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
          </View>

          {/* List of Saved Segnalatori ("Utenti e codici inseriti") */}
          <View style={styles.listSection}>
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionHeading}>Utenti e codici inseriti ({clubUsers.length})</Text>
              <TouchableOpacity onPress={fetchClubUsers} style={styles.refreshBtn}>
                <Text style={styles.refreshBtnText}>↻ Aggiorna</Text>
              </TouchableOpacity>
            </View>

            {loadingUsers ? (
              <ActivityIndicator color="#DC2626" style={{ marginVertical: 20 }} />
            ) : clubUsers.length === 0 ? (
              <Text style={styles.emptyText}>Nessun segnalatore ancora registrato.</Text>
            ) : (
              clubUsers.map((u) => (
                <View key={u.id} style={styles.userRowCard}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                      <Text style={styles.userRowName}>{u.person_name}</Text>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>Codice: {u.code}</Text>
                      </View>
                      <View style={[styles.typeBadge, u.sub_type !== 'privato' && { backgroundColor: '#DBEAFE' }]}>
                        <Text style={styles.typeBadgeText}>{u.sub_type || u.user_type}</Text>
                      </View>
                    </View>
                    <Text style={styles.userRowEmail}>{u.person_email}</Text>
                    {u.ragione_sociale ? (
                      <Text style={styles.userRowCompany}>
                        🏢 {u.ragione_sociale} {u.comune ? `(${u.comune})` : ''}
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
    flexWrap: 'wrap',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 20,
    gap: 10,
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
    gap: 8,
  },
  userIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewRoleBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  previewRoleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  backBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  formSection: {
    backgroundColor: '#FAFAFA',
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
    marginTop: 4,
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
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  dropdownTriggerRed: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  dropdownTriggerText: {
    fontSize: 13,
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: {
    backgroundColor: '#FEF2F2',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
  companyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginVertical: 10,
  },
  companyBoxTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  companyBoxSub: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 10,
  },
  row3: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#111827',
    marginBottom: 10,
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
    paddingVertical: 10,
  },
  generatePassBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
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
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
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
});
