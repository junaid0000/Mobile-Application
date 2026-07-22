import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  ScrollView,
  Modal,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function SellerDashboard({ navigation, route }) {
  const { user, token } = route.params || {};

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Settings & Drawer state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Settings toggles
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('IT'); // 'IT' | 'EN'

  const t = {
    welcome: language === 'IT' ? `Benvenuto, ${user?.name || 'Venditore'}!` : `Welcome, ${user?.name || 'Seller'}!`,
    subWelcome: language === 'IT' ? 'Pannello di controllo venditori e staff' : 'Sales and staff control panel',
    appointments: language === 'IT' ? 'Appuntamenti' : 'Appointments',
    officeChat: language === 'IT' ? 'Chat Ufficio' : 'Office Chat',
    settings: language === 'IT' ? 'Impostazioni' : 'Settings',
    changePassword: language === 'IT' ? 'Modifica Password' : 'Change Password',
    darkMode: language === 'IT' ? 'Modalità Scura' : 'Dark Mode',
    pushNotifications: language === 'IT' ? 'Notifiche Push' : 'Push Notifications',
    langLabel: language === 'IT' ? 'Lingua' : 'Language',
    langVal: language === 'IT' ? '🇮🇹 Italiano' : '🇬🇧 English',
    support: language === 'IT' ? 'Guida & Supporto' : 'Help & Support',
    about: language === 'IT' ? 'Informazioni App' : 'About App',
    logout: language === 'IT' ? 'Esci dal Account' : 'Log Out',
    save: language === 'IT' ? 'Salva' : 'Save',
    cancel: language === 'IT' ? 'Annulla' : 'Cancel',
    currPass: language === 'IT' ? 'Password attuale' : 'Current password',
    newPass: language === 'IT' ? 'Nuova password' : 'New password',
    confPass: language === 'IT' ? 'Conferma nuova password' : 'Confirm new password',
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert(language === 'IT' ? 'Errore' : 'Error', language === 'IT' ? 'Compila tutti i campi' : 'Please fill all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(language === 'IT' ? 'Errore' : 'Error', language === 'IT' ? 'Le nuove password non coincidono' : 'New passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await axios.post(
        `${BASE_URL}/api/auth/change-password`,
        { oldPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert(language === 'IT' ? 'Successo' : 'Success', language === 'IT' ? 'Password aggiornata con successo!' : 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordModalVisible(false);
    } catch (error) {
      Alert.alert(language === 'IT' ? 'Errore' : 'Error', error.response?.data?.error || 'Impossibile aggiornare la password');
    } finally {
      setChangingPassword(false);
    }
  };

  const showSupportInfo = () => {
    Alert.alert(
      t.support,
      `Rossomandi Automotive Support\n\n✉️ Email: assistenza@rossomandi.it\n📞 Tel: +39 06 1234567\n🕒 Lun - Ven: 09:00 - 18:30`
    );
  };

  const showAboutInfo = () => {
    Alert.alert(
      t.about,
      `Rossomandi Automotive App\nVersione: 1.0.4 (Build 2026)\n\nSviluppato per la gestione in tempo reale degli appuntamenti di vendita.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.drawerButton} onPress={() => setDrawerVisible(true)}>
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <View style={{ width: 40 }} />
      </View>

      {/* ── Centered Main Content ─────────────────────────────────────── */}
      <View style={styles.mainContent}>
        <Text style={styles.middleWelcomeTitle}>{t.welcome}</Text>
        <Text style={styles.subWelcomeText}>{t.subWelcome}</Text>

        <View style={[styles.buttonsStack, { maxWidth: isMobile ? '88%' : 320, width: '100%' }]}>
          {/* Button 1: Appuntamenti */}
          <TouchableOpacity
            style={styles.clay3DButton}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Appointments', { user, token })}
          >
            <View style={styles.clayButtonInner}>
              <Text style={styles.clayButtonEmoji}>📅</Text>
              <Text style={styles.clayButtonText}>{t.appointments}</Text>
            </View>
          </TouchableOpacity>

          {/* Button 2: Chat Ufficio */}
          <TouchableOpacity
            style={[styles.clay3DButton, styles.clay3DButtonDarker]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('OfficeChat', { user, token })}
          >
            <View style={styles.clayButtonInner}>
              <Text style={styles.clayButtonEmoji}>💬</Text>
              <Text style={styles.clayButtonText}>{t.officeChat}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Footer pinned at bottom ──────────────────────────────────── */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerText}>Rossomandi Automotive © 2026 • v1.0.4</Text>
      </View>

      {/* ── Left-Side Slide-Out Drawer Modal ──────────────────────────── */}
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDrawerVisible(false)}
      >
        <View style={styles.drawerOverlay}>
          <View style={[styles.leftDrawerContainer, { width: isMobile ? '68%' : 290 }]}>
            <View style={styles.drawerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ fontSize: 20 }}>⚙️</Text>
                <Text style={styles.drawerTitle}>{t.settings}</Text>
              </View>
              <TouchableOpacity onPress={() => setDrawerVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={true}>
              <View style={styles.profileCard}>
                <View style={styles.profileAvatar}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{user?.name || 'Venditore'}</Text>
                  <Text style={styles.profileEmail}>{user?.email || ''}</Text>
                  <View style={styles.roleTagBadge}>
                    <Text style={styles.roleTagBadgeText}>#{user?.venditore_code || user?.role?.toUpperCase() || 'VENDITORE'}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.drawerList}>
                <TouchableOpacity 
                  style={styles.drawerItem} 
                  onPress={() => {
                    setDrawerVisible(false);
                    setPasswordModalVisible(true);
                  }}
                >
                  <Text style={styles.drawerIcon}>🔒</Text>
                  <Text style={styles.drawerText}>{t.changePassword}</Text>
                  <Text style={styles.drawerArrow}>➔</Text>
                </TouchableOpacity>

                <View style={styles.drawerItem}>
                  <Text style={styles.drawerIcon}>🌙</Text>
                  <Text style={styles.drawerText}>{t.darkMode}</Text>
                  <Switch
                    value={darkMode}
                    onValueChange={setDarkMode}
                    trackColor={{ false: '#333', true: '#FF5500' }}
                    thumbColor="#FFF"
                  />
                </View>

                <View style={styles.drawerItem}>
                  <Text style={styles.drawerIcon}>🔔</Text>
                  <Text style={styles.drawerText}>{t.pushNotifications}</Text>
                  <Switch
                    value={notifications}
                    onValueChange={setNotifications}
                    trackColor={{ false: '#333', true: '#FF5500' }}
                    thumbColor="#FFF"
                  />
                </View>

                <TouchableOpacity 
                  style={styles.drawerItem}
                  onPress={() => setLanguage(l => l === 'IT' ? 'EN' : 'IT')}
                >
                  <Text style={styles.drawerIcon}>🌐</Text>
                  <Text style={styles.drawerText}>{t.langLabel}</Text>
                  <Text style={styles.langValue}>{t.langVal}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={showSupportInfo}>
                  <Text style={styles.drawerIcon}>❓</Text>
                  <Text style={styles.drawerText}>{t.support}</Text>
                  <Text style={styles.drawerArrow}>➔</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.drawerItem} onPress={showAboutInfo}>
                  <Text style={styles.drawerIcon}>ℹ️</Text>
                  <Text style={styles.drawerText}>{t.about}</Text>
                  <Text style={styles.drawerArrow}>➔</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.drawerItem, { borderBottomWidth: 0, marginTop: 12 }]} 
                  onPress={() => {
                    setDrawerVisible(false);
                    navigation.navigate('Login');
                  }}
                >
                  <Text style={styles.drawerIcon}>🚪</Text>
                  <Text style={[styles.drawerText, { color: '#E53935', fontWeight: 'bold' }]}>
                    {t.logout}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>

          <TouchableOpacity 
            style={{ flex: 1 }} 
            activeOpacity={1} 
            onPress={() => setDrawerVisible(false)} 
          />
        </View>
      </Modal>

      {/* ── Change Password Dialog Box ────────────────────────────────── */}
      <Modal
        visible={passwordModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogBox, { width: '90%', maxWidth: 400 }]}>
            <Text style={styles.dialogTitle}>🔒 {t.changePassword}</Text>

            <TextInput
              style={styles.dialogInput}
              placeholder={t.currPass}
              placeholderTextColor="#888"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            <TextInput
              style={styles.dialogInput}
              placeholder={t.newPass}
              placeholderTextColor="#888"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.dialogInput}
              placeholder={t.confPass}
              placeholderTextColor="#888"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.dialogBtnRow}>
              <TouchableOpacity 
                style={styles.dialogCancelBtn} 
                onPress={() => setPasswordModalVisible(false)}
              >
                <Text style={styles.dialogCancelText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dialogSubmitBtn} 
                onPress={handleChangePassword}
                disabled={changingPassword}
              >
                {changingPassword ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.dialogSubmitText}>{t.save}</Text>
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
    backgroundColor: '#0F0F13',
  },
  header: {
    height: Platform.OS === 'android' ? 72 + (StatusBar.currentHeight || 0) : 72,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 0,
    paddingHorizontal: 20,
    backgroundColor: '#0F0F13',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerButton: {
    padding: 8,
  },
  hamburgerIcon: {
    color: '#FFF',
    fontSize: 24,
  },
  logo: {
    width: 180,
    height: 56,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  middleWelcomeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subWelcomeText: {
    color: '#A0AEC0',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 36,
  },
  buttonsStack: {
    width: '100%',
    gap: 14,
  },

  /* Professional Compact Buttons */
  clay3DButton: {
    backgroundColor: '#FF5500',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    shadowColor: '#FF3D00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    borderBottomWidth: 3,
    borderBottomColor: '#C03800',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,130,80,0.4)',
  },
  clay3DButtonDarker: {
    backgroundColor: '#1E2230',
    shadowColor: '#000',
    borderBottomColor: '#0D0F1A',
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  clayButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  clayButtonEmoji: {
    fontSize: 20,
  },
  clayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
  },

  /* Footer */
  footerContainer: {
    paddingVertical: 10,
    paddingBottom: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#4A5568',
    fontSize: 12,
    textAlign: 'center',
  },

  /* Drawer Modal */
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
  },
  leftDrawerContainer: {
    backgroundColor: '#12141F',
    height: '100%',
    paddingTop: Platform.OS === 'ios' ? 55 : 30,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,85,0,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,85,0,0.12)',
  },
  drawerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    color: '#888',
    fontSize: 20,
  },
  drawerScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#2A2D3A',
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2A2D3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: '#888',
    fontSize: 12,
  },
  roleTagBadge: {
    backgroundColor: 'rgba(255,85,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleTagBadgeText: {
    color: '#FF5500',
    fontSize: 10,
    fontWeight: 'bold',
  },
  drawerList: {
    gap: 2,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginVertical: 1,
  },
  drawerIcon: {
    fontSize: 16,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  drawerText: {
    color: '#CCC',
    fontSize: 14,
    flex: 1,
  },
  drawerArrow: {
    color: '#444',
    fontSize: 12,
  },
  langValue: {
    color: '#FF5500',
    fontSize: 13,
    fontWeight: 'bold',
  },

  /* Dialog Modal */
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBox: {
    backgroundColor: '#1A1C28',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2D3A',
  },
  dialogTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dialogInput: {
    backgroundColor: '#11131C',
    borderRadius: 10,
    padding: 14,
    color: '#FFF',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2D3A',
    fontSize: 14,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  dialogCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2A2D3A',
  },
  dialogCancelText: {
    color: '#AAA',
    fontWeight: '600',
  },
  dialogSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#FF5500',
  },
  dialogSubmitText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
