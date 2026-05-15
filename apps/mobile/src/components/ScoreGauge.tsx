import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface ScoreGaugeProps {
  score: number;
  label: string;
  size?: number;
  color?: string;
}

export function ScoreGauge({ score, label, size = 80, color }: ScoreGaugeProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const gaugeColor = color || (score >= 80 ? c.positive : score >= 50 ? c.warning : c.negative);
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (score / 100) * circumference;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={c.border} strokeWidth={6}
          />
          <Circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={gaugeColor} strokeWidth={6}
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={[styles.scoreOverlay, { width: size, height: size }]}>
          <Text style={[styles.scoreText, { color: gaugeColor }]}>{Math.round(score)}</Text>
        </View>
      </View>
      <Text style={[styles.label, { color: c.text2 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  scoreOverlay: { position: 'absolute', top: 0, left: 0, justifyContent: 'center', alignItems: 'center' },
  scoreText: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 11, fontWeight: '600', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
});
