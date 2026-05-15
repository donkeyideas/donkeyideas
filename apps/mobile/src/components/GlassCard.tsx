import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../theme/ThemeContext';

interface GlassCardProps {
  title?: string;
  children: React.ReactNode;
  style?: object;
  intensity?: number;
}

export function GlassCard({ title, children, style, intensity = 20 }: GlassCardProps) {
  const { theme, themeKey } = useTheme();
  const c = theme.colors;
  const isAurora = themeKey === 'aurora';

  const cardStyle = [
    styles.card,
    {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderRadius: theme.radius,
    },
    style,
  ];

  if (isAurora && Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} tint="dark" style={[cardStyle, { overflow: 'hidden' }]}>
        {title && <Text style={[styles.title, { color: c.text1 }]}>{title}</Text>}
        {children}
      </BlurView>
    );
  }

  return (
    <View style={cardStyle}>
      {title && <Text style={[styles.title, { color: c.text1 }]}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, marginBottom: 16 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 14 },
});
