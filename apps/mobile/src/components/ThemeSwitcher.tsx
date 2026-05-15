import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

const themeOptions: Array<{ key: 'minimal' | 'glass' | 'bloomberg' | 'aurora'; label: string }> = [
  { key: 'aurora', label: 'Aurora' },
  { key: 'glass', label: 'Normal' },
  { key: 'minimal', label: 'Light' },
  { key: 'bloomberg', label: 'Dark' },
];

export function ThemeSwitcher() {
  const { theme, themeKey, setThemeKey } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.container, { borderBottomColor: c.border }]}>
      <Text style={[styles.label, { color: c.text2 }]}>APPEARANCE</Text>
      <View style={styles.row}>
        {themeOptions.map((opt) => {
          const isActive = themeKey === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.btn, {
                backgroundColor: isActive ? c.accentSoft : c.surfaceAlt,
                borderColor: isActive ? c.accent : c.border,
                borderRadius: theme.radius,
              }]}
              onPress={() => setThemeKey(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: isActive ? c.accent : c.text2 }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 12, borderBottomWidth: 1 },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 1, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 6 },
  btn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1.5 },
  btnText: { fontSize: 11, fontWeight: '600' },
});
