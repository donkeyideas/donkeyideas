import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBubble({ role, content }: ChatBubbleProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const isUser = role === 'user';

  return (
    <View style={[styles.container, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
      <View style={[styles.bubble, {
        backgroundColor: isUser ? c.accent : c.surface,
        borderRadius: theme.radius,
        borderBottomRightRadius: isUser ? 4 : theme.radius,
        borderBottomLeftRadius: isUser ? theme.radius : 4,
        borderWidth: isUser ? 0 : 1,
        borderColor: c.border,
      }]}>
        <Text style={[styles.text, { color: isUser ? '#ffffff' : c.text1 }]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12, paddingHorizontal: 12 },
  bubble: { padding: 14, maxWidth: '85%' },
  text: { fontSize: 14, lineHeight: 20 },
});
