import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// ─── Smart keyword-based auto-response engine ────────────────────────────────
const RESPONSES = [
  {
    keywords: ['orario', 'aperto', 'apertura', 'quando', 'orari', 'ora'],
    answer:
      '🕐 Siamo aperti dal Lunedì al Sabato, dalle 9:00 alle 18:30. La domenica siamo chiusi.\n\nRicordiamo che riceviamo i clienti **esclusivamente su appuntamento** — chiamaci per prenotare! 📞',
  },
  {
    keywords: ['telefono', 'chiama', 'numero', 'contatto', 'contact', 'call'],
    answer:
      '📞 Puoi contattarci al:\n\n**0574 402611**\n\nSiamo disponibili durante gli orari di apertura (Lun–Sab, 9:00–18:30). Saremo felici di rispondere a ogni tua domanda!',
  },
  {
    keywords: ['indirizzo', 'dove', 'sede', 'trovate', 'mappa', 'come arrivare', 'location'],
    answer:
      '📍 Ci trovi a:\n\n**Viale Guglielmo Marconi 38/1**\n**Prato (PO), Italia**\n\nSiamo facilmente raggiungibili dal centro. Ti aspettiamo!',
  },
  {
    keywords: ['garanzia', 'warranty', 'garantito', 'copertura', 'mesi garanzia'],
    answer:
      '🛡️ Tutti i nostri veicoli includono **Garanzia Legale di 12 Mesi**.\n\nLa garanzia copre i principali componenti meccanici ed elettrici. Per dettagli specifici su un veicolo, contattaci direttamente.',
  },
  {
    keywords: ['prezzo', 'costo', 'quanto', 'costa', 'price', 'pagare', 'euro'],
    answer:
      '💰 I prezzi variano in base al modello, anno e chilometraggio di ogni veicolo.\n\nVisita il nostro sito per vedere il listino aggiornato, oppure contattaci per un preventivo personalizzato.\n\n📞 **0574 402611**',
  },
  {
    keywords: ['finanziamento', 'rata', 'mutuo', 'leasing', 'finanzio', 'pagamento rateale'],
    answer:
      '💳 Offriamo **finanziamenti personalizzati** su tutti i veicoli in stock!\n\nLe rate sono studiate in base alle tue esigenze. Contattaci per simulare il piano di pagamento più adatto a te:\n\n📞 **0574 402611**',
  },
  {
    keywords: ['neopatentati', 'patente', 'novice', 'neo', 'guidatori', 'principiante'],
    answer:
      '🚗 Sì! Abbiamo una selezione speciale di **auto idonee per neopatentati** in stock.\n\nPuoi filtrare questa categoria direttamente dal nostro sito o chiedere al nostro team per i modelli disponibili.',
  },
  {
    keywords: ['usato', 'km', 'chilometri', 'usati', 'auto usata', 'seconda mano', 'mileage'],
    answer:
      '🔍 Siamo specializzati nella **vendita di auto usate multimarca** selezionate e garantite.\n\nOgni veicolo viene accuratamente ispezionato prima di essere messo in vendita. Tutto il catalogo è disponibile aggiornato in tempo reale sul nostro sito!',
  },
  {
    keywords: ['appuntamento', 'visita', 'venire', 'passare', 'visit', 'quando posso'],
    answer:
      '📅 Riceviamo i clienti **esclusivamente su appuntamento** telefonico.\n\nChiamaci al **0574 402611** (Lun–Sab, 9:00–18:30) e ti prenotiamo il prima possibile. Ci vediamo presto! 😊',
  },
  {
    keywords: ['permuta', 'ritiro', 'cambiare', 'scambiare', 'mia auto', 'valutazione'],
    answer:
      '🔄 Sì! Offriamo il servizio di **valutazione e ritiro usato**.\n\nPorta la tua auto e la valutiamo gratuitamente. Puoi usarla come anticipo per l\'acquisto di un altro veicolo del nostro stock.',
  },
  {
    keywords: ['email', 'mail', 'scrivere', 'scrivimi', 'write'],
    answer:
      '📧 Puoi scriverci a:\n\n**lorenzo@rossomandi.it**\n\nTi risponderemo il prima possibile durante gli orari lavorativi.',
  },
  {
    keywords: ['ciao', 'salve', 'hello', 'hi', 'buongiorno', 'buonasera', 'hey'],
    answer:
      '👋 Ciao! Benvenuto nell\'assistente virtuale di **Rossomandi Auto**!\n\nSono qui per rispondere alle tue domande su:\n• 🚗 Veicoli disponibili\n• 💰 Prezzi e finanziamenti\n• 📅 Appuntamenti\n• 📍 Sede e contatti\n\nCome posso aiutarti?',
  },
  {
    keywords: ['grazie', 'thanks', 'thank you', 'perfetto', 'ok', 'bene', 'capito'],
    answer:
      '😊 Prego! Sono qui se hai altre domande.\n\nNon esitare a contattarci anche direttamente al **0574 402611**. A presto!',
  },
];

