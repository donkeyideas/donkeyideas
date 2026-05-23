import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface StatTileProps {
  label: string;
  value: string;
  trend?: string;       // e.g. "+12% vs last 30d"
  trendWarn?: boolean;  // red instead of green
}

export function StatTile({ label, value, trend, trendWarn }: StatTileProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.tile, { backgroundColor: c.surface, shadowColor: c.ink }]}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: c.ink, fontFamily: theme.fontHead }]}>{value}</Text>
      {trend && (
        <Text style={[styles.trend, { color: trendWarn ? c.terracotta : c.sage }]}>{trend}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  label: { fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', fontWeight: '500' },
  value: { fontSize: 30, lineHeight: 45, letterSpacing: -0.5, marginTop: 4 },
  trend: { fontSize: 10, fontWeight: '500', marginTop: 4 },
});
