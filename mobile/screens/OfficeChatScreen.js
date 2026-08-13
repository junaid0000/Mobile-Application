import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  Switch,
  ScrollView,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BASE_URL } from '../config/apiConfig';

const API_URL = `${BASE_URL}/api`;

export default function OfficeChatScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, token } = route?.params || {};

  const [chatMode, setChatMode] = useState('group'); // 'group' | 'private'
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null); // Message object being edited
  
  // Private chat & notification states
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState({}); // { [sender_id]: count }
  const [totalUnreadPrivate, setTotalUnreadPrivate] = useState(0);
  const [pickerVisible, setPickerVisible] = useState(false);

  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    fetchChatSettings();
    fetchStaffUsers();
    fetchUnreadCounts();
    const interval = setInterval(() => {
      fetchMessages();
      fetchUnreadCounts();
    }, 4000);
    return () => clearInterval(interval);
  }, [chatMode, selectedRecipient]);

  const fetchStaffUsers = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API_URL}/office/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setStaffUsers(data);
        if (data.length > 0 && !selectedRecipient) {
          setSelectedRecipient(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching staff list:', e);
    }
  };

  const fetchUnreadCounts = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API_URL}/office/unread-private`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const counts = {};
        let total = 0;
        data.forEach(item => {
          counts[item.sender_id] = parseInt(item.count, 10);
          total += parseInt(item.count, 10);
        });
        setUnreadCounts(counts);
        setTotalUnreadPrivate(total);
      }
    } catch (e) {
      console.error('Error fetching unread counts:', e);
    }
  };

  const fetchChatSettings = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API_URL}/settings/chat`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setChatEnabled(data.chat_enabled);
    } catch (e) {
      console.error('Error fetching chat settings:', e);
    }
  };

  const toggleChatSettings = async (value) => {
    try {
      setChatEnabled(value);
      await fetch(`${API_URL}/admin/settings/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chat_enabled: value })
      });
    } catch (e) {
      console.error('Error updating chat settings:', e);
    }
  };

  const fetchMessages = async () => {
    try {
      if (!token) {
        if (loading) setLoading(false);
        return;
      }

      let url = `${API_URL}/office/messages`;
      if (chatMode === 'private' && selectedRecipient?.id) {
        url += `?recipient_id=${selectedRecipient.id}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(Array.isArray(data) ? data : []);
        if (loading) setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching office messages:', error);
      if (loading) setLoading(false);
    }
  };

  const handleSendOrEdit = async () => {
    if (inputText.trim() === '') return;

    if (editingMessage) {
      // WhatsApp style message editing
      try {
        const response = await fetch(`${API_URL}/office/messages/${editingMessage.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message_text: inputText.trim() })
        });
        const data = await response.json();
        if (response.ok) {
          setMessages(prev => prev.map(m => m.id === editingMessage.id ? data : m));
          setInputText('');
          setEditingMessage(null);
        } else {
          Alert.alert('Errore', data.error || 'Impossibile modificare il messaggio');
        }
      } catch (e) {
        console.error('Error editing message:', e);
      }
      return;
    }

    // Normal message sending
    if (chatMode === 'private' && !selectedRecipient) {
      Alert.alert('Attenzione', 'Seleziona un membro dello staff per la chat privata');
      return;
    }

    try {
      if (!token) return;

      const bodyData = {
        message_text: inputText.trim(),
        reply_to_id: replyingTo?.id,
        recipient_id: chatMode === 'private' ? selectedRecipient?.id : null
      };

      const response = await fetch(`${API_URL}/office/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, data]);
        setInputText('');
        setReplyingTo(null);
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Errore', data.error || 'Impossibile inviare il messaggio');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const deleteMessage = async (msgId) => {
    try {
      const response = await fetch(`${API_URL}/office/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, deleted: true } : m));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleLongPress = (item) => {
    const isMe = user && (item.name === user.name || item.user_id === user.id);
    const isAdmin = user?.role === 'admin';

    const options = [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rispondi', onPress: () => { setEditingMessage(null); setReplyingTo(item); } }
    ];

    if (isMe) {
      options.push({
        text: '✏️ Modifica',
        onPress: () => {
          setReplyingTo(null);
          setEditingMessage(item);
          setInputText(item.message_text);
        }
      });
    }

    if (isMe || isAdmin) {
      options.push({ text: '🗑️ Elimina', style: 'destructive', onPress: () => deleteMessage(item.id) });
    }

    if (Platform.OS === 'web') {
      let promptText = "Opzioni:\n'R' = Rispondi";
      if (isMe) promptText += "\n'M' = Modifica";
      if (isMe || isAdmin) promptText += "\n'E' = Elimina";
      
      const action = window.prompt(promptText);
      if (action?.toUpperCase() === 'R') { setEditingMessage(null); setReplyingTo(item); }
      if (action?.toUpperCase() === 'M' && isMe) {
        setReplyingTo(null);
        setEditingMessage(item);
        setInputText(item.message_text);
      }
      if (action?.toUpperCase() === 'E' && (isMe || isAdmin)) deleteMessage(item.id);
    } else {
      Alert.alert('Opzioni messaggio', 'Cosa vuoi fare?', options);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = user && (item.name === user.name || item.user_id === user.id);
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isEdited = !!item.edited_at;
    const isPrivate = chatMode === 'private' || !!item.recipient_id;

    if (item.deleted) {
      return (
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage, { opacity: 0.5 }]}>
          <Text style={[isMe ? styles.myMessageText : styles.theirMessageText, { fontStyle: 'italic', color: '#999' }]}>🚫 Questo messaggio è stato eliminato</Text>
        </View>
      );
    }

    // Dynamic style based on Group vs Private Chat
    const bubbleStyle = isMe
      ? (isPrivate ? styles.myPrivateMessage : styles.myGroupMessage)
      : (isPrivate ? styles.theirPrivateMessage : styles.theirGroupMessage);

    return (
      <TouchableOpacity 
        style={[styles.messageBubble, bubbleStyle]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        {!isMe && (
          <Text style={styles.senderName}>{item.name} ({item.role})</Text>
        )}
        {item.reply_to_id && (
          <View style={[styles.replyBubble, isPrivate && { borderLeftColor: '#2ED573' }]}>
            <Text style={[styles.replyName, isPrivate && { color: '#2ED573' }]}>{item.reply_user_name}</Text>
            <Text style={styles.replyText} numberOfLines={1}>{item.reply_message_text}</Text>
          </View>
        )}
        <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>{item.message_text}</Text>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginTop: 4, gap: 4 }}>
          {isEdited && (
            <Text style={{ fontSize: 10, color: '#aaa', fontStyle: 'italic' }}>(Modificato)</Text>
          )}
          <Text style={styles.timestamp}>{time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E60000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation?.canGoBack() && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Text style={styles.backBtnText}>◀</Text>
            </TouchableOpacity>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image
              source={require('../assets/images/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <View>
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold' }}>Rossomandi</Text>
              <Text style={[styles.topBarSub, chatMode === 'private' && { color: '#2ED573' }]}>
                {chatMode === 'group' ? 'Chat Ufficio (Gruppo)' : `Chat Privata con ${selectedRecipient ? selectedRecipient.name : '...'}`}
              </Text>
            </View>
          </View>
        </View>

        {user?.role === 'admin' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#aaa', fontSize: 12 }}>{chatEnabled ? 'ON' : 'OFF'}</Text>
            <Switch
              value={chatEnabled}
              onValueChange={toggleChatSettings}
              trackColor={{ false: '#333', true: '#2ED573' }}
              thumbColor="#FFF"
            />
          </View>
        )}
      </View>

      {/* Group vs Private Tab Selector with Notification Badge */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, chatMode === 'group' && styles.tabBtnActive]}
          onPress={() => {
            setChatMode('group');
            setReplyingTo(null);
            setEditingMessage(null);
          }}
        >
          <Text style={[styles.tabBtnText, chatMode === 'group' && styles.tabBtnTextActive]}>
            👥 Chat Gruppo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, chatMode === 'private' && styles.tabBtnPrivateActive]}
          onPress={() => {
            setChatMode('private');
            setReplyingTo(null);
            setEditingMessage(null);
            fetchStaffUsers();
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.tabBtnText, chatMode === 'private' && styles.tabBtnTextActive]}>
              🔒 Chat Privata
            </Text>
            {totalUnreadPrivate > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{totalUnreadPrivate}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Staff Selection Dropdown (Visible in Private Chat Mode) */}
      {chatMode === 'private' && (
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Chat Privata Con:</Text>
          <TouchableOpacity
            style={styles.dropdownSelector}
            onPress={() => setPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dropdownSelectorText}>
              👤 {selectedRecipient ? `${selectedRecipient.name} (${selectedRecipient.venditore_code || selectedRecipient.role})` : 'Seleziona un collega...'}
            </Text>
            <Text style={{ color: '#2ED573', fontSize: 14 }}>▼</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Staff Selection Modal / Dropdown Picker */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleziona Collega per Chat Privata</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {staffUsers.map(u => {
                const isSelected = selectedRecipient?.id === u.id;
                const unreadCount = unreadCounts[u.id] || 0;
                const label = u.venditore_code ? `${u.name} (${u.venditore_code})` : `${u.name} (${u.role})`;
                
                return (
                  <TouchableOpacity
                    key={u.id.toString()}
                    style={[styles.modalItem, isSelected && styles.modalItemActive]}
                    onPress={() => {
                      setSelectedRecipient(u);
                      setPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextActive]}>
                      👤 {label}
                    </Text>
                    {unreadCount > 0 && (
                      <View style={styles.badgeContainer}>
                        <Text style={styles.badgeText}>{unreadCount} nuovi</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Keyboard-aware container */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Message List */}
        {chatMode === 'private' && !selectedRecipient ? (
          <View style={styles.emptyPrivateContainer}>
            <Text style={styles.emptyPrivateText}>👈 Seleziona un collega dal menu a tendina in alto per iniziare la chat privata</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id.toString()}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContainer}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input Bar — stays elevated above keyboard */}
        {(!chatEnabled && user?.role !== 'admin') ? (
          <View style={styles.disabledContainer}>
            <Text style={styles.disabledText}>🚫 La chat è disabilitata dall'amministratore</Text>
          </View>
        ) : (
          <View style={[styles.inputContainerWrapper, { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === 'android' ? 48 : 28) }]}>
            {/* Reply Preview */}
            {replyingTo && (
              <View style={styles.replyPreview}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.replyNamePreview}>Rispondi a {replyingTo.name}</Text>
                  <Text style={styles.replyTextPreview} numberOfLines={1}>{replyingTo.message_text}</Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Text style={{ color: '#fff', fontSize: 18, padding: 5 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* WhatsApp Style Edit Preview */}
            {editingMessage && (
              <View style={[styles.replyPreview, { borderLeftColor: '#FFC107' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.replyNamePreview, { color: '#FFC107' }]}>✏️ Modifica messaggio</Text>
                  <Text style={styles.replyTextPreview} numberOfLines={1}>{editingMessage.message_text}</Text>
                </View>
                <TouchableOpacity onPress={() => { setEditingMessage(null); setInputText(''); }}>
                  <Text style={{ color: '#fff', fontSize: 18, padding: 5 }}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={
                  editingMessage
                    ? 'Modifica il tuo messaggio...'
                    : chatMode === 'private'
                      ? selectedRecipient
                        ? `Messaggio privato a ${selectedRecipient.name}...`
                        : 'Seleziona un collega per scrivere...'
                      : 'Scrivi un messaggio di gruppo...'
                }
                placeholderTextColor="#888"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxHeight={100}
                returnKeyType="send"
                onSubmitEditing={handleSendOrEdit}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendButton, chatMode === 'private' && { backgroundColor: '#2ED573' }]}
                onPress={handleSendOrEdit}
              >
                <Text style={styles.sendButtonText}>{editingMessage ? 'Salva' : 'Invia'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  keyboardView: {
    flex: 1,
  },
  topBar: {
    backgroundColor: '#161822',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  backBtn: {
    marginRight: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#E53935',
    overflow: 'hidden',
  },
  topBarSub: {
    color: '#FF8C00',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161822',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#202330',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2D3A',
  },
  tabBtnActive: {
    backgroundColor: '#FF5500',
    borderColor: '#FF5500',
  },
  tabBtnPrivateActive: {
    backgroundColor: '#2ED573',
    borderColor: '#2ED573',
  },
  tabBtnText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  badgeContainer: {
    backgroundColor: '#E60000',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dropdownContainer: {
    backgroundColor: '#1B1E2B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownSelector: {
    backgroundColor: '#262938',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2ED573',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownSelectorText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E202C',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#2ED573',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#262938',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemActive: {
    backgroundColor: 'rgba(46, 213, 115, 0.25)',
    borderWidth: 1,
    borderColor: '#2ED573',
  },
  modalItemText: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: '600',
  },
  modalItemTextActive: {
    color: '#2ED573',
    fontWeight: 'bold',
  },
  emptyPrivateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyPrivateText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  listContainer: {
    padding: 15,
    paddingBottom: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 15,
    marginBottom: 10,
  },
  // Group Chat Colors (Gold/Amber)
  myGroupMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,193,7,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.35)',
    borderBottomRightRadius: 4,
  },
  theirGroupMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderBottomLeftRadius: 4,
  },
  // Private Chat Colors (Emerald Green)
  myPrivateMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(46, 213, 115, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.45)',
    borderBottomRightRadius: 4,
  },
  theirPrivateMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#14221A',
    borderWidth: 1,
    borderColor: 'rgba(46, 213, 115, 0.35)',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
    fontWeight: 'bold',
  },
  myMessageText: {
    color: '#FFF',
    fontSize: 15,
  },
  theirMessageText: {
    color: '#E0E0E0',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  inputContainerWrapper: {
    backgroundColor: '#1E202C',
    borderTopWidth: 1,
    borderTopColor: '#2A2D3A',
    paddingBottom: Platform.OS === 'ios' ? 24 : 28,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#2A2D3A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#FFF',
    fontSize: 15,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#FF5500',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  replyBubble: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C00',
    padding: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyName: {
    color: '#FF8C00',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyText: {
    color: '#bbb',
    fontSize: 13,
  },
  replyPreview: {
    flexDirection: 'row',
    backgroundColor: '#2A2D3A',
    padding: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    marginHorizontal: 12,
    marginTop: 10,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C00',
  },
  replyNamePreview: {
    color: '#FF8C00',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  replyTextPreview: {
    color: '#ddd',
    fontSize: 13,
  },
  disabledContainer: {
    padding: 20,
    backgroundColor: '#1E202C',
    borderTopWidth: 1,
    borderTopColor: '#2A2D3A',
    alignItems: 'center',
  },
  disabledText: {
    color: '#FF5500',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
