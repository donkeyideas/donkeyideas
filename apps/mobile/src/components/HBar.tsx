import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface HBarProps {
  label: string;
  value: number;
  total?: number;
  color?: string;
  suffix?: string;
}

export function HBar({ label, value, total = 100, color, suffix = '%' }: HBarProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: c.text2 }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: c.accentSoft, borderRadius: theme.radius > 4 ? 5 : 0 }]}>
        <View style={[styles.fill, {
          width: `${pct}%`,
          backgroundColor: color || c.chart1,
          borderRadius: theme.radius > 4 ? 5 : 0,
        }]} />
      </View>
      <Text style={[styles.val, { color: c.text1 }]}>{value}{suffix}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontSize: 11, width: 70, textAlign: 'right' },
  track: { flex: 1, height: 10, overflow: 'hidden' },
  fill: { height: '100%' },
  val: { fontSize: 11, fontWeight: '700', width: 36 },
});
