import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface SectionTitleProps {
  title: string;           // plain text portion
  emphasis?: string;       // italic terracotta portion (appended)
  trailing?: string;       // small grey text on the right
}

export function SectionTitle({ title, emphasis, trailing }: SectionTitleProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: c.ink, fontFamily: theme.fontHead }]}>
        {title}
        {emphasis && <Text style={{ fontStyle: 'italic', color: c.terracotta }}> {emphasis}</Text>}
      </Text>
      {trailing && <Text style={[styles.trailing, { color: c.muted }]}>{trailing}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  title: { fontSize: 22, lineHeight: 24, letterSpacing: -0.3 },
  trailing: { fontSize: 11, letterSpacing: 0.5 },
});
