import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface TabBarProps {
  tabs: string[];
  activeTab: number;
  onTabChange: (index: number) => void;
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={styles.scroll}
    >
      {tabs.map((tab, i) => {
        const isActive = i === activeTab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, {
              backgroundColor: isActive ? c.accentSoft : 'transparent',
              borderColor: isActive ? c.accent : c.border,
              borderRadius: theme.radius,
            }]}
            onPress={() => onTabChange(i)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, {
              color: isActive ? c.accent : c.text2,
              fontWeight: isActive ? '700' : '500',
            }]}>{tab}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: 16 },
  container: { gap: 8, paddingHorizontal: 16 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1 },
  tabText: { fontSize: 13 },
});
