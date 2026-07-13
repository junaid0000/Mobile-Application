import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  Dimensions,
  Modal,
  Animated,
  useWindowDimensions,
  Image,
} from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';

const BASE_URL = Platform.OS === 'web'
  ? 'http://localhost:5000'
  : 'http://192.168.11.251:5000';

// ─── Color Theme ─────────────────────────────────────────────────────────────
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
  shadow: 'rgba(0,0,0,0.4)',
  green: '#10B981',
  greenLight: 'rgba(16,185,129,0.12)',
  amber: '#FFC107',
  amberLight: 'rgba(255,193,7,0.08)',
  blue: '#FFC107',
};

// ─── Side Drawer Component ──────────────────────────────────────────────────
function SideDrawer({ visible, onClose, userName, userEmail, onLogout }) {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const menuItems = [
    { icon: '🏠', label: 'Dashboard', sub: 'I tuoi veicoli e storico' },
    { icon: '🚗', label: 'Veicoli', sub: 'Lista ed informazioni' },
    { icon: '📋', label: 'Storico', sub: 'Interventi ed assistenze' },
    { icon: '📄', label: 'Documenti', sub: 'Fatture e certificati' },
    { icon: '📞', label: 'Contattaci', sub: 'Supporto e prenotazioni' },
    { icon: '⚙️', label: 'Impostazioni', sub: 'Gestisci account' },
  ];

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.drawerOverlay}>
        <Animated.View 
          style={[styles.drawerBackdrop, { opacity: fadeAnim }]}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View 
          style={[styles.drawerContent, { transform: [{ translateX: slideAnim }] }]}
        >
          {/* Drawer Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarLargeText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.drawerName}>{userName}</Text>
            <Text style={styles.drawerEmail}>{userEmail || 'cliente@rossomandi.it'}</Text>
          </View>

          {/* Rossomandi Bar */}
          <View style={styles.drawerBrandStrip}>
            <Image 
              source={require('../assets/images/logo.png')} 
              style={styles.drawerLogo} 
              resizeMode="contain" 
            />
          </View>

          {/* Drawer Menu Items */}
          <ScrollView style={styles.drawerMenu} showsVerticalScrollIndicator={false}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity key={idx} style={styles.menuItem} onPress={onClose}>
                <Text style={styles.menuItemIcon}>{item.icon}</Text>
                <View style={styles.menuItemTextContainer}>
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                  <Text style={styles.menuItemSub}>{item.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Drawer Footer */}
          <View style={styles.drawerFooter}>
            <Text style={styles.footerAddress}>📍 Viale G. Marconi, 38/1, Prato</Text>
            <Text style={styles.footerPhone}>📞 0574 402611</Text>
            
            <TouchableOpacity style={styles.drawerLogoutButton} onPress={onLogout}>
              <Text style={styles.drawerLogoutText}>🚪 Esci dall'account</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Main HomeScreen Component ────────────────────────────────────────────────
