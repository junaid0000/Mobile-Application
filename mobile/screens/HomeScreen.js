import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function HomeScreen({ navigation, route }) {
  // If we passed the user from the login screen
  const userName = route.params?.user?.name || 'Guest';

  return (
    <View style={styles.container}>
      <Text style={styles.brand}>ROSSOMANDI</Text>
      <Text style={styles.welcome}>Welcome back, {userName}!</Text>
      <Text style={styles.subtitle}>Your premium dashboard</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Vehicles</Text>
        <Text style={styles.cardText}>You have no registered vehicles.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My Insurance</Text>
        <Text style={styles.cardText}>Your policies will appear here.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 24,
    fontWeight: '900',
    color: '#E53935',
    letterSpacing: 2,
    marginBottom: 20,
    textAlign: 'center',
  },
  welcome: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0B0',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardText: {
    color: '#B0B0B0',
    fontSize: 14,
  },
  button: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E53935',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
