import React from 'react';
import { View } from 'react-native';
import Svg, { Polyline, Polygon, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface AreaChartProps {
  data: number[];
  height?: number;
  color?: string;
}

export function AreaChart({ data, height = 90, color }: AreaChartProps) {
  const { theme } = useTheme();
  const c = color || theme.colors.chart1;
  if (data.length === 0) return null;

  const w = 340;
  const pad = 4;
  const maxVal = Math.max(...data);
  const minVal = Math.min(...data);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - pad * 2) + pad;
    const y = height - 10 - ((v - minVal) / range) * (height - 30);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${pad},${height - 10} ${points} ${w - pad},${height - 10}`;
  const pointsArr = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (w - pad * 2) + pad,
    y: height - 10 - ((v - minVal) / range) * (height - 30),
  }));

  return (
    <View style={{ height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={c} stopOpacity={0.2} />
            <Stop offset="100%" stopColor={c} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Polygon points={areaPoints} fill="url(#areaGrad)" />
        <Polyline points={points} fill="none" stroke={c} strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />
        {pointsArr.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={c} />
        ))}
      </Svg>
    </View>
  );
}
