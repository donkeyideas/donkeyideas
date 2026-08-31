import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { themes } from '../theme/themes';

const ICON_SIZE = 20;

function UsersIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </Svg>
  );
}
function ChartIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M3 3v18h18" />
      <Path d="M7 14l4-4 4 4 5-5" />
    </Svg>
  );
}
function GridIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Rect x="3" y="3" width="7" height="7" />
      <Rect x="14" y="3" width="7" height="7" />
      <Rect x="3" y="14" width="7" height="7" />
      <Rect x="14" y="14" width="7" height="7" />
    </Svg>
  );
}
function SunIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Circle cx="12" cy="12" r="4" />
      <Line x1="12" y1="2" x2="12" y2="5" />
      <Line x1="12" y1="19" x2="12" y2="22" />
      <Line x1="2" y1="12" x2="5" y2="12" />
      <Line x1="19" y1="12" x2="22" y2="12" />
      <Line x1="4.9" y1="4.9" x2="7" y2="7" />
      <Line x1="17" y1="17" x2="19.1" y2="19.1" />
      <Line x1="4.9" y1="19.1" x2="7" y2="17" />
      <Line x1="17" y1="7" x2="19.1" y2="4.9" />
    </Svg>
  );
}
function MoonIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
    </Svg>
  );
}
function DollarIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round">
      <Line x1="12" y1="1" x2="12" y2="23" />
      <Path d="M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" />
    </Svg>
  );
}

function MailIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round">
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </Svg>
  );
}

export function BottomTabBar() {
  const { theme, themeKey, setThemeKey } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const pathname = usePathname();

  const isUsers = pathname.endsWith('/users');
  const isAnalytics = pathname.endsWith('/analytics');
  const isApps = pathname.endsWith('/appstore');
  const isFinancials = pathname.endsWith('/financials');
  const isMessages = pathname.endsWith('/messages');
  const isDark = themeKey === 'dark';

  // Inverted bar: render the toolbar in the OPPOSITE theme so the floating
  // nav always contrasts with the screen behind it.
  const inv = themes[isDark ? 'light' : 'dark'].colors;
  const barBg = inv.bg;
  const barBorder = inv.border;
  const inactiveIcon = inv.muted;
  const activeBg = inv.ink;
  const activeIcon = inv.bg;

  return (
    <View style={[styles.bar, { backgroundColor: barBg, borderColor: barBorder }]} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.tab, isUsers && { backgroundColor: activeBg }]}
        onPress={() => router.replace('/users')}
        activeOpacity={0.7}
      >
        <UsersIcon color={isUsers ? activeIcon : inactiveIcon} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, isAnalytics && { backgroundColor: activeBg }]}
        onPress={() => router.replace('/analytics')}
        activeOpacity={0.7}
      >
        <ChartIcon color={isAnalytics ? activeIcon : inactiveIcon} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, isApps && { backgroundColor: activeBg }]}
        onPress={() => router.replace('/appstore')}
        activeOpacity={0.7}
      >
        <GridIcon color={isApps ? activeIcon : inactiveIcon} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, isFinancials && { backgroundColor: activeBg }]}
        onPress={() => router.replace('/financials')}
        activeOpacity={0.7}
      >
        <DollarIcon color={isFinancials ? activeIcon : inactiveIcon} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, isMessages && { backgroundColor: activeBg }]}
        onPress={() => router.replace('/messages')}
        activeOpacity={0.7}
      >
        <MailIcon color={isMessages ? activeIcon : inactiveIcon} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => setThemeKey(isDark ? 'light' : 'dark')}
        activeOpacity={0.7}
      >
        {isDark ? <SunIcon color={inactiveIcon} /> : <MoonIcon color={inactiveIcon} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 18,
    left: 16,
    right: 16,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  tab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
