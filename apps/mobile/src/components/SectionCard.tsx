import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SectionCardProps {
  title: string;
  children: any;
  style?: object;
}

export function SectionCard({ title, children, style }: SectionCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, borderRadius: theme.radius }, style]}>
      <Text style={[styles.title, { color: c.text1 }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderWidth: 1, marginBottom: 16 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 14 },
});
