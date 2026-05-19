import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';
import { useRouter, usePathname } from 'expo-router';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';

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
function MenuIcon({ color }: { color: string }) {
  return (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}>
      <Line x1="3" y1="6" x2="21" y2="6" />
      <Line x1="3" y1="12" x2="21" y2="12" />
      <Line x1="3" y1="18" x2="21" y2="18" />
    </Svg>
  );
}

// Tab bar uses literal dark/cream colors so it looks identical in light and
// dark mode (the bar is always dark with light icons, like the mockup).
const BAR_BG = '#1f1d1a';
const ACTIVE_BG = '#f5f0e8';
const ACTIVE_ICON = '#1f1d1a';
const INACTIVE_ICON = 'rgba(245,240,232,0.55)';

export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useNavigation();

  const isUsers = pathname.endsWith('/users');
  const isAnalytics = pathname.endsWith('/analytics');
  const isApps = pathname.endsWith('/appstore');

  return (
    <View style={[styles.bar, { backgroundColor: BAR_BG }]} pointerEvents="box-none">
      <TouchableOpacity
        style={[styles.tab, isUsers && { backgroundColor: ACTIVE_BG }]}
        onPress={() => router.replace('/users')}
        activeOpacity={0.7}
      >
        <UsersIcon color={isUsers ? ACTIVE_ICON : INACTIVE_ICON} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, isAnalytics && { backgroundColor: ACTIVE_BG }]}
        onPress={() => router.replace('/analytics')}
        activeOpacity={0.7}
      >
        <ChartIcon color={isAnalytics ? ACTIVE_ICON : INACTIVE_ICON} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, isApps && { backgroundColor: ACTIVE_BG }]}
        onPress={() => router.replace('/appstore')}
        activeOpacity={0.7}
      >
        <GridIcon color={isApps ? ACTIVE_ICON : INACTIVE_ICON} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
        activeOpacity={0.7}
      >
        <MenuIcon color={INACTIVE_ICON} />
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
    borderColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
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
