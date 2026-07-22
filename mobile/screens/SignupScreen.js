import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Image, ScrollView } from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function SignupScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('seller'); // 'seller' | 'admin'
  const [venditoreCode, setVenditoreCode] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [availableSellers, setAvailableSellers] = useState(['GC', 'MR', 'IS', 'AP']);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch distinct active seller codes from backend
    axios.get(`${BASE_URL}/api/public/sellers-list`)
      .then(res => {
        if (res.data?.sellers && res.data.sellers.length > 0) {
          setAvailableSellers(res.data.sellers);
        }
      })
      .catch(err => console.log('Could not fetch public seller codes:', err));
  }, []);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Errore', 'Compila tutti i campi obbligatori');
      return;
    }
    
    const emailLower = email.toLowerCase().trim();
    const isKnownAdminEmail = emailLower.includes('junaid') || emailLower.includes('lorenzo') || emailLower.includes('francesco') || emailLower.includes('valentina') || emailLower.includes('admin') || emailLower.endsWith('@rossomandi.com');

    if (role === 'admin' && !isKnownAdminEmail && !adminCode.trim()) {
      Alert.alert('Errore', 'Inserisci il Codice di Sicurezza Amministratore (es. 1234)');
      return;
    }
    if (role === 'seller' && !venditoreCode.trim()) {
      Alert.alert('Errore', 'Seleziona o inserisci il tuo Codice Venditore (es. MR, AP, GC)');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BASE_URL}/api/auth/signup`, {
        name,
        email,
        password,
        role,
        venditore_code: role === 'seller' ? venditoreCode.trim().toUpperCase() : null,
        admin_code: role === 'admin' ? adminCode.trim() : null,
      });

      Alert.alert('Successo', 'Account creato con successo! Ora puoi effettuare il login.');
      navigation.navigate('Login');
    } catch (error) {
      Alert.alert('Registrazione Fallita', error.response?.data?.error || 'Errore di connessione al server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        <Text style={styles.subtitle}>Crea il tuo Account</Text>
      </View>

      <View style={styles.form}>
        {/* Role Selector Pills (Admin & Venditore only) */}
        <Text style={styles.roleLabel}>Tipo di Account:</Text>
        <View style={styles.rolePillsRow}>
          <TouchableOpacity 
            style={[styles.rolePill, role === 'seller' && styles.rolePillActive]} 
            onPress={() => setRole('seller')}
          >
            <Text style={[styles.rolePillText, role === 'seller' && styles.rolePillTextActive]}>💼 Venditore</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.rolePill, role === 'admin' && styles.rolePillActive]} 
            onPress={() => setRole('admin')}
          >
            <Text style={[styles.rolePillText, role === 'admin' && styles.rolePillTextActive]}>👑 Admin</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Nome e Cognome"
          placeholderTextColor="#B0B0B0"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Email Ufficiale"
          placeholderTextColor="#B0B0B0"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#B0B0B0"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {/* Admin Security Passcode Input (Only if Admin is selected) */}
        {role === 'admin' && (
          <View style={styles.adminCodeBox}>
            <Text style={styles.adminCodeLabel}>🔒 Codice di Sicurezza Amministratore:</Text>
            <TextInput
              style={[styles.input, { borderColor: '#E53935', marginBottom: 0 }]}
              placeholder="Inserisci Codice Sicurezza Admin"
              placeholderTextColor="#EF9A9A"
              secureTextEntry
              value={adminCode}
              onChangeText={setAdminCode}
            />
          </View>
        )}

        {/* Seller Code Selector / Input (Only if Seller is selected) */}
        {role === 'seller' && (
          <View style={styles.sellerCodeBox}>
            <Text style={styles.sellerCodeLabel}>Seleziona o conferma il tuo Codice Venditore:</Text>
            <View style={styles.codePillsRow}>
              {availableSellers.map(code => (
                <TouchableOpacity
                  key={code}
                  style={[styles.codePill, venditoreCode === code && styles.codePillActive]}
                  onPress={() => setVenditoreCode(code)}
                >
                  <Text style={[styles.codePillText, venditoreCode === code && styles.codePillTextActive]}>
                    #{code}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, { borderColor: '#FF5500', marginTop: 12, marginBottom: 0 }]}
              placeholder="Oppure inserisci codice venditore"
              placeholderTextColor="#FF9966"
              autoCapitalize="characters"
              value={venditoreCode}
              onChangeText={setVenditoreCode}
            />
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Registrati</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Hai già un account? <Text style={styles.linkHighlight}>Accedi</Text></Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  form: {
    width: '100%',
  },
  roleLabel: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  rolePillsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  rolePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#161822',
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
    fontSize: 14,
    fontWeight: '600',
  },
  rolePillTextActive: {
    color: '#FF5500',
    fontWeight: 'bold',
  },
  adminCodeBox: {
    backgroundColor: 'rgba(229,57,53,0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.25)',
    marginBottom: 16,
  },
  adminCodeLabel: {
    color: '#FFCDD2',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  sellerCodeBox: {
    backgroundColor: 'rgba(255,85,0,0.06)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,85,0,0.2)',
    marginBottom: 16,
  },
  sellerCodeLabel: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  codePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  codePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#444',
  },
  codePillActive: {
    backgroundColor: '#FF5500',
    borderColor: '#FF5500',
  },
  codePillText: {
    color: '#CCC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  codePillTextActive: {
    color: '#FFF',
  },
  input: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  button: {
    backgroundColor: '#FF5500',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#888888',
    fontSize: 14,
  },
  linkHighlight: {
    color: '#FF5500',
    fontWeight: 'bold',
  },
});
