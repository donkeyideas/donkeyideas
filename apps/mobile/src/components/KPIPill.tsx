import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface KPIPillProps {
  label: string;
  value: string;
}

export function KPIPill({ label, value }: KPIPillProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.pill, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius }]}>
      <Text style={[styles.label, { color: c.text2 }]}>{label}</Text>
      <Text style={[styles.value, { color: c.text1 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 1 },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  value: { fontSize: 17, fontWeight: '800' },
});
