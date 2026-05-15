import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface ActivityItemProps {
  text: string;
  time: string;
  type?: 'default' | 'warning' | 'success';
}

export function ActivityItem({ text, time, type = 'default' }: ActivityItemProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const dotColor = type === 'warning' ? c.warning : type === 'success' ? c.positive : c.accent;

  return (
    <View style={[styles.row, { borderBottomColor: c.border }]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={[styles.text, { color: c.text1 }]} numberOfLines={2}>{text}</Text>
      <Text style={[styles.time, { color: c.text2 }]}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  text: { flex: 1, fontSize: 13, lineHeight: 18 },
  time: { fontSize: 11 },
});
