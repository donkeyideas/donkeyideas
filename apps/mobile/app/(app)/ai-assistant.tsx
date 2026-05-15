import React, { useState, useRef } from 'react';
import { View, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Text } from 'react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { sendChatMessage, ChatMessage } from '../../src/api/ai-assistant';
import { ChatBubble } from '../../src/components/ChatBubble';
import { ChatInput } from '../../src/components/ChatInput';

export default function AIAssistantScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await sendChatMessage(text, messages);
      const assistantMsg: ChatMessage = { role: 'assistant', content: response };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please check that your API key is configured in Settings.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 && !loading && (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: c.text1 }]}>AI Financial Assistant</Text>
          <Text style={[styles.emptyText, { color: c.text2 }]}>
            Ask me anything about your finances, companies, projects, or business data.
          </Text>
        </View>
      )}

      {messages.length > 0 && (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_: ChatMessage, i: number) => String(i)}
          renderItem={({ item }: { item: ChatMessage }) => <ChatBubble role={item.role} content={item.content} />}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
      )}

      {loading && (
        <View style={styles.typing}>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={[styles.typingText, { color: c.text2 }]}>Thinking...</Text>
        </View>
      )}

      <ChatInput onSend={handleSend} disabled={loading} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { paddingTop: 16, paddingBottom: 8 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  typingText: { fontSize: 13 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