export default function HomeScreen({ navigation, route }) {
  const { user, token } = route.params || {};
  const userName = user?.name || 'Cliente';
  const userEmail = user?.email || '';

  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [data, setData] = useState({ vehicles: [], visits: [], documents: [] });
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  
  // Mobile navigation tabs: 0 = Veicoli list, 1 = Dettagli
  const [mobileTab, setMobileTab] = useState(0);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [hoveredVehicleId, setHoveredVehicleId] = useState(null);
  const [hoveredDocId, setHoveredDocId] = useState(null);

  useEffect(() => {
    if (token) {
      axios.get(`${BASE_URL}/api/client/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          setData(res.data);
          if (res.data.vehicles && res.data.vehicles.length > 0) {
            setSelectedVehicleId(res.data.vehicles[0].id);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleOpenDocument = async (filePath) => {
    try {
      const fileUrl = `${BASE_URL}/${filePath}`;
      await WebBrowser.openBrowserAsync(fileUrl);
    } catch (err) {
      Alert.alert('Errore', 'Impossibile aprire il documento');
    }
  };

  const selectedVehicle = data.vehicles.find(v => String(v.id) === String(selectedVehicleId));
  const filteredVisits = selectedVehicleId
    ? data.visits.filter(v => String(v.vehicle_id) === String(selectedVehicleId))
    : data.visits;

  const handleLogout = () => {
    setDrawerVisible(false);
    navigation.navigate('Login');
  };

  // ── LEFT PANEL: Vehicle List (Shared between layouts) ──────────────────────
  const VehiclePanel = (
    <View style={[styles.panel, styles.leftPanel, isWide && styles.leftPanelWide]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>I Miei Veicoli</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{data.vehicles.length}</Text>
        </View>
      </View>

      {data.vehicles.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🚗</Text>
          <Text style={styles.emptyText}>Nessun veicolo registrato.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
          {data.vehicles.map(v => {
            const isSelected = String(v.id) === String(selectedVehicleId);
            const isHovered = String(v.id) === String(hoveredVehicleId);
            return (
              <TouchableOpacity
                key={v.id}
                onMouseEnter={() => setHoveredVehicleId(v.id)}
                onMouseLeave={() => setHoveredVehicleId(null)}
                style={[
                  styles.vehicleCard,
                  isSelected && styles.vehicleCardActive,
                  isHovered && styles.vehicleCardHover,
                ]}
                onPress={() => {
                  setSelectedVehicleId(v.id);
                  if (!isWide) {
                    setMobileTab(1); // Auto switch to details tab on mobile
                  }
                }}
              >
                <View style={[
                  styles.avatarCircle,
                  isSelected && styles.avatarCircleActive,
                  isHovered && styles.avatarCircleHover,
                ]}>
                  <Text style={[
                    styles.avatarLetter,
                    isSelected && styles.avatarLetterActive,
                    isHovered && styles.avatarLetterHover,
                  ]}>
                    {v.make.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.cardMake,
                    isSelected && styles.cardMakeActive,
                    isHovered && styles.cardMakeHover,
                  ]}>{v.make}</Text>
                  <Text style={styles.cardModel}>{v.model}</Text>
                  <Text style={styles.cardYear}>{v.year}</Text>
                </View>
                {v.license_plate ? (
                  <View style={[
                    styles.plateTag,
                    isSelected && styles.plateTagActive,
                    isHovered && styles.plateTagHover,
                  ]}>
                    <Text style={[
                      styles.plateText,
                      isSelected && styles.plateTextActive,
                      isHovered && styles.plateTextHover,
                    ]}>{v.license_plate}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  // ── RIGHT PANEL: Details & History (Shared between layouts) ────────────────
  const DetailsPanel = (
    <View style={[styles.panel, styles.rightPanel]}>
      {selectedVehicle ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Active Vehicle Info Header Card */}
          <View style={styles.infoSummaryCard}>
            <View style={styles.infoSummaryRow}>
              <View>
                <Text style={styles.infoSummaryMake}>{selectedVehicle.make}</Text>
                <Text style={styles.infoSummaryModel}>{selectedVehicle.model}</Text>
              </View>
              {selectedVehicle.license_plate ? (
                <View style={styles.plateTagBig}>
                  <Text style={styles.plateTextBig}>{selectedVehicle.license_plate}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.infoDetailsGrid}>
              <View style={styles.infoDetailItem}>
                <Text style={styles.detailLabel}>📅 ANNO DI IMMATRICOLAZIONE</Text>
                <Text style={styles.detailVal}>{selectedVehicle.year || '—'}</Text>
              </View>
              <View style={styles.infoDetailItem}>
                <Text style={styles.detailLabel}>🔑 NUMERO DI TELAIO (VIN)</Text>
                <Text style={styles.detailVal}>{selectedVehicle.vin || '—'}</Text>
              </View>
            </View>
          </View>

          {/* Service History Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Storico Interventi</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{filteredVisits.length}</Text>
            </View>
          </View>

          {filteredVisits.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Nessun intervento registrato per questo veicolo.</Text>
            </View>
          ) : (
            <View style={styles.timelineContainer}>
              <View style={styles.timelineLine} />
              {filteredVisits.map((visit, index) => {
                const visitDate = new Date(visit.visit_date);
                return (
                  <View key={visit.id} style={styles.timelineItem}>
                    {/* Timeline Dot */}
                    <View style={styles.timelineDotContainer}>
                      <View style={styles.timelineDot} />
                    </View>

                    {/* Visit Card */}
                    <View style={styles.visitCard}>
                      <View style={styles.visitCardHeader}>
                        <Text style={styles.visitDate}>
                          📆 {visitDate.toLocaleDateString('it-IT')} ore {visitDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <View style={styles.statusBadge}>
                          <Text style={styles.statusText}>Eseguito</Text>
                        </View>
                      </View>

                      <View style={styles.visitBody}>
                        <Text style={styles.visitLabel}>Lavori Eseguiti</Text>
                        <Text style={styles.visitValue}>{visit.fixes_performed}</Text>

                        {visit.next_instructions ? (
                          <View style={styles.alertBox}>
                            <Text style={styles.alertTitle}>💡 NOTE E PROSSIME SCADENZE</Text>
                            <Text style={styles.alertText}>{visit.next_instructions}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Documents Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Documenti Veicolo</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{data.documents.length}</Text>
            </View>
          </View>

          {data.documents.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📄</Text>
              <Text style={styles.emptyText}>Nessun documento caricato.</Text>
            </View>
          ) : (
            <View style={styles.docsList}>
              {data.documents.map(doc => {
                const isHovered = String(doc.id) === String(hoveredDocId);
                return (
                  <TouchableOpacity
                    key={doc.id}
                    onMouseEnter={() => setHoveredDocId(doc.id)}
                    onMouseLeave={() => setHoveredDocId(null)}
                    style={[styles.docCard, isHovered && styles.docCardHover]}
                    onPress={() => handleOpenDocument(doc.file_path)}
                  >
                    <View style={styles.docIconBox}>
                      <Text style={styles.docIcon}>📄</Text>
                    </View>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.docName} numberOfLines={1}>
                        {doc.file_name}
                      </Text>
                      <Text style={styles.docDate}>
                        Caricato il {new Date(doc.uploaded_at).toLocaleDateString('it-IT')}
                      </Text>
                    </View>
                    <Text style={[styles.docActionText, isHovered && styles.docActionTextHover]}>Apri ↗</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyStateCentered}>
          <Text style={styles.emptyIconLarge}>🚗</Text>
          <Text style={styles.emptyTextLarge}>Seleziona un veicolo per visualizzarne i dettagli e lo storico.</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ── TOP NAV BAR ──────────────────────────────────────────────────────── */}
      <View style={styles.topNavbar}>
        <TouchableOpacity style={styles.navButton} onPress={() => setDrawerVisible(true)}>
          <Text style={styles.hamburgerText}>☰</Text>
        </TouchableOpacity>
        
        <Image 
          source={require('../assets/images/logo.png')} 
          style={styles.logo} 
          resizeMode="contain" 
        />
        
        <TouchableOpacity style={styles.profileCircle} onPress={() => setDrawerVisible(true)}>
          <Text style={styles.profileLetter}>
            {userName.charAt(0).toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={T.red} size="large" />
          <Text style={styles.loadingText}>Caricamento in corso...</Text>
        </View>
      ) : (
        <View style={styles.mainLayout}>
          {isWide ? (
            /* ── DESKTOP/TABLET LAYOUT (Side-by-Side) ── */
            <View style={styles.splitLayout}>
              {VehiclePanel}
              <View style={styles.splitDivider} />
              {DetailsPanel}
            </View>
          ) : (
            /* ── MOBILE LAYOUT (Tabbed Switcher) ── */
            <View style={{ flex: 1 }}>
              {/* Custom responsive tab bar */}
              <View style={styles.tabContainer}>
                <TouchableOpacity
                  style={[styles.tabButton, mobileTab === 0 && styles.tabButtonActive]}
                  onPress={() => setMobileTab(0)}
                >
                  <Text style={[styles.tabLabel, mobileTab === 0 && styles.tabLabelActive]}>
                    🚗 Veicoli ({data.vehicles.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, mobileTab === 1 && styles.tabButtonActive]}
                  onPress={() => setMobileTab(1)}
                >
                  <Text style={[styles.tabLabel, mobileTab === 1 && styles.tabLabelActive]}>
                    📋 Dettagli & Storico
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content Panels */}
              <View style={{ flex: 1 }}>
                {mobileTab === 0 ? VehiclePanel : DetailsPanel}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Slide Drawer Side Menu */}
      <SideDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  topNavbar: {
    backgroundColor: T.surface,
    height: Platform.OS === 'ios' ? 95 : 65,
    paddingTop: Platform.OS === 'ios' ? 45 : 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 100,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  hamburgerText: {
    fontSize: 26,
    color: T.textPrimary,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  profileCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: T.redLight,
    borderWidth: 1.5,
    borderColor: T.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLetter: {
    color: T.red,
    fontWeight: 'bold',
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.bg,
  },
  loadingText: {
    color: T.textSecondary,
    marginTop: 12,
    fontSize: 15,
  },
  mainLayout: {
    flex: 1,
  },
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: T.bg,
  },
  splitDivider: {
    width: 1,
    backgroundColor: T.border,
  },
  panel: {
    flex: 1,
    padding: 20,
    backgroundColor: T.bg,
  },
  leftPanel: {
    paddingRight: 10,
  },
  leftPanelWide: {
    maxWidth: 340,
    borderRightWidth: 1,
    borderRightColor: T.border,
    backgroundColor: '#0C0D12',
  },
  rightPanel: {
    flex: 2,
    paddingLeft: 15,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: T.textPrimary,
  },
  badge: {
    backgroundColor: T.redLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.redBorder,
  },
  badgeText: {
    color: T.red,
    fontSize: 12,
    fontWeight: 'bold',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  vehicleCardActive: {
    borderColor: T.red,
    backgroundColor: 'rgba(229,57,53,0.06)',
  },
  vehicleCardHover: {
    borderColor: T.yellow,
    backgroundColor: 'rgba(255,193,7,0.05)',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarCircleActive: {
    backgroundColor: T.red,
  },
  avatarCircleHover: {
    backgroundColor: T.yellow,
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textPrimary,
  },
  avatarLetterActive: {
    color: '#FFFFFF',
  },
  avatarLetterHover: {
    color: '#000000',
  },
  cardMake: {
    fontSize: 16,
    fontWeight: 'bold',
    color: T.textPrimary,
  },
  cardMakeActive: {
    color: T.red,
  },
  cardMakeHover: {
    color: T.yellow,
  },
  cardModel: {
    fontSize: 14,
    color: T.textSecondary,
    marginTop: 2,
  },
  cardYear: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  plateTag: {
    backgroundColor: T.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateTagActive: {
    backgroundColor: T.red,
  },
  plateTagHover: {
    backgroundColor: T.yellow,
  },
  plateText: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  plateTextActive: {
    color: '#FFFFFF',
  },
  plateTextHover: {
    color: '#000000',
  },
  infoSummaryCard: {
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderLeftWidth: 4,
    borderLeftColor: T.red,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 2,
  },
  infoSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    paddingBottom: 15,
    marginBottom: 15,
  },
  infoSummaryMake: {
    fontSize: 14,
    fontWeight: 'bold',
    color: T.red,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoSummaryModel: {
    fontSize: 24,
    fontWeight: '800',
    color: T.textPrimary,
    marginTop: 4,
  },
  plateTagBig: {
    backgroundColor: T.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  plateTextBig: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoDetailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailVal: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 15,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textPrimary,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 16,
    marginBottom: 10,
  },
  timelineLine: {
    position: 'absolute',
    left: 7,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: T.border,
  },
  timelineItem: {
    position: 'relative',
    marginBottom: 20,
    paddingLeft: 12,
  },
  timelineDotContainer: {
    position: 'absolute',
    left: -11,
    top: 22,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: T.surface,
    borderWidth: 2,
    borderColor: T.red,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  timelineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.red,
  },
  visitCard: {
    backgroundColor: T.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  visitCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: T.surfaceAlt,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  visitDate: {
    color: T.red,
    fontSize: 13,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: T.greenLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    color: T.green,
    fontSize: 11,
    fontWeight: 'bold',
  },
  visitBody: {
    padding: 16,
  },
  visitLabel: {
    fontSize: 11,
    color: T.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  visitValue: {
    fontSize: 14,
    color: T.textPrimary,
    lineHeight: 20,
    marginBottom: 15,
  },
  alertBox: {
    backgroundColor: T.amberLight,
    borderLeftWidth: 3,
    borderLeftColor: T.amber,
    padding: 12,
    borderRadius: 6,
    marginTop: 5,
  },
  alertTitle: {
    color: T.amber,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertText: {
    color: T.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  docsList: {
    gap: 10,
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 14,
    padding: 12,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docIcon: {
    fontSize: 20,
  },
  docName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: T.textPrimary,
  },
  docDate: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  docActionText: {
    color: T.yellow,
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: T.yellow,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
  },
  tabLabelActive: {
    color: T.yellow,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: T.surface,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  emptyText: {
    color: T.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  emptyStateCentered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconLarge: {
    fontSize: 50,
    marginBottom: 20,
    opacity: 0.5,
  },
  drawerLogo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: '#E53935',
  },
  emptyTextLarge: {
    color: T.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  drawerContent: {
    width: 280,
    backgroundColor: '#0F1015',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 16,
  },
  drawerHeader: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 65 : 35,
    alignItems: 'center',
    backgroundColor: '#08090C',
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: T.red,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  avatarLargeText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  drawerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: T.textPrimary,
  },
  drawerEmail: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 4,
  },
  drawerBrandStrip: {
    backgroundColor: T.red,
    paddingVertical: 8,
    alignItems: 'center',
  },
  drawerBrandText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  drawerMenu: {
    flex: 1,
    padding: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: 14,
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: T.textPrimary,
  },
  menuItemSub: {
    fontSize: 11,
    color: T.textMuted,
    marginTop: 2,
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: T.border,
    backgroundColor: '#08090C',
  },
  footerAddress: {
    fontSize: 11,
    color: T.textSecondary,
    marginBottom: 4,
  },
  footerPhone: {
    fontSize: 11,
    color: T.textSecondary,
    marginBottom: 16,
  },
  drawerLogoutButton: {
    backgroundColor: T.redLight,
    borderWidth: 1,
    borderColor: T.redBorder,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  drawerLogoutText: {
    color: T.red,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
