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
  ScrollView
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
  
  // Private chat states
  const [staffUsers, setStaffUsers] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    fetchChatSettings();
    fetchStaffUsers();
    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);
    return () => clearInterval(interval);
  }, [chatMode, selectedRecipient]);

  const fetchStaffUsers = async () => {
    try {
      if (!token) return;
      setLoadingStaff(true);
      const res = await fetch(`${API_URL}/office/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setStaffUsers(data);
        // Auto-select first staff member if none selected yet in private mode
        if (data.length > 0 && !selectedRecipient) {
          setSelectedRecipient(data[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching staff list:', e);
    } finally {
      setLoadingStaff(false);
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

  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    if (chatMode === 'private' && !selectedRecipient) {
      Alert.alert('Attenzione', 'Seleziona un membro dello staff per la chat privata');
      return;
    }

    try {
      if (!token) return;

      const bodyData = {
        message_text: inputText,
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
    const isMe = user && item.name === user.name;
    const isAdmin = user?.role === 'admin';
    const canDelete = isMe || isAdmin;

    const options = [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Rispondi', onPress: () => setReplyingTo(item) }
    ];

    if (canDelete) {
      options.push({ text: 'Elimina', style: 'destructive', onPress: () => deleteMessage(item.id) });
    }

    if (Platform.OS === 'web') {
      const action = window.prompt("Digita 'R' per rispondere o 'E' per eliminare:");
      if (action?.toUpperCase() === 'R') setReplyingTo(item);
      if (action?.toUpperCase() === 'E' && canDelete) deleteMessage(item.id);
    } else {
      Alert.alert('Opzioni', 'Cosa vuoi fare con questo messaggio?', options);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = user && (item.name === user.name || item.user_id === user.id);
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (item.deleted) {
      return (
        <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage, { opacity: 0.5 }]}>
          <Text style={[isMe ? styles.myMessageText : styles.theirMessageText, { fontStyle: 'italic', color: '#999' }]}>🚫 Questo messaggio è stato eliminato</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity 
        style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        {!isMe && (
          <Text style={styles.senderName}>{item.name} ({item.role})</Text>
        )}
        {item.reply_to_id && (
          <View style={styles.replyBubble}>
            <Text style={styles.replyName}>{item.reply_user_name}</Text>
            <Text style={styles.replyText} numberOfLines={1}>{item.reply_message_text}</Text>
          </View>
        )}
        <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>{item.message_text}</Text>
        <Text style={styles.timestamp}>{time}</Text>
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
              <Text style={styles.topBarSub}>
                {chatMode === 'group' ? 'Chat Ufficio' : `Privata con ${selectedRecipient ? selectedRecipient.name : '...'}`}
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

      {/* Group vs Private Tab Selector */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, chatMode === 'group' && styles.tabBtnActive]}
          onPress={() => {
            setChatMode('group');
            setReplyingTo(null);
          }}
        >
          <Text style={[styles.tabBtnText, chatMode === 'group' && styles.tabBtnTextActive]}>
            👥 Chat Gruppo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, chatMode === 'private' && styles.tabBtnActive]}
          onPress={() => {
            setChatMode('private');
            setReplyingTo(null);
            fetchStaffUsers();
          }}
        >
          <Text style={[styles.tabBtnText, chatMode === 'private' && styles.tabBtnTextActive]}>
            🔒 Chat Privata
          </Text>
        </TouchableOpacity>
      </View>

      {/* Staff Selection Horizontal List (Visible only in Private Chat Mode) */}
      {chatMode === 'private' && (
        <View style={styles.staffContainer}>
          <Text style={styles.staffHeaderLabel}>Seleziona un membro dello staff:</Text>
          {loadingStaff ? (
            <ActivityIndicator size="small" color="#FF5500" style={{ marginVertical: 6 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.staffScroll}>
              {staffUsers.map(u => {
                const isSelected = selectedRecipient?.id === u.id;
                const label = u.venditore_code ? `${u.name} (${u.venditore_code})` : `${u.name} (${u.role})`;
                return (
                  <TouchableOpacity
                    key={u.id.toString()}
                    style={[styles.staffPill, isSelected && styles.staffPillActive]}
                    onPress={() => setSelectedRecipient(u)}
                  >
                    <Text style={[styles.staffPillText, isSelected && styles.staffPillTextActive]}>
                      {isSelected ? '👤 ' : ''}{label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      )}

      {/* Keyboard-aware container — pushes input cleanly above keyboard */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Message List */}
        {chatMode === 'private' && !selectedRecipient ? (
          <View style={styles.emptyPrivateContainer}>
            <Text style={styles.emptyPrivateText}>👈 Seleziona un membro dello staff in alto per avviare la chat privata</Text>
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

        {/* Input Bar — stays above keyboard */}
        {(!chatEnabled && user?.role !== 'admin') ? (
          <View style={styles.disabledContainer}>
            <Text style={styles.disabledText}>🚫 La chat è disabilitata dall'amministratore</Text>
          </View>
        ) : (
          <View style={[styles.inputContainerWrapper, { paddingBottom: Math.max(insets.bottom + 16, Platform.OS === 'android' ? 48 : 28) }]}>
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
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={
                  chatMode === 'private'
                    ? selectedRecipient
                      ? `Messaggio privato a ${selectedRecipient.name}...`
                      : 'Seleziona uno staff per scrivere...'
                    : 'Scrivi un messaggio di gruppo...'
                }
                placeholderTextColor="#888"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxHeight={100}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Text style={styles.sendButtonText}>Invia</Text>
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
    borderWidth: 1,
    borderColor: '#2A2D3A',
  },
  tabBtnActive: {
    backgroundColor: '#FF5500',
    borderColor: '#FF5500',
  },
  tabBtnText: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: 'bold',
  },
  tabBtnTextActive: {
    color: '#FFF',
  },
  staffContainer: {
    backgroundColor: '#1B1E2B',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D3A',
  },
  staffHeaderLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 14,
    marginBottom: 6,
  },
  staffScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  staffPill: {
    backgroundColor: '#262938',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#383C50',
  },
  staffPillActive: {
    backgroundColor: '#FF5500',
    borderColor: '#FF5500',
  },
  staffPillText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '600',
  },
  staffPillTextActive: {
    color: '#FFF',
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
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,193,7,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.3)',
    borderBottomRightRadius: 4,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
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
    alignSelf: 'flex-end',
    marginTop: 4,
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
    borderLeftColor: '#FF5500',
    padding: 6,
    borderRadius: 4,
    marginBottom: 6,
  },
  replyName: {
    color: '#FF5500',
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
    borderLeftColor: '#FF5500',
  },
  replyNamePreview: {
    color: '#FF5500',
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
