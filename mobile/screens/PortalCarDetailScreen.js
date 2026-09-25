import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/apiConfig';

export default function PortalCarDetailScreen({ navigation, route }) {
  const { car, carContratto, user, token } = route.params || {};
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Comparison logic: Indice vs Nota1
  const codeIndice = car?.indice || car?.interno || 'N/D';
  const codeNota1 = car?.nota1 ? String(car.nota1).trim() : '';
  const isNota1Empty = !codeNota1;
  // Rule: If Nota1 is present, system looks for [Nota1].pdf. If Nota1 is empty, require user to enter Nota1.
  const targetPdfCode = codeNota1;

  // PDF Status state
  const [hasPdf, setHasPdf] = useState(car?.has_pdf || false);
  const [pdfFilename, setPdfFilename] = useState(car?.pdf_filename || (targetPdfCode ? `${targetPdfCode}.pdf` : null));
  const [pdfUrl, setPdfUrl] = useState(car?.pdf_url || (car?.has_pdf && targetPdfCode ? `/uploads/preventivi_pdf/${targetPdfCode}.pdf` : null));
  const [checkingPdf, setCheckingPdf] = useState(false);

  // Email Modal state
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);

  // Prepopulate email defaults when opening modal
  useEffect(() => {
    if (car) {
      const carName = car.modello || 'Veicolo';
      setEmailSubject(`Rossomandi Automotive - Documentazione Veicolo ${carName} (Rif. ${targetPdfCode})`);
      setEmailMessage(
        `Gentile Cliente,\n\nIn allegato Le inviamo la documentazione e preventivo per il veicolo ${carName} (Riferimento ${targetPdfCode}).\n\nRestiamo a Sua completa disposizione per qualsiasi chiarimento o per concordare una prova su strada.\n\nCordiali saluti,\nRossomandi Automotive SRL\nTel: +39-3481714322`
      );
    }
  }, [car, targetPdfCode]);

  // Check PDF status on server
  const checkServerPdfStatus = async () => {
    if (!targetPdfCode) {
      setHasPdf(false);
      setPdfFilename(null);
      setPdfUrl(null);
      return;
    }
    setCheckingPdf(true);
    try {
      const res = await axios.get(`${BASE_URL}/api/portal/pdf-status/${targetPdfCode}`);
      if (res.data && res.data.exists) {
        setHasPdf(true);
        setPdfFilename(res.data.filename);
        setPdfUrl(res.data.url);
      } else {
        setHasPdf(false);
      }
    } catch (err) {
      console.log('Error checking PDF status:', err.message);
    } finally {
      setCheckingPdf(false);
    }
  };

  useEffect(() => {
    checkServerPdfStatus();
  }, [targetPdfCode]);

  if (!car) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Nessun veicolo selezionato.</Text>
          <TouchableOpacity style={styles.backButtonSimple} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonTextSimple}>Torna alla lista Portale</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Handle viewing / downloading the PDF
  const handleOpenPdf = () => {
    if (!pdfUrl) {
      const msg = 'PDF non disponibile sul server.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Avviso', msg);
      return;
    }
    const fullUrl = `${BASE_URL}${pdfUrl}`;
    if (Platform.OS === 'web') {
      window.open(fullUrl, '_blank');
    } else {
      Linking.openURL(fullUrl).catch(() => {
        Alert.alert('Errore', 'Impossibile aprire il link del PDF.');
      });
    }
  };

  // Handle sending email to client
  const handleSendEmail = async () => {
    if (!clientEmail || !clientEmail.includes('@')) {
      const err = 'Inserisci un indirizzo email valido.';
      if (Platform.OS === 'web') alert(err);
      else Alert.alert('Errore', err);
      return;
    }

    setSendingEmail(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${BASE_URL}/api/portal/send-pdf-email`, {
        client_email: clientEmail.trim(),
        target_pdf_code: targetPdfCode,
        car_model: car.modello || 'Veicolo',
        subject: emailSubject,
        message: emailMessage,
      }, { headers });

      const successMsg = res.data?.message || `Email inviata con successo a ${clientEmail}!`;
      if (Platform.OS === 'web') alert(successMsg);
      else Alert.alert('Successo', successMsg);

      setEmailModalVisible(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Errore durante l\'invio dell\'email.';
      if (Platform.OS === 'web') alert(errorMsg);
      else Alert.alert('Errore', errorMsg);
    } finally {
      setSendingEmail(false);
    }
  };

  // State for deleting PDF
  const [deletingPdf, setDeletingPdf] = useState(false);

  // Handle PDF deletion / removal from server
  const handleDeletePdf = () => {
    const doDelete = async () => {
      setDeletingPdf(true);
      try {
        await axios.delete(`${BASE_URL}/api/portal/pdf/${targetPdfCode}`);
        setHasPdf(false);
        setPdfFilename(null);
        setPdfUrl(null);
        const msg = `PDF per codice ${targetPdfCode} eliminato con successo dal server.`;
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Rimosso', msg);
      } catch (err) {
        const errorMsg = err.response?.data?.error || err.message || 'Errore durante la rimozione del PDF.';
        if (Platform.OS === 'web') alert(errorMsg);
        else Alert.alert('Errore', errorMsg);
      } finally {
        setDeletingPdf(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Sei sicuro di voler eliminare il file PDF collegato (${pdfFilename}) dal server?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Rimuovi PDF',
        `Sei sicuro di voler eliminare il file PDF collegato (${pdfFilename}) dal server?`,
        [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Elimina', style: 'destructive', onPress: doDelete }
        ]
      );
    }
  };

  // Handle Web file upload trigger (from computer / USB / any folder)
  const handleUploadClick = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('target_code', targetPdfCode);
        formData.append('file', file);

        try {
          const res = await axios.post(`${BASE_URL}/api/portal/upload-pdf?target_code=${targetPdfCode}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          alert(res.data.message || `PDF ${res.data.filename} caricato con successo!`);
          setHasPdf(true);
          setPdfFilename(res.data.filename);
          setPdfUrl(res.data.url);
        } catch (uploadErr) {
          alert('Errore caricamento PDF: ' + (uploadErr.response?.data?.error || uploadErr.message));
        } finally {
          setUploading(false);
        }
      };
      input.click();
    } else {
      Alert.alert('Caricamento Server', `Carica il file PDF nominato "${targetPdfCode}.pdf" nella cartella backend/uploads/preventivi_pdf/ sul server.`);
    }
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
          <Text style={styles.backButtonText}>‹ Lista Veicoli</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Dettagli Veicolo
          </Text>
          <Text style={styles.headerSubtitle}>
            Indice #{codeIndice} • Nota1: {codeNota1 || 'N/A'}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.cardWrapper, { maxWidth: isMobile ? '100%' : 760, alignSelf: 'center', width: '100%' }]}>
          
          {/* Main Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>{car.marca || 'ROSSOMANDI'}</Text>
              </View>
              {hasPdf ? (
                <View style={styles.pdfAvailableBadge}>
                  <Text style={styles.pdfAvailableBadgeText}>✓ PDF COLLEGATO</Text>
                </View>
              ) : (
                <View style={styles.stockBadge}>
                  <Text style={styles.stockBadgeText}>DISPONIBILE</Text>
                </View>
              )}
            </View>

            <Text style={styles.carModelTitle}>
              {car.modello}
            </Text>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Prezzo di Vendita</Text>
              <Text style={styles.priceValue}>
                {car.prezzo ? `€ ${Number(car.prezzo).toLocaleString('it-IT')}` : 'Trattativa Riservata'}
              </Text>
            </View>
          </View>

          {/* ── Comparison Banner: Indice vs Nota1 ─────────────────────── */}
          <View style={styles.comparisonBox}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle}>🔍 Controllo Codici Access (Indice vs Nota1)</Text>
            </View>
            <View style={styles.comparisonRow}>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>1. Colonna Indice</Text>
                <Text style={styles.comparisonValue}>#{codeIndice}</Text>
              </View>
              <View style={styles.comparisonArrow}>
                <Text style={{ color: '#38BDF8', fontSize: 18 }}>➜</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>2. Colonna Nota1</Text>
                <Text style={[styles.comparisonValue, { color: codeNota1 ? '#2ED573' : '#F59E0B' }]}>
                  {codeNota1 ? codeNota1 : 'Vuoto (Mancante)'}
                </Text>
              </View>
              <View style={styles.comparisonArrow}>
                <Text style={{ color: '#38BDF8', fontSize: 18 }}>=</Text>
              </View>
              <View style={styles.comparisonItem}>
                <Text style={styles.comparisonLabel}>PDF Cercato</Text>
                <Text style={[styles.comparisonValue, { color: codeNota1 ? '#38BDF8' : '#F59E0B', fontWeight: '800' }]}>
                  {codeNota1 ? `${codeNota1}.pdf` : 'Richiesto Nota1'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Dedicated PDF Preventivo Card ─────────────────────────── */}
          {isNota1Empty ? (
            <View style={[styles.pdfCard, styles.pdfCardEmptyNota1]}>
              <View style={styles.pdfCardHeader}>
                <Text style={styles.pdfCardIcon}>⚠️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pdfCardEmptyTitle}>
                    ⚠️ Missing Nota1 Code (Colonna Nota1 vuota)
                  </Text>
                  <Text style={styles.pdfCardEmptyMessage}>
                    Please enter the Nota1 number in this car's details so I can find PDF in your server.
                  </Text>
                  <Text style={styles.pdfCardEmptyEnglish}>
                    (Per favore inserisci il numero Nota1 nei dettagli di questa vettura su Access per poter trovare il PDF sul server)
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={[styles.pdfCard, hasPdf ? styles.pdfCardSuccess : styles.pdfCardWarning]}>
              <View style={styles.pdfCardHeader}>
                <Text style={styles.pdfCardIcon}>{hasPdf ? '📄' : '📁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pdfCardTitle}>
                    {hasPdf ? `PDF Preventivo Trovato (${pdfFilename})` : `PDF Preventivo non presente sul server`}
                  </Text>
                  <Text style={styles.pdfCardSub}>
                    {hasPdf 
                      ? `File associato al codice Nota1: ${targetPdfCode}. Pronto per visualizzazione ed invio email.`
                      : `Il sistema cerca il file "${targetPdfCode}.pdf". Caricalo sul server per abilitare l'invio.`
                    }
                  </Text>
                </View>
              </View>

              {/* Action Buttons for PDF */}
              <View style={styles.pdfActionsRow}>
                {hasPdf ? (
                  <>
                    <TouchableOpacity
                      style={[styles.pdfActionBtn, styles.viewPdfBtn]}
                      activeOpacity={0.85}
                      onPress={handleOpenPdf}
                    >
                      <Text style={styles.viewPdfBtnText}>👁️ Visualizza PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pdfActionBtn, styles.emailPdfBtn]}
                      activeOpacity={0.85}
                      onPress={() => setEmailModalVisible(true)}
                    >
                      <Text style={styles.emailPdfBtnText}>✉️ Invia PDF al Cliente</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pdfActionBtn, styles.replacePdfBtn]}
                      activeOpacity={0.85}
                      onPress={handleUploadClick}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.replacePdfBtnText}>📤 Sostituisci PDF (USB/PC)</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pdfActionBtn, styles.deletePdfBtn]}
                      activeOpacity={0.85}
                      onPress={handleDeletePdf}
                      disabled={deletingPdf}
                    >
                      {deletingPdf ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <Text style={styles.deletePdfBtnText}>🗑️ Rimuovi PDF</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[styles.pdfActionBtn, styles.uploadPdfBtn]}
                    activeOpacity={0.85}
                    onPress={handleUploadClick}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.uploadPdfBtnText}>📤 Carica PDF da Computer / USB ({targetPdfCode}.pdf)</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Specs Details Section */}
          <Text style={styles.sectionHeaderTitle}>Scheda Veicolo & Dati Access (tabPreventiviEsterni)</Text>
          
          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Indice Vettura</Text>
              <Text style={styles.specBoxValueHighlight}>#{codeIndice}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Codice Nota1</Text>
              <Text style={[styles.specBoxValueHighlight, { color: codeNota1 ? '#2ED573' : '#F59E0B' }]}>
                {codeNota1 || 'Non inserito'}
              </Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Rata FZero</Text>
              <Text style={[styles.specBoxValueHighlight, { color: '#38BDF8' }]}>
                {car.rata_f_zero ? `€ ${Number(car.rata_f_zero).toFixed(2)}` : 'N/D'}
              </Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Rimborso Mensile</Text>
              <Text style={styles.specBoxValue}>
                {car.rimborso ? `€ ${Number(car.rimborso).toFixed(2)}` : 'N/D'}
              </Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Colore VN</Text>
              <Text style={styles.specBoxValue}>{car.colore_vn || 'N/D'}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Tipo Appuntamento</Text>
              <Text style={styles.specBoxValue}>{car.tipo_appunt_vendita || 'Esterno'}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Venditore Assegnato</Text>
              <Text style={styles.specBoxValue}>{car.venditore || 'N/D'}</Text>
            </View>

            <View style={styles.specBox}>
              <Text style={styles.specBoxLabel}>Cliente Registrato</Text>
              <Text style={styles.specBoxValue}>{car.cliente || 'Disponibile in Stock'}</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Prominent Contratto Button Pinned at Bottom */}
      <View style={styles.bottomBarContainer}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity
            style={styles.contrattoButton}
            activeOpacity={0.88}
            onPress={() => navigation.navigate('PortalContractForm', { car, carContratto, user, token })}
          >
            <Text style={styles.contrattoButtonIcon}>📄</Text>
            <Text style={styles.contrattoButtonText}>Compila Contratto Form</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Modal Invia Email al Cliente ─────────────────────────────── */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: isMobile ? '92%' : 540 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✉️ Invia PDF al Cliente via Email</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <Text style={{ color: '#94A3B8', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 18 }}>
              {/* Attachment badge */}
              <View style={styles.attachmentBadge}>
                <Text style={{ color: '#38BDF8', fontWeight: '700', fontSize: 13 }}>
                  📎 Allegato: {pdfFilename}
                </Text>
                <Text style={{ color: '#94A3B8', fontSize: 11 }}>
                  Veicolo: {car.modello}
                </Text>
              </View>

              {/* Form Input: Client Email */}
              <Text style={styles.inputLabel}>Email Cliente *</Text>
              <TextInput
                style={styles.input}
                placeholder="Es. cliente@gmail.com"
                placeholderTextColor="#64748B"
                keyboardType="email-address"
                autoCapitalize="none"
                value={clientEmail}
                onChangeText={setClientEmail}
              />

              {/* Form Input: Subject */}
              <Text style={styles.inputLabel}>Oggetto Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Oggetto dell'email"
                placeholderTextColor="#64748B"
                value={emailSubject}
                onChangeText={setEmailSubject}
              />

              {/* Form Input: Message Body */}
              <Text style={styles.inputLabel}>Messaggio</Text>
              <TextInput
                style={[styles.input, { minHeight: 90, textAlignVertical: 'top' }]}
                multiline
                numberOfLines={4}
                placeholder="Testo dell'email per il cliente..."
                placeholderTextColor="#64748B"
                value={emailMessage}
                onChangeText={setEmailMessage}
              />

              {/* Action Buttons */}
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancelBtn]}
                  onPress={() => setEmailModalVisible(false)}
                  disabled={sendingEmail}
                >
                  <Text style={styles.modalCancelBtnText}>Annulla</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalSendBtn]}
                  onPress={handleSendEmail}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <ActivityIndicator size="small" color="#0F0F13" />
                  ) : (
                    <Text style={styles.modalSendBtnText}>Invia Email 🚀</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    paddingBottom: 120,
  },
  cardWrapper: {
    width: '100%',
  },
  heroCard: {
    backgroundColor: '#141824',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3047',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  brandBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  stockBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stockBadgeText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  pdfAvailableBadge: {
    backgroundColor: 'rgba(46, 213, 115, 0.15)',
    borderWidth: 1,
    borderColor: '#2ED573',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pdfAvailableBadgeText: {
    color: '#2ED573',
    fontSize: 11,
    fontWeight: '700',
  },
  carModelTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
    lineHeight: 28,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 14,
  },
  priceLabel: {
    color: '#94A3B8',
    fontSize: 14,
  },
  priceValue: {
    color: '#38BDF8',
    fontSize: 24,
    fontWeight: '800',
  },
  comparisonBox: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  comparisonHeader: {
    marginBottom: 10,
  },
  comparisonTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  comparisonItem: {
    alignItems: 'center',
  },
  comparisonLabel: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: 4,
  },
  comparisonValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  comparisonArrow: {
    paddingHorizontal: 4,
  },
  pdfCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  pdfCardSuccess: {
    backgroundColor: 'rgba(46, 213, 115, 0.08)',
    borderColor: '#2ED573',
  },
  pdfCardWarning: {
    backgroundColor: 'rgba(255, 193, 7, 0.08)',
    borderColor: '#FFC107',
  },
  pdfCardEmptyNota1: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: '#F59E0B',
  },
  pdfCardEmptyTitle: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  pdfCardEmptyMessage: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    marginBottom: 6,
  },
  pdfCardEmptyEnglish: {
    color: '#94A3B8',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  pdfCardHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  pdfCardIcon: {
    fontSize: 26,
  },
  pdfCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  pdfCardSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pdfActionBtn: {
    flex: 1,
    minWidth: 140,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPdfBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  viewPdfBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
  },
  emailPdfBtn: {
    backgroundColor: '#2ED573',
  },
  emailPdfBtnText: {
    color: '#0F0F13',
    fontSize: 14,
    fontWeight: '800',
  },
  uploadPdfBtn: {
    backgroundColor: '#38BDF8',
  },
  uploadPdfBtnText: {
    color: '#0F0F13',
    fontSize: 14,
    fontWeight: '800',
  },
  replacePdfBtn: {
    backgroundColor: '#334155',
    borderWidth: 1,
    borderColor: '#64748B',
  },
  replacePdfBtnText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  deletePdfBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deletePdfBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  specBox: {
    width: '48%',
    backgroundColor: '#141824',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2A3047',
  },
  specBoxLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  specBoxValue: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },
  specBoxValueHighlight: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '800',
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#141824',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  bottomBarInner: {
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  contrattoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  contrattoButtonIcon: {
    fontSize: 18,
  },
  contrattoButtonText: {
    color: '#0F0F13',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF4757',
    fontSize: 16,
    marginBottom: 16,
  },
  backButtonSimple: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonTextSimple: {
    color: '#38BDF8',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#141824',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A3047',
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#181C2B',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  attachmentBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#38BDF8',
    marginBottom: 16,
  },
  inputLabel: {
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
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 14,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
  },
  modalCancelBtnText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSendBtn: {
    backgroundColor: '#2ED573',
  },
  modalSendBtnText: {
    color: '#0F0F13',
    fontSize: 14,
    fontWeight: '800',
  },
});
