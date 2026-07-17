import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  Image,
  useWindowDimensions
} from 'react-native';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';

export default function AdminDashboard({ navigation, route }) {
  const { user, token } = route.params || {};

  const BASE_URL = Platform.OS === 'web'
    ? 'http://localhost:5000'
    : 'http://192.168.12.152:5000';

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [clients, setClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientRecords, setClientRecords] = useState({ vehicles: [], visits: [], documents: [] });
  const [recordsLoading, setRecordsLoading] = useState(false);

  // Modals visibility
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [visitModalVisible, setVisitModalVisible] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] = useState(false);
  const [visitDetailModalVisible, setVisitDetailModalVisible] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [vehicleDetailModalVisible, setVehicleDetailModalVisible] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [editVisitModalVisible, setEditVisitModalVisible] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [editVisitForm, setEditVisitForm] = useState({ vehicle_id: '', visit_date: '', fixes_performed: '', next_instructions: '' });

  // Forms state
  const [clientForm, setClientForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [vehicleForm, setVehicleForm] = useState({ make: '', model: '', year: '', license_plate: '' });
  const [visitForm, setVisitForm] = useState({ vehicle_id: '', visit_date: '', fixes_performed: '', next_instructions: '' });
  const [resetPasswordForm, setResetPasswordForm] = useState({ new_password: '' });
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const apiConfig = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/clients`, apiConfig);
      setClients(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = async (client) => {
    setSelectedClient(client);
    setEditForm({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      address: client.address || ''
    });
    fetchClientRecords(client.id);
  };

  const fetchClientRecords = async (clientId) => {
    setRecordsLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/api/admin/clients/${clientId}/records`, apiConfig);
      setClientRecords(response.data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to fetch client records');
    } finally {
      setRecordsLoading(false);
    }
  };

  // Client CRUD Actions
  const handleAddClient = async () => {
    if (!clientForm.name || !clientForm.email) {
      Alert.alert('Error', 'Name and Email are required');
      return;
    }
    try {
      const response = await axios.post(`${BASE_URL}/api/admin/clients`, clientForm, apiConfig);
      Alert.alert('Success', 'Client added successfully');
      setAddModalVisible(false);
      setClientForm({ name: '', email: '', password: '', phone: '', address: '' });
      fetchClients();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add client');
    }
  };

  const handleEditClient = async () => {
    if (!editForm.name || !editForm.email) {
      Alert.alert('Error', 'Name and Email are required');
      return;
    }
    try {
      const response = await axios.put(`${BASE_URL}/api/admin/clients/${selectedClient.id}`, editForm, apiConfig);
      Alert.alert('Success', 'Client details updated');
      setSelectedClient({ ...selectedClient, ...response.data });
      setEditModalVisible(false);
      fetchClients();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update client');
    }
  };

  const handleDeleteClient = async (clientId) => {
    const confirmDelete = () => {
      axios.delete(`${BASE_URL}/api/admin/clients/${clientId}`, apiConfig)
        .then(() => {
          Alert.alert('Deleted', 'Client deleted successfully');
          setSelectedClient(null);
          fetchClients();
        })
        .catch(err => {
          Alert.alert('Error', 'Failed to delete client');
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this client and all their records?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Delete Client', 'Are you sure you want to delete this client and all their records?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete }
      ]);
    }
  };

  // Vehicle Management
  const handleAddVehicle = async () => {
    if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.year) {
      Alert.alert('Error', 'Make, model, and year are required');
      return;
    }
    try {
      await axios.post(`${BASE_URL}/api/admin/clients/${selectedClient.id}/vehicles`, vehicleForm, apiConfig);
      setVehicleModalVisible(false);
      setVehicleForm({ make: '', model: '', year: '', license_plate: '' });
      fetchClientRecords(selectedClient.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to add vehicle');
    }
  };

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      await axios.delete(`${BASE_URL}/api/admin/vehicles/${vehicleId}`, apiConfig);
      fetchClientRecords(selectedClient.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete vehicle');
    }
  };

  // Workshop Visit Management
  const handleAddVisit = async () => {
    if (!visitForm.fixes_performed) {
      Alert.alert('Error', 'Fixes performed is required');
      return;
    }
    try {
      await axios.post(`${BASE_URL}/api/admin/clients/${selectedClient.id}/visits`, visitForm, apiConfig);
      setVisitModalVisible(false);
      setVisitForm({ vehicle_id: '', visit_date: '', fixes_performed: '', next_instructions: '' });
      fetchClientRecords(selectedClient.id);
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add visit');
    }
  };

  const handleDeleteVisit = async (visitId) => {
    try {
      await axios.delete(`${BASE_URL}/api/admin/visits/${visitId}`, apiConfig);
      fetchClientRecords(selectedClient.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete visit');
    }
  };

  const handleStartEditVisit = (visit) => {
    setEditingVisit(visit);
    setEditVisitForm({
      vehicle_id: visit.vehicle_id ? String(visit.vehicle_id) : '',
      visit_date: visit.visit_date || '',
      fixes_performed: visit.fixes_performed || '',
      next_instructions: visit.next_instructions || ''
    });
    setEditVisitModalVisible(true);
  };

  const handleUpdateVisit = async () => {
    if (!editVisitForm.fixes_performed) {
      Alert.alert('Error', 'Fixes performed is required');
      return;
    }
    try {
      await axios.put(`${BASE_URL}/api/admin/visits/${editingVisit.id}`, editVisitForm, apiConfig);
      Alert.alert('Success', 'Workshop visit details updated successfully');
      setEditVisitModalVisible(false);
      setEditingVisit(null);
      fetchClientRecords(selectedClient.id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to update workshop visit');
    }
  };

  // Reset Password Management
  const handleResetPassword = async () => {
    if (!resetPasswordForm.new_password) {
      Alert.alert('Error', 'New password is required');
      return;
    }
    try {
      await axios.post(`${BASE_URL}/api/admin/clients/${selectedClient.id}/reset-password`, resetPasswordForm, apiConfig);
      Alert.alert('Success', 'Password reset successfully');
      setResetPasswordModalVisible(false);
      setResetPasswordForm({ new_password: '' });
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to reset password');
    }
  };

  // Document Management
  const handlePickAndUploadDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploadingDoc(true);
      const asset = result.assets[0];
      const { uri, name, mimeType } = asset;

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('document', blob, name);
      } else {
        formData.append('document', {
          uri: uri,
          name: name || 'document.pdf',
          type: mimeType || 'application/octet-stream'
        });
      }

      await axios.post(`${BASE_URL}/api/admin/clients/${selectedClient.id}/documents`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      Alert.alert('Success', 'Document uploaded successfully');
      fetchClientRecords(selectedClient.id);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    try {
      await axios.delete(`${BASE_URL}/api/admin/documents/${docId}`, apiConfig);
      fetchClientRecords(selectedClient.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete document');
    }
  };

  const handleViewDocument = async (filePath) => {
    try {
      const fileUrl = `${BASE_URL}/${filePath}`;
      await WebBrowser.openBrowserAsync(fileUrl);
    } catch (err) {
      Alert.alert('Error', 'Cannot open document');
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.roleTag}>ADMIN PANEL</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity 
            style={styles.appointmentsBtn} 
            onPress={() => navigation.navigate('OfficeChat', { user, token })}
          >
            <Text style={styles.appointmentsBtnText}>💬 Chat Ufficio</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.appointmentsBtn} 
            onPress={() => navigation.navigate('Appointments', { user, token })}
          >
            <Text style={styles.appointmentsBtnText}>📅 Appuntamenti</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.contentLayout, { flexDirection: isMobile ? 'column' : 'row' }]}>
        {/* Left Column: Clients List */}
        <View style={[
          styles.column, 
          { 
            flex: selectedClient && !isMobile ? 1 : 2, 
            maxWidth: selectedClient && !isMobile ? 400 : '100%', 
            marginBottom: isMobile ? 20 : 0,
            display: isMobile && selectedClient ? 'none' : 'flex'
          }
        ]}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.sectionTitle}>Clients ({clients.length})</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setAddModalVisible(true)}>
              <Text style={styles.addButtonText}>+ Add Client</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchBar}
            placeholder="Search clients by name or email..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          {loading ? (
            <ActivityIndicator color="#E53935" size="large" style={{ marginTop: 20 }} />
          ) : (
            <ScrollView style={styles.listScroll}>
              {filteredClients.map((client) => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientCard,
                    selectedClient?.id === client.id && styles.clientCardActive
                  ]}
                  onPress={() => handleSelectClient(client)}
                >
                  <View style={styles.clientMainInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                  </View>
                  {client.phone ? (
                    <Text style={styles.clientPhone}>{client.phone}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
              {filteredClients.length === 0 && (
                <Text style={styles.emptyText}>No clients found.</Text>
              )}
            </ScrollView>
          )}
        </View>

        {/* Right Column: Selected Client Dashboard */}
        {selectedClient ? (
          <View style={[styles.column, !isMobile && styles.rightColumn, { flex: 2, marginBottom: isMobile ? 20 : 0 }]}>
            <ScrollView style={styles.detailScroll}>
              {/* Profile Card */}
              <View style={styles.detailHeaderCard}>
                <View style={styles.detailTitleRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {isMobile && (
                      <TouchableOpacity onPress={() => setSelectedClient(null)} style={{ marginRight: 10 }}>
                        <Text style={{ color: '#E53935', fontSize: 16, fontWeight: 'bold' }}>{'< Back'}</Text>
                      </TouchableOpacity>
                    )}
                    <Text style={styles.detailName}>{selectedClient.name}</Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity
                      style={[styles.smallButton, { backgroundColor: '#FFA000', marginRight: 8 }]}
                      onPress={() => setResetPasswordModalVisible(true)}
                    >
                      <Text style={styles.smallButtonText}>Reset Pass</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallButton, { backgroundColor: '#333', marginRight: 8 }]}
                      onPress={() => setEditModalVisible(true)}
                    >
                      <Text style={styles.smallButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.smallButton, { backgroundColor: '#E53935' }]}
                      onPress={() => handleDeleteClient(selectedClient.id)}
                    >
                      <Text style={styles.smallButtonText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.detailField}><Text style={styles.boldText}>Email:</Text> {selectedClient.email}</Text>
                <Text style={styles.detailField}><Text style={styles.boldText}>Phone:</Text> {selectedClient.phone || 'N/A'}</Text>
                <Text style={styles.detailField}><Text style={styles.boldText}>Address:</Text> {selectedClient.address || 'N/A'}</Text>
              </View>

              {recordsLoading ? (
                <ActivityIndicator color="#E53935" style={{ marginTop: 20 }} />
              ) : (
                <>
                  {/* Vehicles Section */}
                  <View style={styles.subSectionCard}>
                    <View style={styles.subSectionHeader}>
                      <Text style={styles.subSectionTitle}>Vehicles</Text>
                      <TouchableOpacity style={styles.smallAddButton} onPress={() => setVehicleModalVisible(true)}>
                        <Text style={styles.smallAddButtonText}>+ Add Vehicle</Text>
                      </TouchableOpacity>
                    </View>
                    {clientRecords.vehicles.map((v) => (
                      <View key={v.id} style={styles.recordItem}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.recordMainText}>Make: {v.make} | Model: {v.model} ({v.year})</Text>
                          {v.license_plate ? <Text style={styles.recordSubText}>Plate: {v.license_plate}</Text> : null}
                        </View>
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity style={[styles.deleteRecordButton, { backgroundColor: '#333', marginRight: 5 }]} onPress={() => { setSelectedVehicle(v); setVehicleDetailModalVisible(true); }}>
                            <Text style={[styles.deleteRecordText, { color: '#FFF' }]}>View</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteRecordButton} onPress={() => handleDeleteVehicle(v.id)}>
                            <Text style={styles.deleteRecordText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {clientRecords.vehicles.length === 0 && (
                      <Text style={styles.emptyTextSub}>No vehicles registered.</Text>
                    )}
                  </View>

                  {/* Workshop Visits Section */}
                  <View style={styles.subSectionCard}>
                    <View style={styles.subSectionHeader}>
                      <Text style={styles.subSectionTitle}>Workshop Visits</Text>
                      <TouchableOpacity style={styles.smallAddButton} onPress={() => setVisitModalVisible(true)}>
                        <Text style={styles.smallAddButtonText}>+ Add Visit</Text>
                      </TouchableOpacity>
                    </View>
                    {clientRecords.visits && clientRecords.visits.map((v) => {
                      const vehicle = clientRecords.vehicles.find(veh => String(veh.id) === String(v.vehicle_id));
                      const carName = vehicle ? `Make: ${vehicle.make} - Model: ${vehicle.model}` : 'Unknown Car';
                      return (
                        <View key={v.id} style={styles.recordItem}>
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text style={styles.recordMainText}>{new Date(v.visit_date).toLocaleString()} - {carName}</Text>
                            <Text style={styles.recordSubText} numberOfLines={1}>Fixes: <Text style={{ color: '#E53935' }}>{v.fixes_performed}</Text></Text>
                            {v.next_instructions ? <Text style={styles.recordSubText} numberOfLines={1}>Next: {v.next_instructions}</Text> : null}
                          </View>
                          <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity style={[styles.deleteRecordButton, { backgroundColor: '#FFA000', marginRight: 5 }]} onPress={() => handleStartEditVisit(v)}>
                              <Text style={[styles.deleteRecordText, { color: '#FFF' }]}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteRecordButton} onPress={() => handleDeleteVisit(v.id)}>
                              <Text style={styles.deleteRecordText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                    {(!clientRecords.visits || clientRecords.visits.length === 0) && (
                      <Text style={styles.emptyTextSub}>No workshop visits.</Text>
                    )}
                  </View>

                  {/* Documents Section */}
                  <View style={styles.subSectionCard}>
                    <View style={styles.subSectionHeader}>
                      <Text style={styles.subSectionTitle}>Client Documents</Text>
                      <TouchableOpacity
                        style={[styles.smallAddButton, { backgroundColor: '#1976D2' }]}
                        onPress={handlePickAndUploadDocument}
                        disabled={uploadingDoc}
                      >
                        {uploadingDoc ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text style={styles.smallAddButtonText}>+ Upload File</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                    {clientRecords.documents.map((d) => (
                      <View key={d.id} style={styles.recordItem}>
                        <TouchableOpacity style={{ flex: 1, marginRight: 8 }} onPress={() => handleViewDocument(d.file_path)}>
                          <Text style={[styles.recordMainText, styles.linkText]}>{d.file_name}</Text>
                          <Text style={styles.recordSubText}>Uploaded: {new Date(d.uploaded_at).toLocaleString()}</Text>
                        </TouchableOpacity>
                        <View style={{ flexDirection: 'row' }}>
                          <TouchableOpacity style={[styles.deleteRecordButton, { backgroundColor: '#333', marginRight: 5 }]} onPress={() => handleViewDocument(d.file_path)}>
                            <Text style={[styles.deleteRecordText, { color: '#FFF' }]}>View</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.deleteRecordButton} onPress={() => handleDeleteDocument(d.id)}>
                            <Text style={styles.deleteRecordText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                    {clientRecords.documents.length === 0 && (
                      <Text style={styles.emptyTextSub}>No documents uploaded.</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        ) : !isMobile ? (
          <View style={[styles.column, styles.rightColumn, styles.centered, { flex: 2 }]}>
            <Text style={styles.noSelectionText}>Select a client from the list to manage records and documents.</Text>
          </View>
        ) : null}
      </View>

      {/* Add Client Modal */}
      <Modal animationType="slide" transparent visible={addModalVisible} onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Client</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name *"
              placeholderTextColor="#888"
              value={clientForm.name}
              onChangeText={(txt) => setClientForm({ ...clientForm, name: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email *"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={clientForm.email}
              onChangeText={(txt) => setClientForm({ ...clientForm, email: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Password (defaults to: client123)"
              placeholderTextColor="#888"
              secureTextEntry
              value={clientForm.password}
              onChangeText={(txt) => setClientForm({ ...clientForm, password: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone"
              placeholderTextColor="#888"
              value={clientForm.phone}
              onChangeText={(txt) => setClientForm({ ...clientForm, phone: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Address"
              placeholderTextColor="#888"
              value={clientForm.address}
              onChangeText={(txt) => setClientForm({ ...clientForm, address: txt })}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => setAddModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E53935' }]} onPress={handleAddClient}>
                <Text style={styles.modalButtonText}>Save Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Client Modal */}
      <Modal animationType="slide" transparent visible={editModalVisible} onRequestClose={() => setEditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Client Details</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Name *"
              placeholderTextColor="#888"
              value={editForm.name}
              onChangeText={(txt) => setEditForm({ ...editForm, name: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Email *"
              placeholderTextColor="#888"
              keyboardType="email-address"
              autoCapitalize="none"
              value={editForm.email}
              onChangeText={(txt) => setEditForm({ ...editForm, email: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Phone"
              placeholderTextColor="#888"
              value={editForm.phone}
              onChangeText={(txt) => setEditForm({ ...editForm, phone: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Address"
              placeholderTextColor="#888"
              value={editForm.address}
              onChangeText={(txt) => setEditForm({ ...editForm, address: txt })}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E53935' }]} onPress={handleEditClient}>
                <Text style={styles.modalButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Vehicle Modal */}
      <Modal animationType="slide" transparent visible={vehicleModalVisible} onRequestClose={() => setVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Vehicle Record</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Make (e.g. Porsche) *"
              placeholderTextColor="#888"
              value={vehicleForm.make}
              onChangeText={(txt) => setVehicleForm({ ...vehicleForm, make: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Model (e.g. 911 GT3) *"
              placeholderTextColor="#888"
              value={vehicleForm.model}
              onChangeText={(txt) => setVehicleForm({ ...vehicleForm, model: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Year (e.g. 2024) *"
              placeholderTextColor="#888"
              keyboardType="numeric"
              value={vehicleForm.year}
              onChangeText={(txt) => setVehicleForm({ ...vehicleForm, year: txt })}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="License Plate"
              placeholderTextColor="#888"
              value={vehicleForm.license_plate}
              onChangeText={(txt) => setVehicleForm({ ...vehicleForm, license_plate: txt })}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => setVehicleModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E53935' }]} onPress={handleAddVehicle}>
                <Text style={styles.modalButtonText}>Add Vehicle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Visit Modal */}
      <Modal animationType="slide" transparent visible={visitModalVisible} onRequestClose={() => setVisitModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Workshop Visit</Text>

            <Text style={{ color: '#FFF', marginBottom: 5 }}>Select Vehicle *:</Text>
            {clientRecords.vehicles.length === 0 ? (
              <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 15 }}>No registered vehicles. Please add a vehicle first.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {clientRecords.vehicles.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.smallButton,
                      { 
                        backgroundColor: String(visitForm.vehicle_id) === String(v.id) ? '#E53935' : '#333', 
                        marginRight: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8
                      }
                    ]}
                    onPress={() => setVisitForm({ ...visitForm, vehicle_id: v.id })}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>{v.make} {v.model}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Visit Date/Time (leave blank for now)"
              placeholderTextColor="#888"
              value={visitForm.visit_date}
              onChangeText={(txt) => setVisitForm({ ...visitForm, visit_date: txt })}
            />

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Fixes Performed *"
              placeholderTextColor="#888"
              multiline
              value={visitForm.fixes_performed}
              onChangeText={(txt) => setVisitForm({ ...visitForm, fixes_performed: txt })}
            />

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Next Instructions"
              placeholderTextColor="#888"
              multiline
              value={visitForm.next_instructions}
              onChangeText={(txt) => setVisitForm({ ...visitForm, next_instructions: txt })}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => setVisitModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E53935' }]} onPress={handleAddVisit}>
                <Text style={styles.modalButtonText}>Add Visit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Visit Detail Modal */}
      <Modal animationType="slide" transparent visible={visitDetailModalVisible} onRequestClose={() => setVisitDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Workshop Visit Details</Text>
            {selectedVisit && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Date & Time:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 15 }}>{new Date(selectedVisit.visit_date).toLocaleString()}</Text>

                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Vehicle:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 15 }}>{selectedVisit.carName}</Text>

                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Fixes Performed:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 15 }}>{selectedVisit.fixes_performed}</Text>

                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Next Instructions:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 20 }}>{selectedVisit.next_instructions || 'None'}</Text>
              </ScrollView>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => setVisitDetailModalVisible(false)}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Visit Modal */}
      <Modal animationType="slide" transparent visible={editVisitModalVisible} onRequestClose={() => { setEditVisitModalVisible(false); setEditingVisit(null); }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Workshop Visit</Text>

            <Text style={{ color: '#FFF', marginBottom: 5 }}>Select Vehicle *:</Text>
            {clientRecords.vehicles.length === 0 ? (
              <Text style={{ color: '#888', fontStyle: 'italic', marginBottom: 15 }}>No registered vehicles.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                {clientRecords.vehicles.map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.smallButton,
                      { 
                        backgroundColor: String(editVisitForm.vehicle_id) === String(v.id) ? '#E53935' : '#333', 
                        marginRight: 8,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8
                      }
                    ]}
                    onPress={() => setEditVisitForm({ ...editVisitForm, vehicle_id: v.id })}
                  >
                    <Text style={{ color: '#FFF', fontSize: 13, fontWeight: 'bold' }}>{v.make} {v.model}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TextInput
              style={styles.modalInput}
              placeholder="Visit Date/Time"
              placeholderTextColor="#888"
              value={editVisitForm.visit_date}
              onChangeText={(txt) => setEditVisitForm({ ...editVisitForm, visit_date: txt })}
            />

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Fixes Performed *"
              placeholderTextColor="#888"
              multiline
              value={editVisitForm.fixes_performed}
              onChangeText={(txt) => setEditVisitForm({ ...editVisitForm, fixes_performed: txt })}
            />

            <TextInput
              style={[styles.modalInput, { height: 80 }]}
              placeholder="Next Instructions"
              placeholderTextColor="#888"
              multiline
              value={editVisitForm.next_instructions}
              onChangeText={(txt) => setEditVisitForm({ ...editVisitForm, next_instructions: txt })}
            />

            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => { setEditVisitModalVisible(false); setEditingVisit(null); }}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#E53935' }]} onPress={handleUpdateVisit}>
                <Text style={styles.modalButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Vehicle Detail Modal */}
      <Modal animationType="slide" transparent visible={vehicleDetailModalVisible} onRequestClose={() => setVehicleDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vehicle Details</Text>
            {selectedVehicle && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Make & Model:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 15 }}>{selectedVehicle.make} {selectedVehicle.model}</Text>

                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Year:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 15 }}>{selectedVehicle.year}</Text>

                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>License Plate:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 15 }}>{selectedVehicle.license_plate || 'N/A'}</Text>

                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>Added On:</Text>
                <Text style={{ color: '#B0B0B0', marginBottom: 20 }}>{new Date(selectedVehicle.created_at).toLocaleString()}</Text>
              </ScrollView>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => setVehicleDetailModalVisible(false)}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal animationType="slide" transparent visible={resetPasswordModalVisible} onRequestClose={() => setResetPasswordModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Client Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type new password here *"
              placeholderTextColor="#888"
              value={resetPasswordForm.new_password}
              onChangeText={(txt) => setResetPasswordForm({ new_password: txt })}
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#333' }]} onPress={() => setResetPasswordModalVisible(false)}>
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: '#FFA000' }]} onPress={handleResetPassword}>
                <Text style={styles.modalButtonText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#161822',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 55 : 25,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logo: {
    width: 140,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  brand: {
    fontSize: 24,
    fontWeight: '900',
    color: '#E53935',
    letterSpacing: 2
  },
  roleTag: {
    color: '#FFC107',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#E53935',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  logoutText: {
    color: '#E53935',
    fontSize: 14,
    fontWeight: 'bold'
  },
  contentLayout: {
    flex: 1,
    padding: 16,
  },
  column: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#292929',
  },
  rightColumn: {
    marginLeft: 20
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF'
  },
  addButton: {
    backgroundColor: '#E53935',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  searchBar: {
    backgroundColor: '#292929',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    marginBottom: 16,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333'
  },
  listScroll: {
    flex: 1
  },
  clientCard: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  clientCardActive: {
    borderColor: '#E53935',
    backgroundColor: '#2c2222'
  },
  clientMainInfo: {
    flex: 1
  },
  clientName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  clientEmail: {
    color: '#B0B0B0',
    fontSize: 12,
    marginTop: 4
  },
  clientPhone: {
    color: '#888',
    fontSize: 12
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  noSelectionText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 40
  },
  detailScroll: {
    flex: 1
  },
  detailHeaderCard: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  detailName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1
  },
  smallButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6
  },
  smallButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  detailField: {
    color: '#B0B0B0',
    fontSize: 14,
    marginBottom: 6
  },
  boldText: {
    fontWeight: 'bold',
    color: '#FFF'
  },
  subSectionCard: {
    backgroundColor: '#252525',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 20
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#333',
    paddingBottom: 8
  },
  subSectionTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  smallAddButton: {
    backgroundColor: '#E53935',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6
  },
  smallAddButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold'
  },
  recordItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292929'
  },
  recordMainText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold'
  },
  linkText: {
    color: '#64B5F6',
    textDecorationLine: 'underline'
  },
  recordSubText: {
    color: '#B0B0B0',
    fontSize: 12,
    marginTop: 2
  },
  deleteRecordButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(229,57,53,0.1)'
  },
  deleteRecordText: {
    color: '#E53935',
    fontSize: 11,
    fontWeight: 'bold'
  },
  emptyTextSub: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 10
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    width: '100%',
    maxWidth: 450,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333'
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  modalInput: {
    backgroundColor: '#292929',
    borderRadius: 8,
    padding: 12,
    color: '#FFF',
    marginBottom: 16,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#333'
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6
  },
  modalButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  appointmentsBtn: {
    borderWidth: 1,
    borderColor: '#FFC107',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,193,7,0.08)'
  },
  appointmentsBtnText: {
    color: '#FFC107',
    fontSize: 14,
    fontWeight: 'bold'
  }
});
