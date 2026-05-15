import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [text, setText] = useState('');

  const handleSend = () => {
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.headerBg, borderTopColor: c.border }]}>
      <TextInput
        style={[styles.input, {
          backgroundColor: c.surface,
          borderColor: c.border,
          color: c.text1,
          borderRadius: theme.radius,
        }]}
        placeholder="Ask about your business..."
        placeholderTextColor={c.text2}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={2000}
        editable={!disabled}
      />
      <TouchableOpacity
        style={[styles.sendBtn, {
          backgroundColor: text.trim() && !disabled ? c.fabBg : c.surfaceAlt,
          borderRadius: theme.radius,
        }]}
        onPress={handleSend}
        disabled={!text.trim() || disabled}
      >
        <Text style={[styles.sendText, {
          color: text.trim() && !disabled ? c.fabText : c.text2,
        }]}>Send</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, fontSize: 15 },
  sendBtn: { height: 44, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center' },
  sendText: { fontSize: 14, fontWeight: '700' },
});
