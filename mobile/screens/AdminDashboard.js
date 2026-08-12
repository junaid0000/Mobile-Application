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
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/apiConfig';

export default function AdminDashboard({ navigation, route }) {
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

  // Avatar state
  const [avatarUri, setAvatarUri] = useState(null);

  // Seller / Staff Management state
  const [sellersModalVisible, setSellersModalVisible] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Add/Edit Seller Form state
  const [editUserModalVisible, setEditUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null); // null if adding new
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('seller'); // 'seller' | 'admin'
  const [formSellerCode, setFormSellerCode] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Settings toggles
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('IT'); // 'IT' | 'EN'

  useEffect(() => {
    AsyncStorage.getItem('@app_dark_mode').then(val => {
      if (val !== null) setDarkMode(JSON.parse(val));
    });
    if (user?.id) {
      AsyncStorage.getItem(`@user_avatar_${user.id}`).then(uri => {
        if (uri) setAvatarUri(uri);
      });
    }
  }, [user?.id]);

  const handleToggleDarkMode = async (val) => {
    setDarkMode(val);
    await AsyncStorage.setItem('@app_dark_mode', JSON.stringify(val));
  };

  const pickProfilePicture = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permesso Negato', 'Abilita l\'accesso alla galleria per scegliere una foto profilo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0].uri) {
        const uri = result.assets[0].uri;
        setAvatarUri(uri);
        if (user?.id) {
          await AsyncStorage.setItem(`@user_avatar_${user.id}`, uri);
        }
      }
    } catch (err) {
      console.error('Error picking avatar image:', err);
    }
  };

  const t = {
    welcome: language === 'IT' ? 'Benvenuto, Amministratore!' : 'Welcome, Administrator!',
    appointments: language === 'IT' ? 'Appuntamenti' : 'Appointments',
    officeChat: language === 'IT' ? 'Chat Ufficio' : 'Office Chat',
    manageSellers: language === 'IT' ? 'Gestione Staff' : 'Manage Staff',
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

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsersList(res.data.users || res.data || []);
    } catch (err) {
      console.error('Error fetching users:', err.message);
      Alert.alert('Errore', 'Impossibile caricare gli utenti. Controlla la connessione.');
    } finally {
      setLoadingUsers(false);
    }
  };

  const openAddUserModal = () => {
    setSelectedUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('seller');
    setFormSellerCode('');
    setEditUserModalVisible(true);
  };

  const openEditUserModal = (usr) => {
    setSelectedUser(usr);
    setFormName(usr.name || '');
    setFormEmail(usr.email || '');
    setFormPassword('');
    setFormRole(usr.role || 'seller');
    setFormSellerCode(usr.venditore_code || '');
    setEditUserModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!formName || !formEmail) {
      Alert.alert('Errore', 'Inserisci nome ed email');
      return;
    }
    if (!selectedUser && !formPassword) {
      Alert.alert('Errore', 'La password è obbligatoria per i nuovi utenti');
      return;
    }

    setSavingUser(true);
    try {
      if (selectedUser) {
        // Update user
        await axios.put(
          `${BASE_URL}/api/admin/users/${selectedUser.id}`,
          { name: formName, email: formEmail, role: formRole, venditore_code: formSellerCode, password: formPassword },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Alert.alert('Successo', 'Utente aggiornato con successo');
      } else {
        // Create user
        await axios.post(
          `${BASE_URL}/api/admin/users`,
          { name: formName, email: formEmail, role: formRole, venditore_code: formSellerCode, password: formPassword },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        Alert.alert('Successo', 'Nuovo utente creato con successo');
      }
      setEditUserModalVisible(false);
      fetchUsers();
    } catch (err) {
      Alert.alert('Errore', err.response?.data?.error || 'Impossibile salvare l\'utente');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    setDeletingUser(true);
    try {
      await axios.delete(`${BASE_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserToDelete(null);
      if (Platform.OS === 'web') {
        alert('Utente eliminato con successo');
      } else {
        Alert.alert('Successo', 'Utente eliminato');
      }
      fetchUsers();
    } catch (err) {
      if (Platform.OS === 'web') {
        alert(err.response?.data?.error || 'Impossibile eliminare l\'utente');
      } else {
        Alert.alert('Errore', err.response?.data?.error || 'Impossibile eliminare l\'utente');
      }
    } finally {
      setDeletingUser(false);
    }
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
      `Rossomandi Automotive Support\n\n✉️ Email: junaidmunir.janjua@rossomandi.com\n📞 Tel: +39-3481714322\n🕒 Lun - Ven: 09:00 - 18:00`
    );
  };

  const showAboutInfo = () => {
    Alert.alert(
      t.about,
      `Rossomandi Client Service & Sales System\nVersione: 1.0.4 (Build 2026)\n\nApplicazione ufficiale Rossomandi Automotive per la gestione in tempo reale degli appuntamenti di vendita, sync con il database aziendale, chat d'ufficio e notifiche per lo staff.`
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* ── Top Header ────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.drawerButton}
          hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          activeOpacity={0.6}
          onPress={() => setDrawerVisible(true)}
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Centered Main Content ─────────────────────────────────────── */}
      <View style={styles.mainContent}>
        <View style={styles.bannerContainer}>
          <Image 
            source={require('../assets/images/banner.png')}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </View>

        <View style={styles.centeredContainer}>
          <Text style={styles.middleWelcomeTitle}>{t.welcome}</Text>

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

            {/* Button 3: Gestione Venditori */}
            <TouchableOpacity
              style={[styles.clay3DButton, styles.clay3DButtonPurple]}
              activeOpacity={0.85}
              onPress={() => {
                setSellersModalVisible(true);
                fetchUsers();
              }}
            >
              <View style={styles.clayButtonInner}>
                <Text style={styles.clayButtonEmoji}>👥</Text>
                <Text style={styles.clayButtonText}>{t.manageSellers}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Rossomandi Automotive © 2026 • v1.0.1 (Build 20)</Text>
        </View>
      </View>

      {/* ── Left-Side Slide-Out Drawer Modal ──────────────────────────── */}
      <Modal
        visible={drawerVisible}
        animationType="fade"
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
                <TouchableOpacity style={styles.profileAvatar} onPress={pickProfilePicture} activeOpacity={0.8}>
                  {avatarUri ? (
                    <Image source={{ uri: avatarUri }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>👤</Text>
                  )}
                  <View style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    backgroundColor: '#FF5500',
                    borderRadius: 9,
                    width: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#FFF',
                  }}>
                    <Text style={{ fontSize: 10 }}>📷</Text>
                  </View>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{user?.name || 'Amministratore'}</Text>
                  <Text style={styles.profileEmail}>{user?.email || 'admin@rossomandi.com'}</Text>
                  <View style={styles.roleTagBadge}>
                    <Text style={styles.roleTagBadgeText}>{user?.role?.toUpperCase() || 'ADMIN'}</Text>
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
                    onValueChange={handleToggleDarkMode}
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

      {/* ── Gestione Venditori (Sellers Management Modal) ──────────────── */}
      <Modal
        visible={sellersModalVisible}
        animationType="slide"
        transparent={true}
        statusBarTranslucent={true}
        onRequestClose={() => {
          if (editUserModalVisible) {
            setEditUserModalVisible(false);
          } else {
            setSellersModalVisible(false);
          }
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' }}>
          <View style={styles.dialogOverlay}>
            {editUserModalVisible ? (
              /* ── Add / Edit User Sub-View ─────────────────────────────────── */
              <View style={[styles.dialogBox, { width: '90%', maxWidth: 420 }]}>
                <Text style={styles.dialogTitle}>
                  {selectedUser ? '✏️ Modifica Utente' : '➕ Nuovo Venditore / Admin'}
                </Text>

                <TextInput
                  style={styles.dialogInput}
                  placeholder="Nome e Cognome"
                  placeholderTextColor="#888"
                  value={formName}
                  onChangeText={setFormName}
                />
                <TextInput
                  style={styles.dialogInput}
                  placeholder="Email Ufficiale"
                  placeholderTextColor="#888"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formEmail}
                  onChangeText={setFormEmail}
                />
                <TextInput
                  style={styles.dialogInput}
                  placeholder={selectedUser ? "Nuova Password (lascia vuoto per non cambiare)" : "Password"}
                  placeholderTextColor="#888"
                  secureTextEntry
                  value={formPassword}
                  onChangeText={setFormPassword}
                />

                {/* Role Pills */}
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
                  <TouchableOpacity 
                    style={[styles.rolePill, formRole === 'seller' && styles.rolePillActive]}
                    onPress={() => setFormRole('seller')}
                  >
                    <Text style={[styles.rolePillText, formRole === 'seller' && styles.rolePillTextActive]}>💼 Venditore</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.rolePill, formRole === 'admin' && styles.rolePillActive]}
                    onPress={() => setFormRole('admin')}
                  >
                    <Text style={[styles.rolePillText, formRole === 'admin' && styles.rolePillTextActive]}>👑 Admin</Text>
                  </TouchableOpacity>
                </View>

                {formRole === 'seller' && (
                  <TextInput
                    style={[styles.dialogInput, { borderColor: '#FF5500' }]}
                    placeholder="Codice Venditore (es. GC, MR, AP)"
                    placeholderTextColor="#FF9966"
                    autoCapitalize="characters"
                    value={formSellerCode}
                    onChangeText={setFormSellerCode}
                  />
                )}

                <View style={styles.dialogBtnRow}>
                  <TouchableOpacity style={styles.dialogCancelBtn} onPress={() => setEditUserModalVisible(false)}>
                    <Text style={styles.dialogCancelText}>{t.cancel}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.dialogSubmitBtn} onPress={handleSaveUser} disabled={savingUser}>
                    {savingUser ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.dialogSubmitText}>{t.save}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── Staff List View ─────────────────────────────────── */
              <View style={[styles.dialogBox, { width: '92%', maxWidth: 500, maxHeight: '85%' }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={styles.dialogTitle}>👥 Gestione Staff</Text>
                  <TouchableOpacity onPress={() => setSellersModalVisible(false)} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.addUserBtn} onPress={openAddUserModal}>
                  <Text style={styles.addUserBtnText}>➕ Aggiungi Nuovo Staff / Admin</Text>
                </TouchableOpacity>

                {loadingUsers ? (
                  <ActivityIndicator size="large" color="#FF5500" style={{ marginVertical: 30 }} />
                ) : (
                  <FlatList
                    data={usersList}
                    keyExtractor={(item) => item.id.toString()}
                    style={{ marginTop: 10 }}
                    renderItem={({ item }) => (
                      <View style={styles.userCardItem}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={styles.userNameText}>{item.name}</Text>
                            {item.role === 'admin' ? (
                              <View style={styles.adminBadge}><Text style={styles.badgeText}>ADMIN</Text></View>
                            ) : (
                              <View style={styles.sellerBadge}><Text style={styles.badgeText}>#{item.venditore_code || 'VEND'}</Text></View>
                            )}
                          </View>
                          <Text style={styles.userEmailText}>{item.email}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity onPress={() => openEditUserModal(item)} style={styles.actionIconBtn}>
                            <Text style={{ fontSize: 16 }}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setUserToDelete(item)} style={styles.actionIconBtn}>
                            <Text style={{ fontSize: 16 }}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  />
                )}
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Confirm Delete Modal ────────────────────────────────────── */}
      <Modal
        visible={!!userToDelete}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setUserToDelete(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={[styles.dialogBox, { maxWidth: 380, alignItems: 'center' }]}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>⚠️</Text>
            <Text style={[styles.dialogTitle, { textAlign: 'center', marginBottom: 8 }]}>Conferma Eliminazione</Text>
            <Text style={{ color: '#CCC', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 }}>
              Sei sicuro di voler eliminare l'utente <Text style={{ fontWeight: 'bold', color: '#FFF' }}>"{userToDelete?.name}"</Text>?
            </Text>

            <View style={{ flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' }}>
              <TouchableOpacity 
                style={[styles.dialogCancelBtn, { flex: 1, alignItems: 'center' }]} 
                onPress={() => setUserToDelete(null)}
              >
                <Text style={styles.dialogCancelText}>{t.cancel}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.dialogSubmitBtn, { flex: 1, backgroundColor: '#E53935', alignItems: 'center' }]} 
                onPress={() => handleDeleteUser(userToDelete?.id, userToDelete?.name)}
                disabled={deletingUser}
              >
                {deletingUser ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Elimina</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
          <View style={[styles.dialogBox, { maxWidth: isMobile ? '90%' : 400 }]}>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,85,0,0.1)',
    zIndex: 100,
    elevation: 10,
  },
  drawerButton: {
    padding: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    zIndex: 101,
    elevation: 11,
  },
  hamburgerIcon: {
    color: '#FFF',
    fontSize: 22,
  },
  logo: {
    width: 180,
    height: 56,
  },
  bannerContainer: {
    width: '100%',
    paddingTop: 10,
    paddingBottom: 0,
    alignItems: 'center',
    marginBottom: -10,
  },
  bannerImage: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    transform: [{ scale: 2 }],
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 30,
    alignItems: 'center',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  middleWelcomeTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonsStack: {
    width: '100%',
    gap: 14,
  },
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
  clay3DButtonPurple: {
    backgroundColor: '#5C1A8A',
    shadowColor: '#6A1B9A',
    borderBottomColor: '#3A0F5A',
    borderTopColor: 'rgba(180,100,255,0.25)',
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
  footerContainer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
  },
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
  addUserBtn: {
    backgroundColor: '#6A1B9A',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  addUserBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#11131C',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2D3A',
  },
  userNameText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  userEmailText: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  adminBadge: {
    backgroundColor: 'rgba(229,57,53,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sellerBadge: {
    backgroundColor: 'rgba(255,85,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FF5500',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionIconBtn: {
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#11131C',
    borderWidth: 1,
    borderColor: '#2A2D3A',
    alignItems: 'center',
  },
  rolePillActive: {
    backgroundColor: 'rgba(255,85,0,0.18)',
    borderColor: '#FF5500',
  },
  rolePillText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  rolePillTextActive: {
    color: '#FF5500',
    fontWeight: 'bold',
  },
});
