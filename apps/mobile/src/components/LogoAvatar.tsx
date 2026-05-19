import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface LogoAvatarProps {
  uri?: string | null;        // absolute URL or path beginning with /
  fallbackLetter: string;     // shown if no uri or image fails
  fallbackColor?: string;
  size?: number;
  borderRadius?: number;      // 0 = square, undefined = full circle (size/2)
}

function resolveUri(uri?: string | null): string | null {
  if (!uri) return null;
  if (uri.startsWith('http')) return uri;
  if (uri.startsWith('/')) return `https://www.donkeyideas.com${uri}`;
  return uri;
}

export function LogoAvatar({ uri, fallbackLetter, fallbackColor, size = 38, borderRadius }: LogoAvatarProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [failed, setFailed] = useState(false);
  const src = resolveUri(uri);
  const radius = borderRadius === undefined ? size / 2 : borderRadius;
  const bgColor = fallbackColor || c.terracotta;

  if (!src || failed) {
    return (
      <View style={[styles.fallback, { width: size, height: size, borderRadius: radius, backgroundColor: bgColor }]}>
        <Text style={[styles.letter, { color: '#fff', fontFamily: theme.fontHead, fontSize: size * 0.42 }]}>
          {fallbackLetter.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radius, backgroundColor: c.bgAlt }]}>
      <Image source={{ uri: src }} style={{ width: size, height: size }} onError={() => setFailed(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fallback: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  letter: { fontStyle: 'italic' },
});
