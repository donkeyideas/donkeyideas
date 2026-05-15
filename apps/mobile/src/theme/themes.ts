export interface Theme {
  name: string;
  key: 'minimal' | 'glass' | 'bloomberg' | 'aurora';
  colors: {
    bg: string;
    surface: string;
    surfaceAlt: string;
    text1: string;
    text2: string;
    text3: string;
    accent: string;
    accentSoft: string;
    border: string;
    borderStrong: string;
    positive: string;
    negative: string;
    warning: string;
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    menuBg: string;
    headerBg: string;
    fabBg: string;
    fabText: string;
    overlay: string;
    statusBar: 'dark-content' | 'light-content';
  };
  radius: number;
  fontHead: string;
  fontBody: string;
  fontMono: string;
}

export const minimalTheme: Theme = {
  name: 'Light',
  key: 'minimal',
  colors: {
    bg: '#f8f9fb',
    surface: '#ffffff',
    surfaceAlt: '#f3f4f6',
    text1: '#111827',
    text2: '#6b7280',
    text3: '#d1d5db',
    accent: '#3b82f6',
    accentSoft: 'rgba(59,130,246,0.08)',
    border: '#eef0f2',
    borderStrong: '#e5e7eb',
    positive: '#059669',
    negative: '#dc2626',
    warning: '#d97706',
    chart1: '#3b82f6',
    chart2: '#8b5cf6',
    chart3: '#06b6d4',
    chart4: '#d1d5db',
    menuBg: '#ffffff',
    headerBg: 'rgba(248,249,251,0.92)',
    fabBg: '#3b82f6',
    fabText: '#ffffff',
    overlay: 'rgba(0,0,0,0.3)',
    statusBar: 'dark-content',
  },
  radius: 14,
  fontHead: 'System',
  fontBody: 'System',
  fontMono: 'monospace',
};

export const glassTheme: Theme = {
  name: 'Normal',
  key: 'glass',
  colors: {
    bg: '#0a0a0a',
    surface: 'rgba(255,255,255,0.08)',
    surfaceAlt: 'rgba(255,255,255,0.04)',
    text1: '#ffffff',
    text2: 'rgba(255,255,255,0.55)',
    text3: 'rgba(255,255,255,0.2)',
    accent: '#3b82f6',
    accentSoft: 'rgba(59,130,246,0.12)',
    border: 'rgba(255,255,255,0.1)',
    borderStrong: 'rgba(255,255,255,0.18)',
    positive: '#4ade80',
    negative: '#f87171',
    warning: '#fbbf24',
    chart1: '#3b82f6',
    chart2: '#fbbf24',
    chart3: '#a78bfa',
    chart4: '#fb7185',
    menuBg: 'rgba(10,10,10,0.95)',
    headerBg: 'rgba(10,10,10,0.92)',
    fabBg: '#3b82f6',
    fabText: '#ffffff',
    overlay: 'rgba(0,0,0,0.5)',
    statusBar: 'light-content',
  },
  radius: 14,
  fontHead: 'System',
  fontBody: 'System',
  fontMono: 'monospace',
};

export const bloombergTheme: Theme = {
  name: 'Dark',
  key: 'bloomberg',
  colors: {
    bg: '#000000',
    surface: '#0c0c0c',
    surfaceAlt: '#080808',
    text1: '#ff9900',
    text2: '#5a5a5a',
    text3: '#2a2a2a',
    accent: '#ff9900',
    accentSoft: 'rgba(255,153,0,0.06)',
    border: '#1a1a1a',
    borderStrong: '#252525',
    positive: '#00ff00',
    negative: '#ff3333',
    warning: '#ff9900',
    chart1: '#ff9900',
    chart2: '#00ff00',
    chart3: '#ff6600',
    chart4: '#ff3333',
    menuBg: '#080808',
    headerBg: 'rgba(0,0,0,0.95)',
    fabBg: '#ff9900',
    fabText: '#000000',
    overlay: 'rgba(0,0,0,0.6)',
    statusBar: 'light-content',
  },
  radius: 2,
  fontHead: 'JetBrainsMono',
  fontBody: 'JetBrainsMono',
  fontMono: 'JetBrainsMono',
};

export const auroraTheme: Theme = {
  name: 'Aurora',
  key: 'aurora',
  colors: {
    bg: '#0f0520',
    surface: 'rgba(255,255,255,0.08)',
    surfaceAlt: 'rgba(255,255,255,0.04)',
    text1: '#ffffff',
    text2: 'rgba(255,255,255,0.6)',
    text3: 'rgba(255,255,255,0.2)',
    accent: '#c084fc',
    accentSoft: 'rgba(192,132,252,0.12)',
    border: 'rgba(255,255,255,0.1)',
    borderStrong: 'rgba(255,255,255,0.18)',
    positive: '#4ade80',
    negative: '#f87171',
    warning: '#fbbf24',
    chart1: '#c084fc',
    chart2: '#f472b6',
    chart3: '#4ade80',
    chart4: '#fbbf24',
    menuBg: 'rgba(15,5,32,0.96)',
    headerBg: 'rgba(15,5,32,0.92)',
    fabBg: '#c084fc',
    fabText: '#ffffff',
    overlay: 'rgba(0,0,0,0.5)',
    statusBar: 'light-content',
  },
  radius: 20,
  fontHead: 'System',
  fontBody: 'System',
  fontMono: 'monospace',
};

export const themes = { minimal: minimalTheme, glass: glassTheme, bloomberg: bloombergTheme, aurora: auroraTheme };