const DEFAULT_RESPONSE =
  '🤖 Grazie per la tua domanda! Per una risposta precisa, ti consiglio di:\n\n• 📞 Chiamarci al **0574 402611**\n• 📧 Scriverci a **lorenzo@rossomandi.it**\n• 🌐 Visitare il nostro sito\n\nSiamo disponibili Lun–Sab dalle 9:00 alle 18:30. Ti aiuteremo subito!';

function getAutoResponse(message) {
  const lower = message.toLowerCase();
  for (const rule of RESPONSES) {
    if (rule.keywords.some((kw) => lower.includes(kw))) {
      return rule.answer;
    }
  }
  return DEFAULT_RESPONSE;
}

// ─── Chat Bubble component ─────────────────────────────────────────────────
function ChatBubble({ msg }) {
  const isUser = msg.sender === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextBot]}>
          {msg.text}
        </Text>
        <Text style={[styles.bubbleTime, isUser ? styles.bubbleTimeUser : styles.bubbleTimeBot]}>
          {msg.time}
        </Text>
      </View>
      {isUser && (
        <View style={[styles.avatar, styles.avatarUser]}>
          <Text style={styles.avatarText}>👤</Text>
        </View>
      )}
    </View>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>R</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
        <ActivityIndicator size="small" color="#E53935" />
        <Text style={styles.typingText}>sta scrivendo...</Text>
      </View>
    </View>
  );
}

// ─── Main ChatbotScreen ────────────────────────────────────────────────────
export default function ChatbotScreen() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: '👋 Ciao! Sono l\'assistente virtuale di Rossomandi Auto.\n\nPosso aiutarti con informazioni su:\n• Veicoli disponibili\n• Prezzi e finanziamenti\n• Appuntamenti\n• Sede e contatti\n\nCome posso aiutarti oggi?',
      time: formatTime(new Date()),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text,
      time: formatTime(new Date()),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const botReply = {
        id: Date.now() + 1,
        sender: 'bot',
        text: getAutoResponse(text),
        time: formatTime(new Date()),
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botReply]);
    }, 1000 + Math.random() * 500);
  };

  // Quick-reply chips
  const QUICK_REPLIES = ['Orari', 'Contatti', 'Garanzia', 'Appuntamento', 'Finanziamento'];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>R</Text>
          <View style={styles.onlineDot} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Assistente Rossomandi</Text>
          <Text style={styles.headerStatus}>🟢 Online — rispondo subito</Text>
        </View>
      </View>

      {/* Quick replies chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRepliesContainer}
        style={styles.quickRepliesBar}
      >
        {QUICK_REPLIES.map((qr) => (
          <TouchableOpacity
            key={qr}
            style={styles.chip}
            onPress={() => {
              setInputText(qr);
            }}
          >
            <Text style={styles.chipText}>{qr}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chat Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}
        {isTyping && <TypingIndicator />}
      </ScrollView>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Scrivi un messaggio..."
          placeholderTextColor="#555"
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
          activeOpacity={0.7}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F13',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: '#13131A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E26',
    gap: 14,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#13131A',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  headerStatus: {
    color: '#888',
    fontSize: 12,
  },

  // Quick replies
  quickRepliesBar: {
    backgroundColor: '#0F0F13',
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E26',
  },
  quickRepliesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    backgroundColor: '#1A1A20',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.25)',
  },
  chipText: {
    color: '#E53935',
    fontSize: 13,
    fontWeight: '600',
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginBottom: 10,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowBot: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarUser: {
    backgroundColor: '#1E1E26',
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  avatarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bubble: {
    maxWidth: width * 0.72,
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleUser: {
    backgroundColor: '#E53935',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#1A1A20',
    borderWidth: 1,
    borderColor: '#2A2A35',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTextUser: {
    color: '#FFF',
  },
  bubbleTextBot: {
    color: '#E0E0E0',
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 6,
  },
  bubbleTimeUser: {
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'right',
  },
  bubbleTimeBot: {
    color: '#555',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  typingText: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    backgroundColor: '#13131A',
    borderTopWidth: 1,
    borderTopColor: '#1E1E26',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A20',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#FFF',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2A2A35',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: '#2A2A35',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
