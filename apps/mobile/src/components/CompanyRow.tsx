import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { LogoAvatar } from './LogoAvatar';

interface CompanyRowProps {
  rank: number;
  name: string;
  logo?: string | null;
  fallbackColor?: string;
  primaryStat: string;
  secondaryStat?: string;
  secondaryColor?: string;
  barPercent: number;
  barColor: string;
  statsLine?: string;
  statsBold?: string;
}

export function CompanyRow({ rank, name, logo, fallbackColor, primaryStat, secondaryStat, secondaryColor, barPercent, barColor, statsLine, statsBold }: CompanyRowProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const rankStr = String(rank).padStart(2, '0');
  return (
    <View style={[styles.row, { backgroundColor: c.surface, shadowColor: c.ink }]}>
      <Text style={[styles.rank, { color: c.muted, fontFamily: theme.fontHead }]}>{rankStr}</Text>
      <LogoAvatar uri={logo} fallbackLetter={name} fallbackColor={fallbackColor || barColor} size={32} borderRadius={8} />
      <View style={styles.info}>
        <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{name}</Text>
        <View style={[styles.bar, { backgroundColor: c.bgAlt }]}>
          <View style={[styles.barFill, { width: `${Math.max(2, Math.min(100, barPercent))}%`, backgroundColor: barColor }]} />
        </View>
        {(statsLine || statsBold) && (
          <Text style={[styles.stats, { color: c.muted }]} numberOfLines={1}>
            {statsLine}
            {statsBold && <Text style={{ color: c.inkSoft, fontWeight: '500' }}>{statsBold}</Text>}
          </Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={[styles.primary, { color: c.ink, fontFamily: theme.fontHead }]}>{primaryStat}</Text>
        {secondaryStat && (
          <Text style={[styles.secondary, { color: secondaryColor || c.muted }]}>{secondaryStat}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 8,
    gap: 10,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rank: { width: 18, fontSize: 16, fontStyle: 'italic' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  bar: { height: 4, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 2 },
  stats: { fontSize: 10, marginTop: 4 },
  right: { alignItems: 'flex-end', minWidth: 56 },
  primary: { fontSize: 20, lineHeight: 22, letterSpacing: -0.4 },
  secondary: { fontSize: 9, marginTop: 3, letterSpacing: 0.4 },
});
