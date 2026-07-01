import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const T = {
  bg: '#000000',
  surface: '#161822',
  red: '#E53935',
  yellow: '#FFC107',
  redLight: 'rgba(229,57,53,0.12)',
  redBorder: 'rgba(229,57,53,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textMuted: '#718096',
  border: '#2A2D3A',
  shadow: 'rgba(0,0,0,0.5)',
};

export default function InventoryScreen() {
  return (
    <View style={s.container}>
      {/* Top decorative bar */}
      <View style={s.topBar}>
        <Text style={s.topBarBrand}>ROSSOMANDI</Text>
        <Text style={s.topBarSub}>Inventory</Text>
      </View>

      {/* Main content */}
      <View style={s.content}>
        {/* Icon circle */}
        <View style={s.iconCircle}>
          <Text style={s.icon}>🚗</Text>
        </View>

        <Text style={s.title}>Inventario Veicoli</Text>
        <Text style={s.subtitle}>
          I dati dell'inventario saranno{'\n'}
          disponibili presto dal database{'\n'}
          dell'ufficio Rossomandi.
        </Text>

        {/* Progress dots */}
        <View style={s.dotsRow}>
          <View style={[s.dot, s.dotActive]} />
          <View style={s.dot} />
          <View style={s.dot} />
        </View>

        {/* Info card */}
        <View style={s.infoCard}>
          <View style={s.infoIconBox}>
            <Text style={s.infoIcon}>📡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>In Arrivo</Text>
            <Text style={s.infoText}>
              Questa sezione mostrerà lo stock aggiornato in tempo reale direttamente dal database dell'ufficio.
            </Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statNum}>—</Text>
            <Text style={s.statLabel}>Veicoli disponibili</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statCard}>
            <Text style={s.statNum}>—</Text>
            <Text style={s.statLabel}>Ultimo Aggiornamento</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  topBar: {
    backgroundColor: T.surface,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarBrand: {
    color: T.red,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  topBarSub: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    backgroundColor: T.bg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: T.redLight,
    borderWidth: 1,
    borderColor: T.redBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    color: T.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3A3D4A',
  },
  dotActive: {
    backgroundColor: T.yellow,
    width: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 16,
    gap: 15,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 30,
  },
  infoIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#222533',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 20,
  },
  infoTitle: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: T.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    width: '100%',
    maxWidth: 400,
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    color: T.yellow,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: T.border,
  },
});
