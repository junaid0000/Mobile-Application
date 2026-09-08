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
  RefreshControl,
  Linking,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/apiConfig';

// ─── Professional Dark Design Palette ────────────────────────────────────────
const T = {
  bg: '#0B0E14',
  surface: '#141824',
  surfaceAlt: '#1E2336',
  surfaceHeader: '#181C2B',
  border: '#2A3047',
  borderLight: '#343B57',
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#2ED573',
  yellow: '#FFC107',
  blue: '#3B82F6',
  red: '#FF4757',
  purple: '#A855F7',
};

export default function StockUsatoScreen({ navigation, route }) {
  const { user, token: paramToken, isGuest } = route?.params || {};
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // ALL, PRONTA, DIESEL, BENZINA
  const [selectedCar, setSelectedCar] = useState(null);

  const fetchStock = async () => {
    try {
      let activeToken = paramToken;
      if (!activeToken && !isGuest) {
        activeToken = await AsyncStorage.getItem('userToken');
      }
      if (isGuest && !activeToken) {
        try {
          const authRes = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@rossomandi.com',
            password: 'admin123'
          }, { timeout: 10000 });
          activeToken = authRes.data.token;
        } catch (e) {
          console.log('Guest auth fallback:', e.message);
        }
      }
      const headers = activeToken ? { Authorization: `Bearer ${activeToken}` } : {};
      const res = await axios.get(`${BASE_URL}/api/stock-usato`, { headers });
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
    if (val === null || val === undefined || String(val).trim() === '' || String(val).trim() === 'N/D') return 'Non specificato';
    let raw = String(val).replace('€', '').replace(/\s/g, '').trim();
    if (!raw) return 'Non specificato';

    // Convert Italian thousand/decimal notation to standard float string if needed
    if (raw.includes(',')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    }

    let num = parseFloat(raw);
    if (isNaN(num)) return String(val).trim();
    if (num === 0) return '0,00 €';

    // Handle OLEDB 10,000 multiplier scaling quirk (e.g. 168000000.0 -> 16800.0)
    if (num >= 1000000) {
      num = num / 10000.0;
    }

    const formatted = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    return `${formatted} €`;
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

  // ─── Professional 3-Column Table Row Item ──────────────────────────────────
  const renderTableRow = ({ item, index }) => (
    <TouchableOpacity
      style={[
        s.tableRow,
        index % 2 === 1 ? s.tableRowOdd : s.tableRowEven,
        item.pronta && s.tableRowProntaBorder
      ]}
      activeOpacity={0.7}
      onPress={() => !isGuest && setSelectedCar(item)}
    >
      {/* Col 0: Index Number */}
      <View style={s.colIndex}>
        <Text style={s.indexText}>#{index + 1}</Text>
      </View>

      {/* Col 1: MARCA */}
      <View style={s.colMarca}>
        <View style={s.marcaPill}>
          <Text style={s.marcaText} numberOfLines={1}>{item.marca || 'GENERICO'}</Text>
        </View>
      </View>

      {/* Col 2: VERSIONE */}
      <View style={s.colVersione}>
        <Text style={s.versioneText} numberOfLines={2}>
          {item.versione || 'Versione non specificata'}
        </Text>
      </View>

      {/* Col 3: PRONTA Column (Checkbox / Status Badge) */}
      <View style={s.colPronta}>
        {item.pronta ? (
          <View style={s.prontaBadgeGreen}>
            <Text style={s.prontaCheckIcon}>☑</Text>
            <Text style={s.prontaTextGreen}>PRONTA</Text>
          </View>
        ) : (
          <View style={s.prontaBadgeAmber}>
            <Text style={s.prontaBoxIcon}>☐</Text>
            <Text style={s.prontaTextAmber}>IN PREP</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* Top Navigation Header */}
      <View style={s.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation?.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={s.backBtn}
            >
              <Text style={s.backBtnText}>◀ Indietro</Text>
            </TouchableOpacity>
          )}
          <View>
            <Text style={s.topBarTitle}>Stock Usato</Text>
            <Text style={s.topBarSub}>Catalogo Veicoli Rossomandi</Text>
          </View>
        </View>
        <View style={s.statsChip}>
          <Text style={s.statsChipText}>📊 {filteredStock.length} Auto</Text>
        </View>
      </View>

      {/* Search Bar & Category Filters */}
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

      {/* 3-Column Professional Table Header */}
      <View style={s.tableHeaderRow}>
        <View style={s.colIndex}>
          <Text style={s.tableHeaderTitle}>#</Text>
        </View>
        <View style={s.colMarca}>
          <Text style={s.tableHeaderTitle}>MARCA</Text>
        </View>
        <View style={s.colVersione}>
          <Text style={s.tableHeaderTitle}>VERSIONE</Text>
        </View>
        <View style={s.colPronta}>
          <Text style={[s.tableHeaderTitle, { textAlign: 'center' }]}>PRONTA</Text>
        </View>
      </View>

      {/* Vehicles Table List */}
      {loading ? (
        <View style={s.centerLoading}>
          <ActivityIndicator size="large" color={T.accent} />
          <Text style={{ color: T.textSecondary, marginTop: 12 }}>Caricamento inventario usato...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStock}
          keyExtractor={(item) => String(item.indice)}
          renderItem={renderTableRow}
          contentContainerStyle={s.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.accent} />
          }
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🚗</Text>
              <Text style={{ color: T.textPrimary, fontSize: 16, fontWeight: 'bold' }}>Nessun veicolo trovato</Text>
              <Text style={{ color: T.textMuted, fontSize: 13, marginTop: 4, textAlign: 'center' }}>
                Nessun veicolo corrisponde alla ricerca o ai filtri selezionati.
              </Text>
            </View>
          }
        />
      )}

      {/* Specific Vehicle Detail View Page (Modal) */}
      <Modal
        visible={!!selectedCar}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCar(null)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            {selectedCar && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Modal Header */}
                <View style={s.modalHeader}>
                  <View>
                    <View style={s.modalMarcaTag}>
                      <Text style={s.modalMarcaTagText}>{selectedCar.marca}</Text>
                    </View>
                    <Text style={s.modalVersioneTitle}>{selectedCar.versione}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedCar(null)} style={s.closeBtnModal}>
                    <Text style={s.closeTextModal}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.divider} />

                {/* Section Title */}
                <Text style={s.sectionHeader}>📋 Scheda Tecnica e Dettagli Specifici</Text>

                {/* Specific Car Details List */}
                <View style={s.detailGrid}>
                  {!isGuest && (
                    <View style={s.detailRow}>
                      <Text style={s.detailLabel}>🆔 Targa Veicolo:</Text>
                      <Text style={s.detailValueBadge}>{selectedCar.targa || 'N/D'}</Text>
                    </View>
                  )}

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>⚡ Stato Disponibilità:</Text>
                    <Text style={[s.detailValueBadge, { backgroundColor: selectedCar.pronta ? '#2ED57322' : '#FF475722', color: selectedCar.pronta ? '#2ED573' : '#FF4757' }]}>
                      {selectedCar.pronta ? '✅ Pronta Consegna' : '⏳ In Arrivo'}
                    </Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>📅 1° Immatricolazione:</Text>
                    <Text style={s.detailValue}>{formatDateStr(selectedCar.data_immatricolazione)}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>🛣️ Chilometraggio (KM):</Text>
                    <Text style={s.detailValueHighlight}>{formatKm(selectedCar.km)}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>🎨 Colore Carrozzeria:</Text>
                    <Text style={s.detailValue}>{selectedCar.colore || 'N/D'}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>⛽ Carburante / Alimentazione:</Text>
                    <Text style={s.detailValue}>{selectedCar.carburante || 'N/D'}</Text>
                  </View>

                  <View style={s.detailRow}>
                    <Text style={s.detailLabel}>⚙️ Tipo Cambio:</Text>
                    <Text style={s.detailValue}>{selectedCar.cambio || 'N/D'}</Text>
                  </View>
                </View>

                {/* Financial / Pricing Details Card - HIDDEN FOR GUESTS */}
                {!isGuest ? (
                  <View style={s.priceBox}>
                    <Text style={s.priceBoxTitle}>💶 Informazioni Prezzo & Valutazione</Text>
                    
                    <View style={s.priceMainRow}>
                      <Text style={s.priceMainLabel}>Prezzo di Vendita:</Text>
                      <Text style={s.priceMainValue}>{formatEuro(selectedCar.prezzo_vendita)}</Text>
                    </View>

                    {selectedCar.prezzo_stimato ? (
                      <View style={s.priceSubRow}>
                        <Text style={s.priceSubLabel}>Prezzo Stimato:</Text>
                        <Text style={s.priceSubValue}>{formatEuro(selectedCar.prezzo_stimato)}</Text>
                      </View>
                    ) : null}

                    {selectedCar.prezzo_aut ? (
                      <View style={s.priceSubRow}>
                        <Text style={s.priceSubLabel}>Prezzo AutoScout (Aut):</Text>
                        <Text style={s.priceSubValue}>{formatEuro(selectedCar.prezzo_aut)}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <TouchableOpacity 
                    style={[s.dismissBtn, { backgroundColor: '#FFC107', marginTop: 16 }]}
                    onPress={() => Linking.openURL('https://www.rossomandi.it')}
                  >
                    <Text style={[s.dismissBtnText, { color: '#000000', fontWeight: 'bold' }]}>🌐 Contatta Rossomandi Auto SRL</Text>
                  </TouchableOpacity>
                )}

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
    backgroundColor: T.surfaceHeader,
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
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 13,
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
    color: '#0B0E14',
    fontWeight: 'bold',
  },

  // ─── Table Header & Column Styles ──────────────────────────────────────────
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#161926',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.borderLight,
    alignItems: 'center',
  },
  tableHeaderTitle: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },

  colIndex: {
    width: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colMarca: {
    width: 95,
    paddingRight: 6,
  },
  colVersione: {
    flex: 1,
    paddingRight: 6,
  },
  colPronta: {
    width: 85,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  // ─── Table Row Item Styles ─────────────────────────────────────────────────
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tableRowEven: {
    backgroundColor: T.surface,
  },
  tableRowOdd: {
    backgroundColor: '#111420',
  },
  tableRowProntaBorder: {
    borderLeftWidth: 3,
    borderLeftColor: T.accent,
  },

  indexText: {
    color: T.yellow,
    fontSize: 12,
    fontWeight: 'bold',
  },
  marcaPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  marcaText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: 'bold',
  },
  versioneText: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 17,
  },

  prontaBadgeGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 213, 115, 0.15)',
    borderColor: 'rgba(46, 213, 115, 0.4)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  prontaCheckIcon: {
    color: T.accent,
    fontSize: 12,
    marginRight: 3,
    fontWeight: 'bold',
  },
  prontaTextGreen: {
    color: T.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },

  prontaBadgeAmber: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.12)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  prontaBoxIcon: {
    color: T.yellow,
    fontSize: 12,
    marginRight: 3,
  },
  prontaTextAmber: {
    color: T.yellow,
    fontSize: 10,
    fontWeight: 'bold',
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listPadding: {
    paddingBottom: 30,
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
  },

  // ─── Specific Vehicle Detail Page Modal Styles ────────────────────────────
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
    borderColor: T.borderLight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalMarcaTag: {
    backgroundColor: T.blue,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  modalMarcaTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalVersioneTitle: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
    maxWidth: 260,
  },
  closeBtnModal: {
    backgroundColor: T.surfaceAlt,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  closeTextModal: {
    color: T.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginVertical: 14,
  },
  sectionHeader: {
    color: T.textSecondary,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailGrid: {
    backgroundColor: T.bg,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: T.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  detailLabel: {
    color: T.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    color: T.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  detailValueBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: T.yellow,
    fontSize: 13,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  detailValueHighlight: {
    color: T.accent,
    fontSize: 13,
    fontWeight: 'bold',
  },
  priceBox: {
    backgroundColor: 'rgba(46, 213, 115, 0.08)',
    borderColor: 'rgba(46, 213, 115, 0.25)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  priceBoxTitle: {
    color: T.accent,
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  priceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceMainLabel: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  priceMainValue: {
    color: T.accent,
    fontSize: 20,
    fontWeight: '900',
  },
  priceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
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
    borderWidth: 1,
    borderColor: T.borderLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 6,
  },
  dismissBtnText: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
