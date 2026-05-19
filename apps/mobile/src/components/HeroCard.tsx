import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface HeroCardProps {
  label: string;        // small uppercase label
  value: string;        // big serif number
  delta?: string;       // green pill, e.g. "+18%"
  deltaColor?: string;  // override delta bg
  subline?: React.ReactNode; // italic serif subline below value
  children?: React.ReactNode; // sparkline or chart slot
}

export function HeroCard({ label, value, delta, deltaColor, subline, children }: HeroCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.card, { backgroundColor: c.surface, shadowColor: c.ink }]}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <View style={styles.row}>
        <Text style={[styles.value, { color: c.ink, fontFamily: theme.fontHead }]}>{value}</Text>
        {delta && (
          <View style={[styles.deltaPill, { backgroundColor: deltaColor || c.sage }]}>
            <Text style={styles.deltaText}>{delta}</Text>
          </View>
        )}
      </View>
      {subline && (
        <Text style={[styles.subline, { color: c.inkSoft, fontFamily: theme.fontHead }]}>{subline}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  label: { fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: '500' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  value: { fontSize: 52, lineHeight: 52, letterSpacing: -1 },
  deltaPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginBottom: 6 },
  deltaText: { color: '#fff', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  subline: { fontSize: 15, fontStyle: 'italic', marginTop: 4 },
});
