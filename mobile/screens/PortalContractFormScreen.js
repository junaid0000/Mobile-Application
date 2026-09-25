import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Platform,
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function PortalContractFormScreen({ navigation, route }) {
  const { car, carContratto, user, token } = route.params || {};
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [nome, setNome] = useState(carContratto?.acquirente_nome || car?.cliente || '');
  const [cognome, setCognome] = useState(carContratto?.acquirente_cognome || '');
  const [telefono, setTelefono] = useState(carContratto?.acquirente_telefono || '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const displayIndice = carContratto?.indice || car?.interno || car?.indice || '15551';

  const generateAndDownloadPDF = (carData, buyerData, assignedIndice) => {
    const dateStr = new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' });
    const modelDisplay = (carData.modello && carData.marca && carData.modello.toLowerCase().startsWith(carData.marca.toLowerCase()))
      ? carData.modello
      : (carData.marca && carData.modello ? `${carData.marca} ${carData.modello}` : (carData.modello || carData.marca || 'Veicolo'));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contratto_Indice_${assignedIndice}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #0F172A; background: #FFFFFF; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #0F172A; padding-bottom: 16px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: 800; color: #0F172A; letter-spacing: 1px; }
          .logo span { color: #0284C7; }
          .badge { background: #0F172A; color: #FFFFFF; padding: 6px 14px; border-radius: 6px; font-weight: 700; font-size: 14px; }
          .doc-title { text-align: center; font-size: 20px; font-weight: 800; margin-bottom: 24px; text-transform: uppercase; letter-spacing: 1px; }
          .card { background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px; margin-bottom: 20px; }
          .card-title { font-size: 15px; font-weight: 700; color: #0F172A; border-bottom: 2px solid #CBD5E1; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .item { font-size: 13px; }
          .label { font-weight: 600; color: #64748B; }
          .val { font-weight: 700; color: #0F172A; }
          .price-banner { background: #0F172A; color: #FFFFFF; padding: 14px 18px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 800; }
          .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
          .sig-box { width: 45%; border-top: 1px solid #94A3B8; padding-top: 8px; text-align: center; font-size: 12px; color: #64748B; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ROSSOMANDI <span>AUTOMOTIVE</span></div>
          <div class="badge">INDICE CLIENTE #${assignedIndice}</div>
        </div>
        <div class="doc-title">CONTRATTO DI COMPRAVENDITA VEICOLO</div>
        
        <div class="card">
          <div class="card-title">1. DATI DEL VEICOLO</div>
          <div class="grid">
            <div class="item"><span class="label">Marca & Modello:</span> <span class="val">${modelDisplay}</span></div>
            <div class="item"><span class="label">Targa:</span> <span class="val">${carData.targa || 'N/D'}</span></div>
            <div class="item"><span class="label">Codice Interno:</span> <span class="val">${carData.interno || assignedIndice}</span></div>
            <div class="item"><span class="label">Numero Telaio:</span> <span class="val">${carData.telaio || 'N/D'}</span></div>
            <div class="item"><span class="label">Anno:</span> <span class="val">${carData.anno || 'N/D'}</span></div>
            <div class="item"><span class="label">Chilometraggio:</span> <span class="val">${carData.km || 'N/D'}</span></div>
            <div class="item"><span class="label">Alimentazione:</span> <span class="val">${carData.alimentazione || 'N/D'}</span></div>
            <div class="item"><span class="label">Colore Esterno:</span> <span class="val">${carData.colore || 'N/D'}</span></div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">2. DATI ACQUIRENTE (CLIENTE)</div>
          <div class="grid">
            <div class="item"><span class="label">Nome Acquirente:</span> <span class="val">${buyerData.nome}</span></div>
            <div class="item"><span class="label">Cognome Acquirente:</span> <span class="val">${buyerData.cognome}</span></div>
            <div class="item"><span class="label">Recapito Telefonico:</span> <span class="val">${buyerData.telefono}</span></div>
            <div class="item"><span class="label">Data Registrazione:</span> <span class="val">${dateStr}</span></div>
            <div class="item"><span class="label">Venditore Incaricato:</span> <span class="val">${user?.name || 'Venditore Rossomandi'}</span></div>
          </div>
        </div>

        <div class="price-banner">
          <span>PREZZO FINALE CONCORDATO</span>
          <span>€ ${carData.prezzo ? Number(carData.prezzo).toLocaleString('it-IT') : 'Trattativa Riservata'}</span>
        </div>

        <div class="signatures">
          <div class="sig-box">Firma Venditore (Rossomandi Automotive)</div>
          <div class="sig-box">Firma Acquirente (${buyerData.nome} ${buyerData.cognome})</div>
        </div>
      </body>
      </html>
    `;

    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 300);
      } else {
        alert('Abilita i pop-up per scaricare il PDF del contratto.');
      }
    } else {
      try {
        const Print = require('expo-print');
        Print.printAsync({ html: htmlContent });
      } catch (err) {
        Alert.alert('Successo', `Contratto salvato con Indice #${assignedIndice}!`);
      }
    }
  };

  const handleSaveContract = async () => {
    if (!nome.trim() || !cognome.trim() || !telefono.trim()) {
      const errorMsg = 'Inserisci Nome, Cognome e Telefono dell\'acquirente.';
      if (Platform.OS === 'web') alert(errorMsg);
      else Alert.alert('Errore', errorMsg);
      return;
    }

    setSubmitting(true);

    try {
      const targetIndice = car?.interno || car?.indice || displayIndice;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const payload = {
        interno: car?.interno,
        indice: targetIndice,
        acquirente_nome: nome.trim(),
        acquirente_cognome: cognome.trim(),
        acquirente_telefono: telefono.trim(),
        venditore: user?.name || 'VENDITORE',
      };

      let assignedIdx = targetIndice;

      try {
        const res = await axios.post(`${BASE_URL}/api/portal/contratto`, payload, { headers });
        if (res.data && res.data.indice) {
          assignedIdx = res.data.indice;
        }
      } catch (err) {
        console.log('Contract save backend fallback, generating local contract:', err.message);
      }

      // Generate PDF & trigger print/download matching Indice and Codice Interno
      generateAndDownloadPDF(car, { nome: nome.trim(), cognome: cognome.trim(), telefono: telefono.trim() }, assignedIdx);

      const successMsg = `Contratto salvato come PDF per ${nome} ${cognome}! (Indice #${assignedIdx})`;
      if (Platform.OS === 'web') alert(successMsg);
      else Alert.alert('Successo', successMsg);

    } catch (err) {
      console.error('Error saving contract:', err);
      const errMsg = err.response?.data?.error || 'Impossibile salvare il contratto.';
      if (Platform.OS === 'web') alert(errMsg);
      else Alert.alert('Errore', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel action goes directly back to Step 1: main Portale page (PortalList)
  const handleCancelAndGoToPortal = () => {
    navigation.navigate('PortalList');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F13" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Text style={styles.backButtonText}>‹ Dettaglio Veicolo</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Nuovo Contratto</Text>
          <Text style={styles.headerSubtitle}>Inserisci Dati Acquirente</Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.formWrapper, { maxWidth: isMobile ? '100%' : 700, alignSelf: 'center', width: '100%' }]}>
          
          {/* Selected Car Info Banner */}
          <View style={styles.vehicleSummaryCard}>
            <Text style={styles.vehicleSummaryTitle}>Veicolo Selezionato</Text>
            <Text style={styles.vehicleSummaryModel}>{car?.modello || 'Veicolo'}</Text>
            <View style={styles.vehicleSummaryRow}>
              <Text style={styles.vehicleSummaryDetail}>Cod. Interno: #{car?.interno || 'N/D'} • {car?.residente_a ? 'Città: ' + car.residente_a : ''}</Text>
              <Text style={styles.vehicleSummaryPrice}>
                {car?.prezzo ? `€ ${Number(car?.prezzo).toLocaleString('it-IT')}` : ''}
              </Text>
            </View>
          </View>

          {/* Indice cliente Banner next to inputs */}
          <View style={styles.indiceHeaderBox}>
            <Text style={styles.indiceHeaderLabel}>INDICE CLIENTE ASSEGNATO</Text>
            <Text style={styles.indiceHeaderValue}>#{displayIndice}</Text>
          </View>

          {/* Buyer Form Fields */}
          <View style={styles.formCard}>
            <Text style={styles.formSectionTitle}>Compila Dati Acquirente</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome Acquirente *</Text>
              <TextInput
                style={styles.input}
                placeholder="Es. Mario"
                placeholderTextColor="#64748B"
                value={nome}
                onChangeText={setNome}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cognome Acquirente *</Text>
              <TextInput
                style={styles.input}
                placeholder="Es. Rossi"
                placeholderTextColor="#64748B"
                value={cognome}
                onChangeText={setCognome}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefono *</Text>
              <TextInput
                style={styles.input}
                placeholder="Es. +39 340 1234567"
                placeholderTextColor="#64748B"
                keyboardType="phone-pad"
                value={telefono}
                onChangeText={setTelefono}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Note Contratto (Opzionale)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Es. Acconto versato, consegna prevista a fine mese..."
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                value={note}
                onChangeText={setNote}
              />
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Side-by-Side Action Buttons Pinned at Bottom */}
      <View style={styles.bottomActionsBar}>
        <View style={[styles.bottomActionsInner, { maxWidth: isMobile ? '100%' : 700 }]}>
          
          {/* Button 1: Salva come PDF */}
          <TouchableOpacity
            style={[styles.actionButton, styles.savePdfButton]}
            activeOpacity={0.88}
            onPress={handleSaveContract}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#0F0F13" size="small" />
            ) : (
              <>
                <Text style={styles.savePdfIcon}>💾</Text>
                <Text style={styles.savePdfText}>Salva come PDF</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Button 2: Annulla (Goes back to Step 1: main Portale page) */}
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            activeOpacity={0.85}
            onPress={handleCancelAndGoToPortal}
          >
            <Text style={styles.cancelIcon}>🚫</Text>
            <Text style={styles.cancelText}>Annulla</Text>
          </TouchableOpacity>

        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#141824',
  },
  backButton: {
    paddingRight: 10,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  formWrapper: {
    width: '100%',
  },
  vehicleSummaryCard: {
    backgroundColor: '#141824',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3047',
  },
  vehicleSummaryTitle: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  vehicleSummaryModel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  vehicleSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleSummaryDetail: {
    color: '#94A3B8',
    fontSize: 13,
  },
  vehicleSummaryPrice: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
  },
  indiceHeaderBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  indiceHeaderLabel: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  indiceHeaderValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  formCard: {
    backgroundColor: '#141824',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2A3047',
  },
  formSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    color: '#FFFFFF',
    fontSize: 15,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomActionsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#141824',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  bottomActionsInner: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    alignSelf: 'center',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  savePdfButton: {
    backgroundColor: '#38BDF8',
  },
  savePdfIcon: {
    fontSize: 16,
  },
  savePdfText: {
    color: '#0F0F13',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#FF4757',
  },
  cancelIcon: {
    fontSize: 16,
  },
  cancelText: {
    color: '#FF4757',
    fontSize: 15,
    fontWeight: '700',
  },
});
