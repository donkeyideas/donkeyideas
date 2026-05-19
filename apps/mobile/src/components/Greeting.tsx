import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

interface GreetingProps {
  title: string;
  subline?: string;
}

export function Greeting({ title, subline }: GreetingProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.row, { paddingTop: insets.top + 14 }]}>
      <View style={{ flex: 1 }}>
        {subline && <Text style={[styles.subline, { color: c.muted }]}>{subline}</Text>}
        <Text style={[styles.title, { color: c.ink, fontFamily: theme.fontHead }]}>{title}</Text>
      </View>
      <TouchableOpacity
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        style={[styles.avatar, { backgroundColor: c.ink }]}
        activeOpacity={0.7}
      >
        <Text style={[styles.avatarText, { color: c.bg, fontFamily: theme.fontHead }]}>D</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 },
  subline: { fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '500' },
  title: { fontSize: 26, lineHeight: 30, fontStyle: 'italic', letterSpacing: -0.3 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontStyle: 'italic' },
});
