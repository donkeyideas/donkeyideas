import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
const appIcon = require('../../assets/icon.png');
import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../src/theme/ThemeContext';
import { ThemeSwitcher } from '../../src/components/ThemeSwitcher';
import { useAuthStore } from '../../src/store/authStore';

function DrawerToggle() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={{ marginLeft: 14, padding: 4 }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={{ gap: 4 }}>
        <View style={{ width: 20, height: 2, backgroundColor: theme.colors.text1, borderRadius: 1 }} />
        <View style={{ width: 20, height: 2, backgroundColor: theme.colors.text1, borderRadius: 1 }} />
        <View style={{ width: 20, height: 2, backgroundColor: theme.colors.text1, borderRadius: 1 }} />
      </View>
    </TouchableOpacity>
  );
}

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  return (
    <View style={[styles.drawer, { backgroundColor: c.menuBg }]}>
      {/* Brand */}
      <View style={[styles.brand, { borderBottomColor: c.border }]}>
        <Image source={appIcon} style={[styles.logo, { borderRadius: theme.radius * 0.8 }]} />
        <View>
          <Text style={[styles.brandName, { color: c.text1 }]}>Donkey Ideas</Text>
          <Text style={[styles.brandSub, { color: c.text2 }]}>{user?.name || 'Admin Dashboard'}</Text>
        </View>
      </View>

      {/* Theme Switcher */}
      <ThemeSwitcher />

      {/* Navigation Items */}
      <DrawerContentScrollView {...props} style={{ flex: 1 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {/* Footer */}
      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <TouchableOpacity onPress={logout}>
          <Text style={[styles.footerLink, { color: c.negative }]}>Sign Out</Text>
        </TouchableOpacity>
        <Text style={[styles.footerVersion, { color: c.text2 }]}>v1.0.0</Text>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { theme } = useTheme();
  const c = theme.colors;

  const screenOpts = {
    headerStyle: { backgroundColor: c.headerBg },
    headerTintColor: c.text1,
    headerTitleStyle: { fontWeight: '700' as const, fontSize: 18 },
    headerShadowVisible: false,
    headerLeft: () => <DrawerToggle />,
    drawerActiveTintColor: c.accent,
    drawerInactiveTintColor: c.text2,
    drawerActiveBackgroundColor: c.accentSoft,
    drawerLabelStyle: { fontSize: 14, fontWeight: '500' as const, marginLeft: -8 },
    drawerItemStyle: { borderRadius: theme.radius, marginHorizontal: 8, marginVertical: 2 },
  };

  return (
    <Drawer
      drawerContent={CustomDrawerContent}
      screenOptions={screenOpts}
    >
      <Drawer.Screen name="index" options={{ title: 'Dashboard', drawerLabel: 'Dashboard' }} />
      <Drawer.Screen name="financials" options={{ title: 'Financials', drawerLabel: 'Financials' }} />
      <Drawer.Screen name="analytics" options={{ title: 'Analytics', drawerLabel: 'Analytics' }} />
      <Drawer.Screen name="appstore" options={{ title: 'App Store', drawerLabel: 'App Store' }} />
      <Drawer.Screen name="projects" options={{ title: 'Projects', drawerLabel: 'Projects' }} />
      <Drawer.Screen name="users" options={{ title: 'Users', drawerLabel: 'Users' }} />
      <Drawer.Screen name="seo-geo" options={{ title: 'SEO & GEO', drawerLabel: 'SEO & GEO' }} />
      <Drawer.Screen name="messages" options={{ title: 'Messages', drawerLabel: 'Messages' }} />
      <Drawer.Screen name="social-posts" options={{ title: 'Social Posts', drawerLabel: 'Social Posts' }} />
      <Drawer.Screen name="ai-assistant" options={{ title: 'AI Assistant', drawerLabel: 'AI Assistant' }} />
      <Drawer.Screen name="api-usage" options={{ title: 'API Usage', drawerLabel: 'API Usage' }} />
      <Drawer.Screen name="settings" options={{ title: 'Settings', drawerLabel: 'Settings' }} />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawer: { flex: 1 },
  brand: { padding: 20, paddingTop: 50, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1 },
  logo: { width: 44, height: 44 },
  brandName: { fontSize: 16, fontWeight: '700' },
  brandSub: { fontSize: 11, marginTop: 1 },
  footer: { padding: 16, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLink: { fontSize: 13, fontWeight: '600' },
  footerVersion: { fontSize: 10 },
});
