import React from 'react';
import { View, Text, StyleSheet, Platform, Image, ScrollView, TouchableOpacity } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

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

const PROMOTIONS = [
  {
    id: '1',
    make: 'Ferrari',
    model: 'SF90 Stradale',
    tag: 'SUPERCAR',
    image: require('../assets/images/ferrari_promo.png'),
    offer: 'Finanziamento Tasso Zero',
  },
  {
    id: '2',
    make: 'Porsche',
    model: '911 GT3 RS',
    tag: 'KM 0',
    image: require('../assets/images/porsche_promo.png'),
    offer: 'Pronta Consegna',
  },
  {
    id: '3',
    make: 'Audi',
    model: 'RS e-tron GT',
    tag: 'OFFERTA SPECIALE',
    image: require('../assets/images/audi_promo.png'),
    offer: 'Ecoincentivi Inclusi',
  },
];

export default function InventoryScreen() {
  const handleOpenPromo = async () => {
    await WebBrowser.openBrowserAsync('https://www.rossomandi.com');
  };

  return (
    <View style={s.container}>
      {/* Top decorative bar */}
      <View style={s.topBar}>
        <Image 
          source={require('../assets/images/logo.png')} 
          style={s.topBarLogo} 
          resizeMode="contain" 
        />
        <Text style={s.topBarSub}>Inventory</Text>
      </View>

      <ScrollView style={s.scrollArea} contentContainerStyle={s.content}>
        
        {/* Title */}
        <Text style={s.mainTitle}>Offerte Speciali</Text>
        <Text style={s.mainSubtitle}>Scopri le nostre migliori promozioni in evidenza</Text>

        {/* Promotions Carousel */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={s.carousel}
          contentContainerStyle={{ paddingRight: 30 }}
        >
          {PROMOTIONS.map((promo) => (
            <TouchableOpacity key={promo.id} style={s.promoCard} onPress={handleOpenPromo}>
              <Image source={promo.image} style={s.promoImage} />
              <View style={s.promoOverlay}>
                <View style={s.promoTag}>
                  <Text style={s.promoTagText}>{promo.tag}</Text>
                </View>
                <View style={s.promoDetails}>
                  <Text style={s.promoTitle}>{promo.make} {promo.model}</Text>
                  <Text style={s.promoOffer}>{promo.offer}</Text>
                  <View style={s.promoButton}>
                    <Text style={s.promoButtonText}>Scopri l'offerta ↗</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Info card (Legacy DB placeholder) */}
        <View style={s.infoCard}>
          <View style={s.infoIconBox}>
            <Text style={s.infoIcon}>📡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.infoTitle}>Inventario Completo in Arrivo</Text>
            <Text style={s.infoText}>
              Questa sezione mostrerà presto lo stock aggiornato in tempo reale direttamente dal database MS Access dell'ufficio.
            </Text>
          </View>
        </View>

      </ScrollView>
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
    paddingBottom: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  topBarSub: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  mainTitle: {
    color: T.textPrimary,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  mainSubtitle: {
    color: T.textSecondary,
    fontSize: 14,
    marginBottom: 20,
  },
  carousel: {
    marginBottom: 30,
    overflow: 'visible',
  },
  promoCard: {
    width: 280,
    height: 380,
    backgroundColor: T.surface,
    borderRadius: 20,
    marginRight: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: T.border,
  },
  promoImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    opacity: 0.8,
  },
  promoOverlay: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  promoTag: {
    backgroundColor: T.red,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  promoTagText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  promoDetails: {
    marginTop: 'auto',
  },
  promoTitle: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  promoOffer: {
    color: T.yellow,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  promoButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  promoButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 16,
    padding: 16,
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 2,
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
});
