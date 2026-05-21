import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Alert, Dimensions } from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation, route }) {
  const { user, token } = route.params || {};
  const userName = user?.name || 'Guest';

  const [data, setData] = useState({ vehicles: [], visits: [], documents: [] });
  const [loading, setLoading] = useState(true);

  const BASE_URL = Platform.OS === 'web'
    ? 'http://localhost:5000'
    : 'http://192.168.11.251:5000';

  useEffect(() => {
    if (token) {
      axios.get(`${BASE_URL}/api/client/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        setData(res.data);
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
      Alert.alert('Error', 'Cannot open document');
    }
  };

  return (
    <View style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <Text style={styles.brand}>ROSSOMANDI</Text>
          <Text style={styles.welcome}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>Your Premium Client Dashboard</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#E53935" size="large" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            
            {/* Vehicles Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>My Vehicles</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{data.vehicles.length}</Text></View>
              </View>
              
              {data.vehicles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>You have no registered vehicles.</Text>
                </View>
              ) : (
                data.vehicles.map((v) => (
                  <View key={v.id} style={styles.vehicleCard}>
                    <View style={styles.vehicleIconPlaceholder}>
                      <Text style={styles.vehicleIconText}>{v.make.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleTitle}>
                        <Text style={{color: '#888', fontWeight: 'normal', fontSize: 13, textTransform: 'uppercase'}}>Make:</Text> {v.make}
                      </Text>
                      <Text style={styles.vehicleTitle}>
                        <Text style={{color: '#888', fontWeight: 'normal', fontSize: 13, textTransform: 'uppercase'}}>Model:</Text> {v.model}
                      </Text>
                      <Text style={styles.vehicleYear}>Year: {v.year}</Text>
                    </View>
                    {v.license_plate ? (
                      <View style={styles.plateTag}>
                        <Text style={styles.plateText}>{v.license_plate}</Text>
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>

            {/* Service History Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Service History</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{data.visits.length}</Text></View>
              </View>

              {data.visits.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Your service history will appear here.</Text>
                </View>
              ) : (
                data.visits.map((v) => {
                  const vehicle = data.vehicles.find(veh => veh.id === v.vehicle_id);
                  const carName = vehicle ? `Make: ${vehicle.make} - Model: ${vehicle.model}` : 'Unknown Car';
                  const visitDate = new Date(v.visit_date);
                  
                  return (
                    <View key={v.id} style={styles.visitCard}>
                      <View style={styles.visitHeader}>
                        <Text style={styles.visitDate}>{visitDate.toLocaleDateString()} at {visitDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                        <Text style={styles.visitCar}>{carName}</Text>
                      </View>
                      
                      <View style={styles.visitBody}>
                        <Text style={styles.visitLabel}>Fixes Performed</Text>
                        <Text style={styles.visitFixes}>{v.fixes_performed}</Text>
                        
                        {v.next_instructions ? (
                          <View style={styles.instructionsBox}>
                            <Text style={styles.visitLabelAlert}>Next Instructions</Text>
                            <Text style={styles.visitInstructions}>{v.next_instructions}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            {/* Documents Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>My Documents</Text>
                <View style={styles.badge}><Text style={styles.badgeText}>{data.documents.length}</Text></View>
              </View>

              {data.documents.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Your documents will appear here.</Text>
                </View>
              ) : (
                <View style={styles.documentsGrid}>
                  {data.documents.map((d) => (
                    <TouchableOpacity key={d.id} style={styles.documentCard} onPress={() => handleOpenDocument(d.file_path)}>
                      <View style={styles.docIconPlaceholder}>
                        <Text style={styles.docIconText}>📄</Text>
                      </View>
                      <View style={styles.docInfo}>
                        <Text style={styles.documentName} numberOfLines={1} ellipsizeMode="tail">{d.file_name}</Text>
                        <Text style={styles.documentDate}>Added: {new Date(d.uploaded_at).toLocaleDateString()}</Text>
                      </View>
                      <Text style={styles.docViewText}>View</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  container: {
    padding: width > 768 ? 40 : 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: width > 768 ? 'center' : 'stretch',
  },
  headerContainer: {
    marginBottom: 30,
    width: width > 768 ? 700 : '100%',
  },
  brand: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E53935',
    letterSpacing: 3,
    marginBottom: 8,
  },
  welcome: {
    fontSize: 24,
    color: '#B0B0B0',
    fontWeight: '400',
  },
  userName: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  divider: {
    height: 3,
    width: 40,
    backgroundColor: '#E53935',
    marginBottom: 12,
    borderRadius: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  contentContainer: {
    width: width > 768 ? 700 : '100%',
  },
  section: {
    marginBottom: 32,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginRight: 12,
  },
  badge: {
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.3)',
  },
  badgeText: {
    color: '#E53935',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: '#16161A',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    color: '#666',
    fontSize: 14,
  },
  // Vehicles
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A20',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  vehicleIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  vehicleIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  vehicleYear: {
    fontSize: 14,
    color: '#888',
  },
  plateTag: {
    backgroundColor: '#E53935',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  plateText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Visits
  visitCard: {
    backgroundColor: '#1A1A20',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A35',
    overflow: 'hidden',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#22222A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A35',
  },
  visitDate: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: 'bold',
  },
  visitCar: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  visitBody: {
    padding: 16,
  },
  visitLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  visitFixes: {
    color: '#E0E0E0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  instructionsBox: {
    backgroundColor: 'rgba(255, 160, 0, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#FFA000',
    padding: 12,
    borderRadius: 4,
  },
  visitLabelAlert: {
    fontSize: 12,
    color: '#FFA000',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  visitInstructions: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
  },
  // Documents
  documentsGrid: {
    flexDirection: 'column',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A20',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  docIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(100, 181, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  docIconText: {
    fontSize: 18,
  },
  docInfo: {
    flex: 1,
    marginRight: 10,
  },
  documentName: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentDate: {
    color: '#888',
    fontSize: 12,
  },
  docViewText: {
    color: '#64B5F6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  logoutButton: {
    alignSelf: width > 768 ? 'center' : 'stretch',
    width: width > 768 ? 700 : 'auto',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E53935',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#E53935',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
