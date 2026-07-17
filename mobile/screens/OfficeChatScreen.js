import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Platform.OS === 'web'
  ? 'http://localhost:5000/api'
  : 'http://192.168.12.152:5000/api';

export default function OfficeChatScreen({ route }) {
  const { user, token } = route?.params || {};
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000); // Poll every 3 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchMessages = async () => {
    try {
      if (!token) {
        if (loading) setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/office/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
        if (loading) setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching office messages:', error);
      if (loading) setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (inputText.trim() === '') return;
    try {
      if (!token) return;

      const response = await fetch(`${API_URL}/office/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message_text: inputText })
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, data]);
        setInputText('');
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMe = user && item.name === user.name;
    const time = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
        {!isMe && (
          <Text style={styles.senderName}>{item.name} ({item.role})</Text>
        )}
        <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>{item.message_text}</Text>
        <Text style={styles.timestamp}>{time}</Text>
      </View>
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
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 90}
    >
      <View style={styles.topBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Image 
              source={require('../assets/images/logo.png')} 
              style={styles.logo} 
              resizeMode="contain" 
            />
            <Text style={styles.topBarSub}>Chat Ufficio</Text>
          </View>
        </View>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id.toString()}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Scrivi un messaggio..."
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Invia</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212'
  },
  topBar: {
    backgroundColor: '#1E1E1E',
    paddingTop: Platform.OS === 'ios' ? 45 : 15,
    paddingBottom: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#292929',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  topBarSub: {
    color: '#888',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 15,
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
    color: '#FFC107',
    fontSize: 15,
  },
  theirMessageText: {
    color: '#E0E0E0',
    fontSize: 15,
  },
  timestamp: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#161822',
    borderTopWidth: 1,
    borderTopColor: '#2A2D3A',
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 15,
    color: '#FFF',
  },
  sendButton: {
    backgroundColor: '#E53935',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});
