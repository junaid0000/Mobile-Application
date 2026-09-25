import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Platform,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function PortalListScreen({ navigation, route }) {
  const { user, token } = route.params || {};
  const { width } = useWindowDimensions();

  const [cars, setCars] = useState([]);
  const [contrattiMap, setContrattiMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let carsList = [];
      let contrattiList = [];

      try {
        const carsRes = await axios.get(`${BASE_URL}/api/portal/cars`, { headers });
        if (carsRes.data && carsRes.data.cars) carsList = carsRes.data.cars;
      } catch (err) {
        try {
          const fbCarsRes = await axios.get('http://localhost:5000/api/portal/cars', { headers });
          if (fbCarsRes.data && fbCarsRes.data.cars) carsList = fbCarsRes.data.cars;
        } catch (e2) {}
      }

      try {
        const contrattiRes = await axios.get(`${BASE_URL}/api/portal/contratti`, { headers });
        if (contrattiRes.data && contrattiRes.data.contratti) contrattiList = contrattiRes.data.contratti;
      } catch (err) {
        try {
          const fbContrattiRes = await axios.get('http://localhost:5000/api/portal/contratti', { headers });
          if (fbContrattiRes.data && fbContrattiRes.data.contratti) contrattiList = fbContrattiRes.data.contratti;
        } catch (e2) {}
      }

      setCars(carsList);

      const cMap = {};
      contrattiList.forEach(c => {
        if (c.interno) cMap[String(c.interno)] = c;
        if (c.indice) cMap[`idx_${c.indice}`] = c;
      });
      setContrattiMap(cMap);

    } catch (err) {
      console.error('Error fetching portal cars:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const filteredCars = useMemo(() => {
    return cars.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const marca = (c.marca || '').toLowerCase();
      const modello = (c.modello || '').toLowerCase();
      const indice = String(c.indice || '');
      const nota1 = String(c.nota1 || '').toLowerCase();
      const tipo = String(c.tipo_appunt_vendita || '').toLowerCase();
      return (
        marca.includes(q) ||
        modello.includes(q) ||
        indice.includes(q) ||
        nota1.includes(q) ||
        tipo.includes(q)
      );
    });
  }, [cars, searchQuery]);

  // Quick Stats
  const totalCount = cars.length;
  const pdfCount = cars.filter(c => c.has_pdf).length;
  const missingNota1Count = cars.filter(c => !c.nota1).length;

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.thCell, { width: 90 }]}>INDICE</Text>
      <Text style={[styles.thCell, { width: 110 }]}>MARCA</Text>
      <Text style={[styles.thCell, { flex: 1, minWidth: 280 }]}>MODELLO</Text>
      <Text style={[styles.thCell, { width: 110 }]}>COLORE VN</Text>
      <Text style={[styles.thCell, { width: 110, textAlign: 'right' }]}>RIMBORSO</Text>
      <Text style={[styles.thCell, { width: 110 }]}>TIPO</Text>
      <Text style={[styles.thCell, { width: 120, textAlign: 'right' }]}>RATA FZERO</Text>
      <Text style={[styles.thCell, { width: 110, textAlign: 'center' }]}>NOTA1</Text>
      <Text style={[styles.thCell, { width: 140, textAlign: 'center' }]}>PDF SERVER</Text>
      <Text style={[styles.thCell, { width: 85, textAlign: 'center' }]}>DETTAGLI</Text>
    </View>
  );

  const renderTableRow = ({ item, index }) => {
    const carContratto = contrattiMap[String(item.interno)] || contrattiMap[`idx_${item.indice}`];
    const isEven = index % 2 === 0;

    return (
      <TouchableOpacity
        style={[styles.tableRow, isEven ? styles.tableRowEven : styles.tableRowOdd]}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('PortalCarDetail', { car: item, carContratto, user, token })}
      >
        {/* Indice */}
        <View style={{ width: 90, justifyContent: 'center' }}>
          <Text style={[styles.tdCell, styles.tdBold, { color: '#38BDF8' }]}>
            #{item.indice}
          </Text>
        </View>

        {/* Marca */}
        <View style={{ width: 110, justifyContent: 'center' }}>
          <Text style={[styles.tdCell, styles.tdBold, { color: '#F1F5F9' }]}>
            {item.marca}
          </Text>
        </View>

        {/* Modello (Flex to fill 100% of wide screens) */}
        <View style={{ flex: 1, minWidth: 280, justifyContent: 'center' }}>
          <Text style={[styles.tdCell, { color: '#FFFFFF', fontWeight: '500' }]} numberOfLines={1}>
            {item.modello}
          </Text>
        </View>

        {/* Colore VN */}
        <View style={{ width: 110, justifyContent: 'center' }}>
          <Text style={[styles.tdCell, { color: '#94A3B8' }]}>
            {item.colore_vn || 'N/D'}
          </Text>
        </View>

        {/* Rimborso */}
        <View style={{ width: 110, justifyContent: 'center' }}>
          <Text style={[styles.tdCell, { textAlign: 'right', color: '#CBD5E1' }]}>
            {item.rimborso ? `€ ${Number(item.rimborso).toFixed(2)}` : '-'}
          </Text>
        </View>

        {/* Tipo */}
        <View style={{ width: 110, justifyContent: 'center' }}>
          <Text style={[styles.tdCell, { color: '#94A3B8' }]}>
            {item.tipo_appunt_vendita || 'Esterno'}
          </Text>
        </View>

        {/* Rata FZero */}
        <View style={{ width: 120, justifyContent: 'center' }}>
          <Text style={[styles.tdCell, styles.tdBold, { textAlign: 'right', color: '#2ED573', fontSize: 13 }]}>
            {item.rata_f_zero ? `€ ${Number(item.rata_f_zero).toFixed(2)}` : '-'}
          </Text>
        </View>

        {/* Nota1 */}
        <View style={{ width: 110, alignItems: 'center', justifyContent: 'center' }}>
          {item.nota1 ? (
            <View style={styles.nota1Badge}>
              <Text style={styles.nota1BadgeText}>{item.nota1}</Text>
            </View>
          ) : (
            <View style={styles.missingBadge}>
              <Text style={styles.missingBadgeText}>Vuoto</Text>
            </View>
          )}
        </View>

        {/* PDF Status */}
        <View style={{ width: 130, alignItems: 'center', justifyContent: 'center' }}>
          {item.has_pdf ? (
            <View style={styles.pdfBadgeReady}>
              <Text style={styles.pdfBadgeReadyText}>✓ {item.target_pdf_code}.pdf</Text>
            </View>
          ) : item.nota1 ? (
            <View style={styles.pdfBadgeWaiting}>
              <Text style={styles.pdfBadgeWaitingText}>📁 Non presente</Text>
            </View>
          ) : (
            <View style={styles.pdfBadgeMissing}>
              <Text style={styles.pdfBadgeMissingText}>⚠️ No Nota1</Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <View style={{ width: 85, alignItems: 'center', justifyContent: 'center' }}>
          <View style={styles.actionBtnPill}>
            <Text style={styles.actionBtnPillText}>Apri ➜</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.backButtonText}>‹ Dashboard</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Portale Preventivi Esterni</Text>
          <Text style={styles.headerSubtitle}>tabPreventiviEsterni • Vista Foglio Excel / Access</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Text style={{ fontSize: 18, color: '#38BDF8' }}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Sub-bar with Summary Metrics and Search */}
      <View style={styles.topBarContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Text style={{ fontSize: 15, marginRight: 8 }}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca per Indice, Modello, Marca o Nota1..."
            placeholderTextColor="#64748B"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: '#94A3B8', fontSize: 14, paddingHorizontal: 6 }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Quick Stats Badges */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>Totale:</Text>
            <Text style={[styles.statChipValue, { color: '#FFFFFF' }]}>{totalCount}</Text>
          </View>
          <View style={[styles.statChip, { borderColor: '#2ED573' }]}>
            <Text style={styles.statChipLabel}>PDF Collegati:</Text>
            <Text style={[styles.statChipValue, { color: '#2ED573' }]}>{pdfCount}</Text>
          </View>
          <View style={[styles.statChip, { borderColor: '#F59E0B' }]}>
            <Text style={styles.statChipLabel}>Nota1 Mancante:</Text>
            <Text style={[styles.statChipValue, { color: '#F59E0B' }]}>{missingNota1Count}</Text>
          </View>
        </View>
      </View>

      {/* Main Excel-style Spreadsheet View */}
      <View style={styles.spreadsheetWrapper}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38BDF8" />
            <Text style={styles.loadingText}>Caricamento tabella veicoli dal server...</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.horizontalScroll}
            contentContainerStyle={{ minWidth: '100%', flexGrow: 1 }}
          >
            <View style={{ width: '100%', minWidth: 1165, flex: 1 }}>
              {renderTableHeader()}
              <FlatList
                data={filteredCars}
                keyExtractor={(item, index) => item.id ? String(item.id) : (item.indice || String(index))}
                renderItem={renderTableRow}
                contentContainerStyle={styles.listPadding}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38BDF8" />
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={{ fontSize: 36, marginBottom: 10 }}>📊</Text>
                    <Text style={styles.emptyTitle}>Nessun record trovato</Text>
                    <Text style={styles.emptySubtitle}>Prova a modificare i filtri di ricerca</Text>
                  </View>
                }
              />
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#111827',
  },
  backButton: {
    paddingRight: 12,
  },
  backButtonText: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 1,
  },
  refreshButton: {
    padding: 6,
  },
  topBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statChipLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  statChipValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  spreadsheetWrapper: {
    flex: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  tableHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderBottomWidth: 2,
    borderBottomColor: '#38BDF8',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  thCell: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    paddingHorizontal: 6,
  },
  tableRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  tableRowEven: {
    backgroundColor: '#0F172A',
  },
  tableRowOdd: {
    backgroundColor: '#111C33',
  },
  tdCell: {
    fontSize: 12,
    paddingHorizontal: 6,
  },
  tdBold: {
    fontWeight: '700',
  },
  nota1Badge: {
    backgroundColor: 'rgba(46, 213, 115, 0.15)',
    borderWidth: 1,
    borderColor: '#2ED573',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  nota1BadgeText: {
    color: '#2ED573',
    fontSize: 11,
    fontWeight: '700',
  },
  missingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  missingBadgeText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  pdfBadgeReady: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  pdfBadgeReadyText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  pdfBadgeWaiting: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  pdfBadgeWaitingText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  pdfBadgeMissing: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  pdfBadgeMissingText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnPill: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  actionBtnPillText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 12,
  },
  listPadding: {
    paddingBottom: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
});
