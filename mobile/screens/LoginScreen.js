import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import axios from 'axios';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = Platform.OS === 'web'
    ? 'http://localhost:5000/api/auth/login'
    : 'http://192.168.12.152:5000/api/auth/login';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(API_URL, { email, password });
      const { user, token } = response.data;

      if (user.role === 'admin') {
        navigation.navigate('AdminDashboard', { user, token });
      } else {
        navigation.navigate('MainTabs', { user, token });
      }
    } catch (error) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.subtitle}>Client Service</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email Address"
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

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.linkText}>Don't have an account? <Text style={styles.linkHighlight}>Sign Up</Text></Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 150,
    height: 150,
    borderRadius: 75,
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
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    backgroundColor: '#161822',
    color: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2A2D3A',
  },
  button: {
    backgroundColor: '#E53935',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
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
});
