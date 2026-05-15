import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface MessageCardProps {
  name: string;
  email: string;
  message: string;
  date: string;
  read: boolean;
  onPress: () => void;
  onToggleRead: () => void;
  onDelete: () => void;
}

export function MessageCard({ name, message, date, read, onPress, onToggleRead, onDelete }: MessageCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <TouchableOpacity
      style={[styles.card, {
        backgroundColor: c.surface,
        borderColor: read ? c.border : c.accent,
        borderRadius: theme.radius,
        borderLeftWidth: read ? 1 : 3,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.name, { color: c.text1 }]} numberOfLines={1}>{name}</Text>
        {!read && <View style={[styles.dot, { backgroundColor: c.accent }]} />}
      </View>
      <Text style={[styles.preview, { color: c.text2 }]} numberOfLines={2}>{message}</Text>
      <View style={styles.footer}>
        <Text style={[styles.date, { color: c.text3 }]}>{date}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={onToggleRead} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.action, { color: c.accent }]}>{read ? 'Unread' : 'Read'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.action, { color: c.negative }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, marginBottom: 10, marginHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  name: { fontSize: 14, fontWeight: '700', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  preview: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 11 },
  actions: { flexDirection: 'row', gap: 14 },
  action: { fontSize: 12, fontWeight: '600' },
});
