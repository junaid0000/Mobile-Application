import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function AdminSegnalatoriScreen({ navigation, route }) {
  const { user, token } = route.params || {};
  const { width } = useWindowDimensions();
  const isCompact = width < 860;

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'logged'

  const fetchSegnalatori = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await axios.get(`${BASE_URL}/api/segnalatori/list`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.segnalatori) {
        setList(res.data.segnalatori);
      }
    } catch (err) {
      console.log('Error fetching segnalatori:', err.message);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSegnalatori(false);
    const interval = setInterval(() => {
      fetchSegnalatori(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSegnalatori]);

  const activeCount = useMemo(() => list.filter((x) => x.attivo).length, [list]);
  const loggedCount = useMemo(() => list.filter((x) => x.last_login_at).length, [list]);

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      if (filterMode === 'active' && !item.attivo) return false;
      if (filterMode === 'logged' && !item.last_login_at) return false;
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        String(item.full_code || '').toLowerCase().includes(q) ||
        String(item.cognome_nome || '').toLowerCase().includes(q) ||
        String(item.email || '').toLowerCase().includes(q) ||
        String(item.telefono || '').toLowerCase().includes(q)
      );
    });
  }, [list, search, filterMode]);

  const handleOpenRow = (item) => {
    navigation.navigate('SegnalatoreScreen', {
      user,
      token,
      isAdminPreview: true,
      previewSegnalatore: item,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* ── Top Professional Toolbar Header ── */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Dashboard</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Registro Segnalatori</Text>
            <Text style={styles.headerSubtitle}>
              Sincronizzato in tempo reale con Access (Tabella Segnalatori)
            </Text>
          </View>
        </View>

        {/* Summary KPI Badges + Refresh */}
        <View style={styles.headerRight}>
          <View style={styles.kpiPill}>
            <Text style={styles.kpiLabel}>TOTALE</Text>
            <Text style={styles.kpiValue}>{list.length}</Text>
          </View>
          <View style={[styles.kpiPill, styles.kpiPillGreen]}>
            <Text style={[styles.kpiLabel, { color: '#34D399' }]}>ATTIVI</Text>
            <Text style={[styles.kpiValue, { color: '#34D399' }]}>{activeCount}</Text>
          </View>
          <View style={[styles.kpiPill, styles.kpiPillBlue]}>
            <Text style={[styles.kpiLabel, { color: '#38BDF8' }]}>ONLINE</Text>
            <Text style={[styles.kpiValue, { color: '#38BDF8' }]}>{loggedCount}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => fetchSegnalatori(false)}
          >
            <Text style={styles.refreshBtnText}>↻ Aggiorna</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Bar & Filter Tabs Row ── */}
      <View style={styles.toolbarSection}>
        <View style={[styles.toolbarInner, isCompact && { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={styles.searchWrapper}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca per Codice (es. 20C), Cognome Nome, Email o Telefono..."
              placeholderTextColor="#64748B"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterTabsGroup}>
            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'all' && styles.filterTabActive]}
              onPress={() => setFilterMode('all')}
            >
              <Text style={[styles.filterTabText, filterMode === 'all' && styles.filterTabTextActive]}>
                Tutti ({list.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'active' && styles.filterTabActive]}
              onPress={() => setFilterMode('active')}
            >
              <Text style={[styles.filterTabText, filterMode === 'active' && styles.filterTabTextActive]}>
                ✓ Attivi ({activeCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'logged' && styles.filterTabActive]}
              onPress={() => setFilterMode('logged')}
            >
              <Text style={[styles.filterTabText, filterMode === 'logged' && styles.filterTabTextActive]}>
                📱 Entrati in App ({loggedCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Main Excel-Style Data Table ── */}
      <View style={styles.tableWrapperOuter}>
        <View style={styles.tableContainer}>
          {/* Sticky Table Header Row */}
          <ScrollView
            horizontal={isCompact}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View style={{ flex: 1, minWidth: isCompact ? 920 : '100%' }}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.thText, styles.colCode]}>CODICE</Text>
                <Text style={[styles.thText, styles.colName]}>COGNOME E NOME</Text>
                <Text style={[styles.thText, styles.colTipo]}>TIPO</Text>
                <Text style={[styles.thText, styles.colTariffa]}>TARIFFA</Text>
                <Text style={[styles.thText, styles.colStatus]}>STATO</Text>
                <Text style={[styles.thText, styles.colDate]}>ATTIVAZIONE</Text>
                <Text style={[styles.thText, styles.colPhone]}>TELEFONO</Text>
                <Text style={[styles.thText, styles.colEmail]}>E-MAIL</Text>
                <Text style={[styles.thText, styles.colLogin]}>ACCESSO APP</Text>
                <Text style={[styles.thText, styles.colAction]}>AZIONE</Text>
              </View>

              {loading ? (
                <View style={styles.centerBox}>
                  <ActivityIndicator size="large" color="#38BDF8" />
                </View>
              ) : filteredList.length === 0 ? (
                <View style={styles.centerBox}>
                  <Text style={styles.emptyText}>Nessun segnalatore trovato per i filtri selezionati.</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.tableBodyScroll}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={() => {
                        setRefreshing(true);
                        fetchSegnalatori(false);
                      }}
                      tintColor="#38BDF8"
                    />
                  }
                >
                  {filteredList.map((item, idx) => {
                    const isEven = idx % 2 === 0;
                    const hasLoggedIn = Boolean(item.last_login_at);
                    const loginDateStr = hasLoggedIn
                      ? new Date(item.last_login_at).toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : null;

                    return (
                      <TouchableOpacity
                        key={String(item.codice)}
                        style={[
                          styles.tableRow,
                          isEven ? styles.tableRowEven : styles.tableRowOdd,
                        ]}
                        activeOpacity={0.75}
                        onPress={() => handleOpenRow(item)}
                      >
                        {/* 1. CODICE */}
                        <View style={[styles.tdCell, styles.colCode]}>
                          <View style={styles.codeChip}>
                            <Text style={styles.codeChipText}>{item.full_code}</Text>
                          </View>
                        </View>

                        {/* 2. COGNOME E NOME */}
                        <View style={[styles.tdCell, styles.colName]}>
                          <Text style={styles.cellNameText} numberOfLines={1}>
                            {item.cognome_nome}
                          </Text>
                        </View>

                        {/* 3. TIPO */}
                        <View style={[styles.tdCell, styles.colTipo]}>
                          <View style={styles.tipoBadge}>
                            <Text style={styles.tipoBadgeText}>{item.tipo || '-'}</Text>
                          </View>
                        </View>

                        {/* 4. TARIFFA */}
                        <View style={[styles.tdCell, styles.colTariffa]}>
                          <Text
                            style={[
                              styles.cellMoneyText,
                              Number(item.tariffa_provv) > 0 && { color: '#FBBF24' },
                            ]}
                          >
                            € {Number(item.tariffa_provv || 0)}
                          </Text>
                        </View>

                        {/* 5. STATO (Attivo) */}
                        <View style={[styles.tdCell, styles.colStatus]}>
                          <View
                            style={[
                              styles.statusDotBadge,
                              item.attivo ? styles.statusActiveBg : styles.statusInactiveBg,
                            ]}
                          >
                            <View
                              style={[
                                styles.statusDot,
                                { backgroundColor: item.attivo ? '#10B981' : '#64748B' },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusBadgeLabel,
                                { color: item.attivo ? '#34D399' : '#94A3B8' },
                              ]}
                            >
                              {item.attivo ? 'Attivo' : 'Inattivo'}
                            </Text>
                          </View>
                        </View>

                        {/* 6. DATA ATTIVAZIONE */}
                        <View style={[styles.tdCell, styles.colDate]}>
                          <Text style={styles.cellNormalText}>
                            {item.data_attivazione || '—'}
                          </Text>
                        </View>

                        {/* 7. TELEFONO */}
                        <View style={[styles.tdCell, styles.colPhone]}>
                          <Text style={styles.cellNormalText} numberOfLines={1}>
                            {item.telefono || '—'}
                          </Text>
                        </View>

                        {/* 8. E-MAIL */}
                        <View style={[styles.tdCell, styles.colEmail]}>
                          <Text
                            style={[
                              styles.cellEmailText,
                              !item.email && { color: '#475569', fontStyle: 'italic' },
                            ]}
                            numberOfLines={1}
                          >
                            {item.email || '—'}
                          </Text>
                        </View>

                        {/* 9. ACCESSO APP */}
                        <View style={[styles.tdCell, styles.colLogin]}>
                          {hasLoggedIn ? (
                            <View style={styles.onlineBadge}>
                              <Text style={styles.onlineBadgeText}>● {loginDateStr}</Text>
                            </View>
                          ) : (
                            <Text style={styles.neverLoggedText}>Mai entrato</Text>
                          )}
                        </View>

                        {/* 10. AZIONE (QR Code) */}
                        <View style={[styles.tdCell, styles.colAction]}>
                          <View style={styles.actionQrBtn}>
                            <Text style={styles.actionQrBtnText}>QR Code →</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F19',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  kpiPillGreen: {
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.3)',
  },
  kpiPillBlue: {
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderColor: 'rgba(56,189,248,0.3)',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#F8FAFC',
  },
  refreshBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  toolbarSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  toolbarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
  },
  searchIcon: {
    fontSize: 13,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  clearSearchBtn: {
    paddingHorizontal: 6,
  },
  clearSearchText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  filterTabsGroup: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterTabActive: {
    backgroundColor: '#2563EB',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tableWrapperOuter: {
    flex: 1,
    padding: 16,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1.5,
    borderBottomColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  thText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  tableBodyScroll: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  tableRowEven: {
    backgroundColor: '#111827',
  },
  tableRowOdd: {
    backgroundColor: '#151E2E',
  },
  tdCell: {
    justifyContent: 'center',
    paddingRight: 8,
  },
  // Proportional Excel Column Widths
  colCode: { width: 78 },
  colName: { flex: 1.5, minWidth: 170 },
  colTipo: { width: 56, alignItems: 'center' },
  colTariffa: { width: 84 },
  colStatus: { width: 92 },
  colDate: { width: 96 },
  colPhone: { width: 115 },
  colEmail: { flex: 1.6, minWidth: 185 },
  colLogin: { width: 130 },
  colAction: { width: 94, alignItems: 'flex-end', paddingRight: 0 },

  codeChip: {
    backgroundColor: 'rgba(239,68,68,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  codeChipText: {
    color: '#F87171',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  cellNameText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  tipoBadge: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    width: 26,
    height: 24,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoBadgeText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '800',
  },
  cellMoneyText: {
    color: '#CBD5E1',
    fontSize: 12.5,
    fontWeight: '700',
  },
  statusDotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 5,
  },
  statusActiveBg: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  statusInactiveBg: {
    backgroundColor: 'rgba(100,116,139,0.15)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  cellNormalText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  cellEmailText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '500',
  },
  onlineBadge: {
    backgroundColor: 'rgba(56,189,248,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.3)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  onlineBadgeText: {
    color: '#38BDF8',
    fontSize: 10.5,
    fontWeight: '700',
  },
  neverLoggedText: {
    color: '#475569',
    fontSize: 11.5,
  },
  actionQrBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  actionQrBtnText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  centerBox: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
  },
});
