import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  secondaryData?: Array<{ label: string; value: number }>;
  secondaryColor?: string;
}

export function BarChart({ data, height = 110, color, secondaryData, secondaryColor }: BarChartProps) {
  const { theme } = useTheme();
  const barColor = color || theme.colors.chart1;
  const barColor2 = secondaryColor || theme.colors.chart2;
  const maxVal = Math.max(...data.map(d => d.value), ...(secondaryData?.map(d => d.value) || [0]));
  const hasSecondary = !!secondaryData;
  const barWidth = hasSecondary ? 22 : 34;
  const gap = hasSecondary ? 57 : 46;
  const offset = hasSecondary ? 8 : 14;
  const chartH = height - 20;

  return (
    <View style={{ height }}>
      <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`}>
        {data.map((d, i) => {
          const h = maxVal > 0 ? (d.value / maxVal) * (chartH - 10) : 0;
          const x = i * gap + offset;
          const y = chartH - h;
          return (
            <React.Fragment key={i}>
              <Rect x={x} y={y} width={barWidth} height={h} rx={Math.min(5, theme.radius)}
                fill={barColor} opacity={0.55 + i * 0.06} />
              {hasSecondary && secondaryData![i] && (
                <Rect x={x + barWidth + 2} y={chartH - (secondaryData![i].value / maxVal) * (chartH - 10)}
                  width={barWidth} height={(secondaryData![i].value / maxVal) * (chartH - 10)}
                  rx={Math.min(5, theme.radius)} fill={barColor2} opacity={0.5} />
              )}
              <SvgText x={hasSecondary ? x + barWidth + 1 : x + barWidth / 2}
                y={height - 2} textAnchor="middle" fill={theme.colors.text2} fontSize={9}>
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
