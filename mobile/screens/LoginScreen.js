import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State for Segnalatori
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotInput, setForgotInput] = useState('');
  const [sendingReset, setSendingReset] = useState(false);

  const showNotice = (title, msg) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${msg}`);
    } else {
      Alert.alert(title, msg);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotInput.trim()) {
      showNotice('Dato mancante', 'Inserisci la tua Email o il tuo Codice Segnalatore (es. 20C).');
      return;
    }
    setSendingReset(true);
    try {
      const res = await axios.post(`${BASE_URL}/api/segnalatori/forgot-password`, {
        emailOrCode: forgotInput.trim(),
      });
      setForgotModalVisible(false);
      setForgotInput('');
      showNotice('Email Inviata', res.data?.message || 'Controlla la tua email per la nuova password.');
    } catch (err) {
      showNotice(
        'Attenzione',
        err.response?.data?.error || 'Impossibile inviare il recupero password. Verifica email o codice.'
      );
    } finally {
      setSendingReset(false);
    }
  };

  const API_URL = `${BASE_URL}/api/auth/login`;

  // Whenever the user exits or hits browser Back to the Login page, immediately invalidate the session
  // so pressing Forward cannot re-enter without logging in again!
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem('rossomandi_active_session');
        window.sessionStorage.removeItem('rossomandi_active_user');
      }
      AsyncStorage.removeItem('@active_auth_session').catch(() => {});
      AsyncStorage.removeItem('@active_auth_user').catch(() => {});
    }, [])
  );

  const handleLogin = async () => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(
        API_URL,
        { email: cleanEmail, password },
        { timeout: 35000 }
      );
      const { user, token } = response.data;

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('rossomandi_active_session', token);
        window.sessionStorage.setItem('rossomandi_active_user', JSON.stringify(user));
      }
      await AsyncStorage.setItem('@active_auth_session', token).catch(() => {});
      await AsyncStorage.setItem('@active_auth_user', JSON.stringify(user)).catch(() => {});

      if (user.role === 'admin') {
        navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard', params: { user, token } }] });
      } else if (user.role === 'segnalatore') {
        navigation.reset({ index: 0, routes: [{ name: 'SegnalatoreScreen', params: { user, token } }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'SellerDashboard', params: { user, token } }] });
      }
    } catch (error) {
      console.error('Login Error:', error);
      let message = 'Impossibile connettersi al server. Verifica la tua connessione internet.';
      if (error.response) {
        if (typeof error.response.data === 'string') {
          if (error.response.data.includes('<html') || error.response.data.includes('<!DOCTYPE')) {
            message = 'Impossibile connettersi al server. Riprova tra qualche secondo.';
          } else {
            message = error.response.data;
          }
        } else {
          message = error.response.data?.error || `Errore del server (${error.response.status})`;
        }
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Il server sta avviando il servizio. Attendi qualche secondo e riprova.';
      } else if (error.message) {
        message = error.message;
      }
      Alert.alert('Login Non Riuscito', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header / Logo */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>Rossomandi Auto SRL</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#B0B0B0"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#B0B0B0"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 12 }}
              onPress={() => setForgotModalVisible(true)}
            >
              <Text style={{ color: '#94A3B8', fontSize: 13, fontWeight: '600' }}>
                Password dimenticata? <Text style={{ color: '#38BDF8', fontWeight: '800' }}>Recupera Password</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Signup')}>
              <Text style={styles.linkText}>
                Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text>
              </Text>
            </TouchableOpacity>

            {/* Public Guest Catalog Button */}
            <TouchableOpacity 
              style={styles.websiteButton} 
              onPress={() => navigation.navigate('StockUsato', { isGuest: true })}
            >
              <Text style={styles.websiteButtonText}>🚗 Sfoglia Catalogo Auto (Ospite)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Forgot Password Modal */}
      <Modal visible={forgotModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', maxWidth: 400, backgroundColor: '#141722', borderRadius: 18, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF', marginBottom: 6 }}>
              🔑 Recupera Password
            </Text>
            <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>
              Inserisci la tua Email o il tuo Codice Segnalatore (es. 20C). Riceverai subito via email una nuova password.
            </Text>

            <TextInput
              style={[styles.input, { marginBottom: 16 }]}
              placeholder="Email oppure Codice (es. 20C)"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              value={forgotInput}
              onChangeText={setForgotInput}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={() => {
                  setForgotModalVisible(false);
                  setForgotInput('');
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>Annulla</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, backgroundColor: '#FF4757', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
                onPress={handleForgotPassword}
                disabled={sendingReset}
              >
                {sendingReset ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>Invia Email</Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    width: Math.min(width * 0.45, 180),
    height: Math.min(width * 0.45, 180),
    borderRadius: Math.min(width * 0.225, 90),
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E53935',
  },
  subtitle: {
    fontSize: 15,
    color: '#FFC107',
    opacity: 0.9,
    letterSpacing: 1,
    fontWeight: '600',
  },
  form: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: '#161822',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A2D3A',
  },
  button: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    elevation: 3,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#A0AEC0',
    fontSize: 15,
  },
  linkHighlight: {
    color: '#FFC107',
    fontWeight: 'bold',
  },
  websiteButton: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A3F55',
    backgroundColor: '#161822',
    alignItems: 'center',
  },
  websiteButtonText: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: '600',
  },
});
