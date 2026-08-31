import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
const appIcon = require('../../assets/icon.png');
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { useTheme } from '../../src/theme/ThemeContext';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={[styles.drawer, { backgroundColor: c.menuBg }]}>
      <View style={[styles.brand, { borderBottomColor: c.border }]}>
        <Image source={appIcon} style={[styles.logo, { borderRadius: 12 }]} />
        <View>
          <Text style={[styles.brandName, { color: c.ink, fontFamily: theme.fontHead }]}>Donkey Ideas</Text>
          <Text style={[styles.brandSub, { color: c.muted }]}>Admin Dashboard</Text>
        </View>
      </View>

      <ThemeSwitcher />

      <DrawerContentScrollView {...props} style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <Text style={[styles.footerVersion, { color: c.muted }]}>v8</Text>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { theme } = useTheme();
  const c = theme.colors;

  const screenOpts = {
    headerShown: false,
    drawerActiveTintColor: c.ink,
    drawerInactiveTintColor: c.muted,
    drawerActiveBackgroundColor: c.bgAlt,
    drawerLabelStyle: { fontSize: 14, fontWeight: '500' as const, marginLeft: -8, fontFamily: theme.fontBody },
    drawerItemStyle: { borderRadius: 12, marginHorizontal: 8, marginVertical: 2 },
    drawerStyle: { backgroundColor: c.menuBg },
  };

  return (
    <Drawer
      drawerContent={CustomDrawerContent}
      screenOptions={screenOpts}
      initialRouteName="users"
    >
      <Drawer.Screen name="index" options={{ drawerItemStyle: { display: 'none' }, drawerLabel: () => null, title: '' }} />
      <Drawer.Screen name="users" options={{ title: 'Users', drawerLabel: 'Users' }} />
      <Drawer.Screen name="portfolio" options={{ title: 'Portfolio Agent', drawerLabel: 'Portfolio Agent' }} />
      <Drawer.Screen name="analytics" options={{ title: 'Analytics', drawerLabel: 'Analytics' }} />
      <Drawer.Screen name="appstore" options={{ title: 'App Store', drawerLabel: 'App Store' }} />
      <Drawer.Screen name="messages" options={{ title: 'Messages', drawerLabel: 'Messages' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1 },
  brand: { padding: 20, paddingTop: 56, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1 },
  logo: { width: 44, height: 44 },
  brandName: { fontSize: 22, fontStyle: 'italic', letterSpacing: -0.3 },
  brandSub: { fontSize: 11, marginTop: 1, letterSpacing: 0.5 },
  footer: { padding: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerVersion: { fontSize: 10, letterSpacing: 0.5 },
});
