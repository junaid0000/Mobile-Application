import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  Animated,
  FlatList,
} from 'react-native';
import axios from 'axios';

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000'
  : 'http://192.168.11.251:5000';

// ─── Color Theme (matching app-wide design) ─────────────────────────────────
const T = {
  bg: '#000000',
  surface: '#161822',
  surfaceAlt: '#222533',
  red: '#E53935',
  yellow: '#FFC107',
  redLight: 'rgba(229,57,53,0.12)',
  redBorder: 'rgba(229,57,53,0.3)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0AEC0',
  textMuted: '#718096',
  border: '#2A2D3A',
  green: '#10B981',
  greenLight: 'rgba(16,185,129,0.12)',
  amber: '#FFC107',
  amberLight: 'rgba(255,193,7,0.08)',
};

// ─── Dropdown Picker Component ──────────────────────────────────────────────
function SellerDropdown({ sellers, selected, onSelect, userSellerCode }) {
  const [open, setOpen] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [open]);

  const displayLabel = selected === '__ALL__'
    ? '🔍 Tutti i Venditori'
    : `👤 ${selected}`;

  return (
    <View style={dropStyles.wrapper}>
      <TouchableOpacity
        style={dropStyles.trigger}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={dropStyles.triggerText}>{displayLabel}</Text>
        <Text style={dropStyles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={open}
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={dropStyles.backdrop}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <Animated.View style={[dropStyles.menu, { opacity: fadeAnim }]}>
            <Text style={dropStyles.menuTitle}>Seleziona Venditore</Text>

            {/* All option */}
            <TouchableOpacity
              style={[
                dropStyles.menuItem,
                selected === '__ALL__' && dropStyles.menuItemActive,
              ]}
              onPress={() => { onSelect('__ALL__'); setOpen(false); }}
            >
              <Text style={dropStyles.menuItemIcon}>🔍</Text>
              <Text style={[
                dropStyles.menuItemText,
                selected === '__ALL__' && dropStyles.menuItemTextActive,
              ]}>
                Tutti i Venditori
              </Text>
              {selected === '__ALL__' && <Text style={dropStyles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={dropStyles.divider} />

            {/* Seller options */}
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {sellers.map((code) => {
                const isActive = selected === code;
                const isSelf = code === userSellerCode;
                return (
                  <TouchableOpacity
                    key={code}
                    style={[dropStyles.menuItem, isActive && dropStyles.menuItemActive]}
                    onPress={() => { onSelect(code); setOpen(false); }}
                  >
                    <Text style={dropStyles.menuItemIcon}>
                      {isSelf ? '⭐' : '👤'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        dropStyles.menuItemText,
                        isActive && dropStyles.menuItemTextActive,
                      ]}>
                        {code}
                      </Text>
                      {isSelf && (
                        <Text style={dropStyles.selfLabel}>Il tuo codice</Text>
                      )}
                    </View>
                    {isActive && <Text style={dropStyles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const dropStyles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerText: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  arrow: {
    color: T.yellow,
    fontSize: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  menu: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    width: '100%',
    maxWidth: 400,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  menuTitle: {
    color: T.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
    gap: 12,
  },
  menuItemActive: {
    backgroundColor: 'rgba(255,193,7,0.08)',
  },
  menuItemIcon: {
    fontSize: 18,
  },
  menuItemText: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemTextActive: {
    color: T.yellow,
    fontWeight: '700',
  },
  selfLabel: {
    color: T.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  checkmark: {
    color: T.yellow,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 14,
    marginVertical: 4,
  },
});

// ─── Main Appointments Screen ───────────────────────────────────────────────
export default function AppointmentsScreen({ route }) {
  const { user, token } = route?.params || {};
  const userRole = user?.role || 'client';

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sellerCode, setSellerCode] = useState(null); // user's own code
  const [sellersList, setSellersList] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState('__ALL__'); // default depends on role

  // Fetch sellers list for the dropdown
  const fetchSellersList = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/seller/sellers-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSellersList(res.data.sellers || []);
    } catch (err) {
      console.error('Error fetching sellers list:', err);
    }
  }, [token]);

  // Fetch appointments (optionally filtered by seller)
  const fetchAppointments = useCallback(async (filter) => {
    try {
      let url = `${BASE_URL}/api/seller/appointments`;
      if (filter && filter !== '__ALL__') {
        url += `?venditore=${encodeURIComponent(filter)}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(res.data.appointments || []);
      if (!sellerCode && res.data.seller_code) {
        setSellerCode(res.data.seller_code);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setAppointments([]);
    }
  }, [token, sellerCode]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchSellersList();

      // Default filter: seller sees own, admin sees all
      if (userRole === 'admin') {
        setSelectedSeller('__ALL__');
        await fetchAppointments('__ALL__');
      } else {
        // Seller: fetch default (server filters by their own code)
        await fetchAppointments(null);
        setSelectedSeller(null); // will be set once we get seller_code back
      }
      setLoading(false);
    };
    init();
  }, []);

  // When sellerCode is set from the first fetch, update selectedSeller for sellers
  useEffect(() => {
    if (sellerCode && userRole !== 'admin' && selectedSeller === null) {
      setSelectedSeller(sellerCode);
    }
  }, [sellerCode]);

  // When dropdown selection changes, re-fetch
  const handleSelectSeller = async (code) => {
    setSelectedSeller(code);
    setLoading(true);
    await fetchAppointments(code);
    setLoading(false);
  };

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSellersList();
    await fetchAppointments(selectedSeller);
    setRefreshing(false);
  };

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('it-IT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  // Group appointments by date
  const groupByDate = (appts) => {
    const groups = {};
    appts.forEach((a) => {
      const key = a.data_ora
        ? new Date(a.data_ora).toLocaleDateString('it-IT')
        : 'Senza data';
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });
    return groups;
  };

  const grouped = groupByDate(appointments);
  const dateKeys = Object.keys(grouped);

  return (
    <View style={s.container}>
      {/* ── Top Nav Bar ─────────────────────────────────────────── */}
      <View style={s.topBar}>
        <View>
          <Text style={s.topBarBrand}>ROSSOMANDI</Text>
          <Text style={s.topBarSub}>Appuntamenti</Text>
        </View>
        <View style={s.statsChip}>
          <Text style={s.statsChipText}>
            📅 {appointments.length}
          </Text>
        </View>
      </View>

      {/* ── Main Content ────────────────────────────────────────── */}
      <ScrollView
        style={s.scrollArea}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.yellow}
            colors={[T.yellow]}
          />
        }
      >
        {/* Seller Dropdown Filter */}
        <SellerDropdown
          sellers={sellersList}
          selected={selectedSeller || '__ALL__'}
          onSelect={handleSelectSeller}
          userSellerCode={sellerCode}
        />

        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color={T.red} size="large" />
            <Text style={s.loadingText}>Caricamento appuntamenti...</Text>
          </View>
        ) : appointments.length === 0 ? (
          /* Empty State */
          <View style={s.emptyState}>
            <View style={s.emptyIconCircle}>
              <Text style={s.emptyIcon}>📅</Text>
            </View>
            <Text style={s.emptyTitle}>Nessun Appuntamento</Text>
            <Text style={s.emptySubtitle}>
              Non ci sono appuntamenti{'\n'}per il venditore selezionato.
            </Text>
          </View>
        ) : (
          /* Appointment Cards Grouped by Date */
          dateKeys.map((dateKey) => (
            <View key={dateKey} style={s.dateGroup}>
              {/* Date Header */}
              <View style={s.dateHeader}>
                <View style={s.dateHeaderDot} />
                <Text style={s.dateHeaderText}>{dateKey}</Text>
                <View style={s.dateHeaderLine} />
                <View style={s.dateCountBadge}>
                  <Text style={s.dateCountText}>{grouped[dateKey].length}</Text>
                </View>
              </View>

              {/* Cards for this date */}
              {grouped[dateKey].map((appt, idx) => (
                <View key={`${appt.intorno}-${idx}`} style={s.card}>
                  {/* Card left accent */}
                  <View style={s.cardAccent} />

                  <View style={s.cardBody}>
                    {/* Top row: Code + Time */}
                    <View style={s.cardTopRow}>
                      <View style={s.codeBadge}>
                        <Text style={s.codeText}>#{appt.intorno}</Text>
                      </View>
                      {appt.data_ora && (
                        <View style={s.timeBadge}>
                          <Text style={s.timeText}>
                            🕐 {formatTime(appt.data_ora)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Client name */}
                    <Text style={s.clientName}>
                      {appt.cliente || 'Cliente sconosciuto'}
                    </Text>

                    {/* Bottom row: Seller */}
                    <View style={s.cardBottomRow}>
                      <View style={s.sellerTag}>
                        <Text style={s.sellerTagIcon}>👤</Text>
                        <Text style={s.sellerTagText}>
                          {appt.venditore || '—'}
                        </Text>
                      </View>
                      {appt.venditore === sellerCode && (
                        <View style={s.youBadge}>
                          <Text style={s.youBadgeText}>TU</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        {/* Bottom Spacer */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  topBar: {
    backgroundColor: T.surface,
    paddingTop: Platform.OS === 'ios' ? 55 : 25,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
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
    marginTop: 2,
  },
  statsChip: {
    backgroundColor: T.amberLight,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statsChipText: {
    color: T.yellow,
    fontSize: 14,
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Loading
  loadingBox: {
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: T.textSecondary,
    marginTop: 14,
    fontSize: 14,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIconCircle: {
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
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    color: T.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Date Groups
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  dateHeaderDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: T.yellow,
  },
  dateHeaderText: {
    color: T.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.border,
  },
  dateCountBadge: {
    backgroundColor: T.redLight,
    borderWidth: 1,
    borderColor: T.redBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  dateCountText: {
    color: T.red,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Appointment Card
  card: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  cardAccent: {
    width: 4,
    backgroundColor: T.yellow,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeBadge: {
    backgroundColor: T.amberLight,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeText: {
    color: T.yellow,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeBadge: {
    backgroundColor: T.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeText: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  clientName: {
    color: T.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sellerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.surfaceAlt,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sellerTagIcon: {
    fontSize: 13,
  },
  sellerTagText: {
    color: T.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  youBadge: {
    backgroundColor: T.greenLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  youBadgeText: {
    color: T.green,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
