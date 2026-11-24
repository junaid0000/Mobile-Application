import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function AdminSegnalatoriScreen({ navigation, route }) {
  const { user, token } = route.params || {};
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'logged'

  const fetchSegnalatori = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/segnalatori/list`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.segnalatori) {
        setList(res.data.segnalatori);
      }
    } catch (err) {
      console.log('Error fetching segnalatori:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSegnalatori();
    const interval = setInterval(() => {
      fetchSegnalatori();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchSegnalatori]);

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

  const renderItem = ({ item }) => {
    const hasLoggedIn = Boolean(item.last_login_at);
    const loginDateStr = hasLoggedIn
      ? new Date(item.last_login_at).toLocaleString('it-IT')
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('SegnalatoreScreen', {
            user,
            token,
            isAdminPreview: true,
            previewSegnalatore: item,
          })
        }
      >
        <View style={styles.cardTopRow}>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgeText}>{item.full_code}</Text>
          </View>

          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text style={styles.nameText}>{item.cognome_nome}</Text>
            <Text style={styles.subText}>
              {item.email || 'Nessuna email in Access'}{' '}
              {item.telefono ? `• 📞 ${item.telefono}` : ''}
            </Text>
          </View>

          <View
            style={[
              styles.activePill,
              { backgroundColor: item.attivo ? 'rgba(46,213,115,0.18)' : 'rgba(148,163,184,0.15)' },
            ]}
          >
            <Text
              style={[
                styles.activePillText,
                { color: item.attivo ? '#2ED573' : '#94A3B8' },
              ]}
            >
              {item.attivo ? '✓ Attivo' : 'Non Attivo'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBottomRow}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>
              Tariffa: <Text style={styles.metaValue}>€ {Number(item.tariffa_provv || 0)}</Text>
            </Text>
            {item.data_attivazione ? (
              <Text style={styles.metaLabel}>
                {'  •  '}Attivato: <Text style={styles.metaValue}>{item.data_attivazione}</Text>
              </Text>
            ) : null}
            <Text style={styles.metaLabel}>
              {'  •  '}Accesso App:{' '}
              <Text style={{ color: hasLoggedIn ? '#38BDF8' : '#64748B', fontWeight: '700' }}>
                {hasLoggedIn ? `Online (${loginDateStr})` : 'Mai entrato'}
              </Text>
            </Text>
          </View>

          <View style={styles.openQrBtn}>
            <Text style={styles.openQrBtnText}>QR Code →</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Dashboard</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>📣 Segnalatori (Access Sync)</Text>
          <Text style={styles.headerSub}>
            Totale in Access: {list.length} • Attivi: {list.filter((x) => x.attivo).length}
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchSegnalatori}>
          <Text style={styles.refreshBtnText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter Controls */}
      <View style={styles.controlsBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca per Codice (es. 20C), Nome, Email o Telefono..."
          placeholderTextColor="#64748B"
          value={search}
          onChangeText={setSearch}
        />

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'all' && styles.filterPillActive]}
            onPress={() => setFilterMode('all')}
          >
            <Text style={[styles.filterPillText, filterMode === 'all' && styles.filterPillTextActive]}>
              Tutti ({list.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'active' && styles.filterPillActive]}
            onPress={() => setFilterMode('active')}
          >
            <Text style={[styles.filterPillText, filterMode === 'active' && styles.filterPillTextActive]}>
              ✓ Solo Attivi ({list.filter((x) => x.attivo).length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterMode === 'logged' && styles.filterPillActive]}
            onPress={() => setFilterMode('logged')}
          >
            <Text style={[styles.filterPillText, filterMode === 'logged' && styles.filterPillTextActive]}>
              📱 Entrati in App ({list.filter((x) => x.last_login_at).length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#FF4757" />
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => String(item.codice)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchSegnalatori();
              }}
              tintColor="#FF4757"
            />
          }
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>Nessun segnalatore trovato.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  refreshBtn: {
    backgroundColor: 'rgba(255,71,87,0.2)',
    borderWidth: 1,
    borderColor: '#FF4757',
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtnText: {
    color: '#FF4757',
    fontSize: 18,
    fontWeight: '900',
  },
  controlsBox: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  searchInput: {
    backgroundColor: '#141722',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#FFFFFF',
    fontSize: 13,
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    flex: 1,
    backgroundColor: '#141722',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: 'rgba(255,71,87,0.2)',
    borderColor: '#FF4757',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: '#FF4757',
    fontWeight: '800',
  },
  listContent: {
    padding: 14,
  },
  card: {
    backgroundColor: '#141722',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    backgroundColor: '#FF4757',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 58,
    alignItems: 'center',
  },
  codeBadgeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  subText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  activePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaValue: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  openQrBtn: {
    backgroundColor: 'rgba(255,71,87,0.16)',
    borderWidth: 1,
    borderColor: '#FF4757',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openQrBtnText: {
    color: '#FF4757',
    fontSize: 11,
    fontWeight: '800',
  },
  centerBox: {
    flex: 1,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
  },
});
