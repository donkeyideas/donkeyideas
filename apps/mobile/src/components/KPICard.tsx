import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface KPICardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  color?: string;
}

export function KPICard({ label, value, change, changeType = 'neutral', color }: KPICardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const barColor = color || c.accent;

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius }]}>
      <View style={[styles.topBar, { backgroundColor: barColor }]} />
      <Text style={[styles.label, { color: c.text2 }]}>{label}</Text>
      <Text style={[styles.value, { color: c.text1 }]}>{value}</Text>
      {change ? (
        <Text style={[styles.change, {
          color: changeType === 'positive' ? c.positive : changeType === 'negative' ? c.negative : c.text2
        }]}>{change}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    padding: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  value: { fontSize: 22, fontWeight: '800' },
  change: { fontSize: 11, fontWeight: '600', marginTop: 4 },
});
