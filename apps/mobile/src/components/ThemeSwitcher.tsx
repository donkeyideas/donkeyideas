import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ThemeKey } from '../theme/themes';

const themeOptions: Array<{ key: ThemeKey; label: string }> = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

export function ThemeSwitcher() {
  const { theme, themeKey, setThemeKey } = useTheme();
  const c = theme.colors;

  return (
    <View style={[styles.container, { borderBottomColor: c.border }]}>
      <Text style={[styles.label, { color: c.muted }]}>APPEARANCE</Text>
      <View style={styles.row}>
        {themeOptions.map((opt) => {
          const isActive = themeKey === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              style={[styles.btn, {
                backgroundColor: isActive ? c.ink : c.surfaceAlt,
                borderColor: isActive ? c.ink : c.border,
                borderRadius: 999,
              }]}
              onPress={() => setThemeKey(opt.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: isActive ? c.bg : c.muted }]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 12, borderBottomWidth: 1 },
  label: { fontSize: 10, fontWeight: '500', letterSpacing: 1.5, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1 },
  btnText: { fontSize: 12, fontWeight: '600' },
});
