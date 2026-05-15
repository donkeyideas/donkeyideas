import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface DonutChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  size?: number;
}

export function DonutChart({ data, size = 100 }: DonutChartProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const colors = [c.chart1, c.chart2, c.chart3, c.chart4];
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 36;
  const circumference = 2 * Math.PI * r;
  let offset = circumference * 0.25; // Start at top

  return (
    <View style={styles.wrap}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const el = (
            <Circle key={i} cx="50" cy="50" r={r} fill="none"
              stroke={d.color || colors[i % colors.length]} strokeWidth={14}
              strokeDasharray={`${dash} ${gap}`} strokeDashoffset={offset}
              strokeLinecap="round" opacity={0.85 - i * 0.1} />
          );
          offset -= dash;
          return el;
        })}
      </Svg>
      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendItem}>
            <View style={[styles.dot, {
              backgroundColor: d.color || colors[i % colors.length],
              borderRadius: theme.radius > 4 ? 5 : 2,
            }]} />
            <Text style={[styles.legendText, { color: c.text1 }]}>
              {d.label} {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 4 },
  legend: { gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10 },
  legendText: { fontSize: 12 },
});
