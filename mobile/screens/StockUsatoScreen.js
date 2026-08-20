import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  RefreshControl
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

// ─── Theme Colors ────────────────────────────────────────────────────────────
const T = {
  bg: '#0F111A',
  surface: '#1A1D2B',
  surfaceAlt: '#232738',
  border: '#2C3146',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#2ED573',
  yellow: '#FFC107',
  blue: '#3B82F6',
  red: '#FF4757',
};

export default function StockUsatoScreen({ navigation, route }) {
  const { user, token } = route?.params || {};
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, PRONTA, DIESEL, BENZINA
  const [selectedCar, setSelectedCar] = useState(null);

  const fetchStock = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/stock-usato`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStock(res.data.stock || []);
    } catch (err) {
      console.error('Error fetching stock_usato:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStock();
    const interval = setInterval(fetchStock, 10000); // refresh inventory every 10s
    return () => clearInterval(interval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStock();
  };

  const filteredStock = useMemo(() => {
    return stock.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (item.marca && item.marca.toLowerCase().includes(q)) ||
        (item.versione && item.versione.toLowerCase().includes(q)) ||
        (item.targa && item.targa.toLowerCase().includes(q));

      let matchesFilter = true;
      if (filterMode === 'PRONTA') {
        matchesFilter = !!item.pronta;
      } else if (filterMode === 'DIESEL') {
        matchesFilter = item.carburante && item.carburante.toLowerCase().includes('diesel');
      } else if (filterMode === 'BENZINA') {
        matchesFilter = item.carburante && item.carburante.toLowerCase().includes('benzin');
      }

      return matchesSearch && matchesFilter;
    });
  }, [stock, searchQuery, filterMode]);

  const formatEuro = (val) => {
    if (!val || isNaN(val) || Number(val) === 0) return 'Non spec.';
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  const formatKm = (val) => {
    if (val === null || val === undefined) return '0 KM';
    return `${new Intl.NumberFormat('it-IT').format(val)} KM`;
  };

  const formatDateStr = (dateStr) => {
    if (!dateStr) return 'N/D';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr).split('T')[0];
      return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'N/D';
    }
  };

  const renderCarItem = ({ item }) => (
    <TouchableOpacity
      style={[s.carCard, item.pronta && s.carCardPronta]}
      activeOpacity={0.7}
      onPress={() => setSelectedCar(item)}
    >
      <View style={s.cardHeaderRow}>
        <View style={s.marcaBadge}>
          <Text style={s.marcaText}>{item.marca || 'VEICOLO'}</Text>
        </View>
        
        {item.pronta ? (
          <View style={s.prontaBadgeGreen}>
            <Text style={s.prontaTextGreen}>✅ PRONTA CONSEGNA</Text>
          </View>
        ) : (
          <View style={s.prontaBadgeAmber}>
            <Text style={s.prontaTextAmber}>⏳ IN PREPARAZIONE</Text>
          </View>
        )}
      </View>

      <Text style={s.versioneText} numberOfLines={2}>
        {item.versione || 'Versione non specificata'}
      </Text>

      <View style={s.cardFooterRow}>
        <View style={s.metaItem}>
          <Text style={s.metaLabel}>🛣️ {formatKm(item.km)}</Text>
        </View>
        {item.carburante ? (
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>⛽ {item.carburante}</Text>
          </View>
        ) : null}
        <View style={s.priceTag}>
          <Text style={s.priceTagText}>{formatEuro(item.prezzo_vendita)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* Top Header Bar */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation?.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={s.backBtn}
            >
              <Text style={s.backBtnText}>◀</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={s.topBarTitle}>Stock Usato</Text>
            <Text style={s.topBarSub}>Inventario Veicoli Rossomandi</Text>
          </View>
        </View>
        <View style={s.statsChip}>
          <Text style={s.statsChipText}>📊 {filteredStock.length} Auto</Text>
        </View>
      </View>

      {/* Search & Filter Section */}
      <View style={s.filterSection}>
        <View style={s.searchBox}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Cerca per Marca, Versione o Targa..."
            placeholderTextColor={T.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: T.textMuted, fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
          <TouchableOpacity
            style={[s.chip, filterMode === 'ALL' && s.chipActive]}
            onPress={() => setFilterMode('ALL')}
          >
            <Text style={[s.chipText, filterMode === 'ALL' && s.chipTextActive]}>Tutti ({stock.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.chip, filterMode === 'PRONTA' && s.chipActiveGreen]}
            onPress={() => setFilterMode('PRONTA')}
          >
            <Text style={[s.chipText, filterMode === 'PRONTA' && s.chipTextActiveGreen]}>
              ✅ Solo Pronta ({stock.filter(x => x.pronta).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.chip, filterMode === 'DIESEL' && s.chipActive]}
            onPress={() => setFilterMode('DIESEL')}
          >
            <Text style={[s.chipText, filterMode === 'DIESEL' && s.chipTextActive]}>⛽ Diesel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.chip, filterMode === 'BENZINA' && s.chipActive]}
            onPress={() => setFilterMode('BENZINA')}
          >
            <Text style={[s.chipText, filterMode === 'BENZINA' && s.chipTextActive]}>⛽ Benzina</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Vehicles List */}
      {loading ? (
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={{ color: T.textSecondary, marginTop: 12 }}>Caricamento inventario usato...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStock}
          keyExtractor={(item) => String(item.indice)}
          renderItem={renderCarItem}
          contentContainerStyle={s.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🚗</Text>
              <Text style={{ color: T.textPrimary, fontSize: 16, fontWeight: 'bold' }}>Nessun veicolo trovato</Text>
              <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                Prova a modificare la ricerca o i filtri selezionati.
              </Text>
            </View>
          }
        />
      )}

      {/* Vehicle Detail Pop-up Modal */}
      <Modal
        visible={!!selectedCar}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCar(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {selectedCar && (
              <ScrollView>
                <View style={s.modalHeader}>
                  <View style={s.marcaBadgeLarge}>
                    <Text style={s.marcaTextLarge}>{selectedCar.marca}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedCar(null)} style={s.closeBtnModal}>
                    <Text style={s.closeTextModal}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.modalVersione}>{selectedCar.versione}</Text>

                {selectedCar.pronta ? (
                  <View style={[s.prontaBadgeGreen, { alignSelf: 'flex-start', marginVertical: 8 }]}>
                    <Text style={s.prontaTextGreen}>✅ PRONTA PER LA CONSEGNA</Text>
                  </View>
                ) : (
                  <View style={[s.prontaBadgeAmber, { alignSelf: 'flex-start', marginVertical: 8 }]}>
                    <Text style={s.prontaTextAmber}>⏳ IN FASE DI PREPARAZIONE</Text>
                  </View>
                )}

                <View style={s.detailGrid}>
                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>🆔 Targa:</Text>
                    <Text style={s.detailValue}>{selectedCar.targa || 'N/D'}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>📅 1° Immatricolazione:</Text>
                    <Text style={s.detailValue}>{formatDateStr(selectedCar.data_immatricolazione)}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>🛣️ Chilometraggio:</Text>
                    <Text style={s.detailValue}>{formatKm(selectedCar.km)}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>🎨 Colore:</Text>
                    <Text style={s.detailValue}>{selectedCar.colore || 'N/D'}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>⛽ Carburante:</Text>
                    <Text style={s.detailValue}>{selectedCar.carburante || 'N/D'}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>⚙️ Cambio:</Text>
                    <Text style={s.detailValue}>{selectedCar.cambio || 'N/D'}</Text>
                  </View>
                </View>

                <View style={s.priceBox}>
                  <View style={s.priceMainRow}>
                    <Text style={s.priceMainLabel}>💶 Prezzo di Vendita:</Text>
                    <Text style={s.priceMainValue}>{formatEuro(selectedCar.prezzo_vendita)}</Text>
                  </View>

                  {selectedCar.prezzo_stimato ? (
                    <View style={s.priceSubRow}>
                      <Text style={s.priceSubLabel}>🏷️ Prezzo Stimato:</Text>
                      <Text style={s.priceSubValue}>{formatEuro(selectedCar.prezzo_stimato)}</Text>
                    </View>
                  ) : null}

                  {selectedCar.prezzo_aut ? (
                    <View style={s.priceSubRow}>
                      <Text style={s.priceSubLabel}>💼 Prezzo Dealer (Aut):</Text>
                      <Text style={s.priceSubValue}>{formatEuro(selectedCar.prezzo_aut)}</Text>
                    </View>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={s.dismissBtn}
                  onPress={() => setSelectedCar(null)}
                >
                  <Text style={s.dismissBtnText}>Chiudi Dettagli</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  topBar: {
    backgroundColor: '#161822',
    paddingTop: Platform.OS === 'ios' ? 55 : 25,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topBarTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  topBarSub: {
    color: T.textSecondary,
    fontSize: 11,
  },
  statsChip: {
    backgroundColor: 'rgba(46,213,115,0.15)',
    borderColor: 'rgba(46,213,115,0.3)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statsChipText: {
    color: T.accent,
    fontSize: 13,
    fontWeight: 'bold',
  },
  filterSection: {
    padding: 12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: {
    flex: 1,
    color: T.textPrimary,
    fontSize: 14,
  },
  chipScroll: {
    marginTop: 10,
  },
  chip: {
    backgroundColor: T.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipActive: {
    backgroundColor: T.blue,
    borderColor: T.blue,
  },
  chipActiveGreen: {
    backgroundColor: T.accent,
    borderColor: T.accent,
  },
  chipText: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  chipTextActiveGreen: {
    color: '#0F111A',
    fontWeight: 'bold',
  },
  listPadding: {
    padding: 12,
  },
  carCard: {
    backgroundColor: T.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  carCardPronta: {
    borderColor: 'rgba(46,213,115,0.3)',
    backgroundColor: '#1C2424',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  marcaBadge: {
    backgroundColor: T.blue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  marcaText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  prontaBadgeGreen: {
    backgroundColor: 'rgba(46,213,115,0.18)',
    borderColor: T.accent,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prontaTextGreen: {
    color: T.accent,
    fontSize: 11,
    fontWeight: 'bold',
  },
  prontaBadgeAmber: {
    backgroundColor: 'rgba(255,193,7,0.15)',
    borderColor: T.yellow,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  prontaTextAmber: {
    color: T.yellow,
    fontSize: 11,
    fontWeight: 'bold',
  },
  versioneText: {
    color: T.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  metaItem: {
    backgroundColor: T.surfaceAlt,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  metaLabel: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  priceTag: {
    backgroundColor: 'rgba(46,213,115,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceTagText: {
    color: T.accent,
    fontSize: 15,
    fontWeight: '800',
  },
  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: T.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: T.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marcaBadgeLarge: {
    backgroundColor: T.blue,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  marcaTextLarge: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtnModal: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: T.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeTextModal: {
    color: T.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalVersione: {
    color: T.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
  },
  detailGrid: {
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 14,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  detailLabel: {
    color: T.textSecondary,
    fontSize: 13,
  },
  detailValue: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  priceBox: {
    backgroundColor: 'rgba(46,213,115,0.1)',
    borderColor: 'rgba(46,213,115,0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  priceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceMainLabel: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  priceMainValue: {
    color: T.accent,
    fontSize: 22,
    fontWeight: '800',
  },
  priceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceSubLabel: {
    color: T.textSecondary,
    fontSize: 12,
  },
  priceSubValue: {
    color: T.yellow,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dismissBtn: {
    backgroundColor: T.surfaceAlt,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  dismissBtnText: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
