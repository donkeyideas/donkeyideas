export type ThemeKey = 'light' | 'dark';

export interface Theme {
  name: string;
  key: ThemeKey;
  colors: {
    // Backgrounds
    bg: string;            // page bg
    bgAlt: string;         // slightly darker variant (line color zone)
    surface: string;       // card bg
    surfaceAlt: string;    // softer surface

    // Text
    ink: string;           // primary text
    inkSoft: string;       // secondary
    muted: string;         // tertiary / labels

    // Lines
    line: string;
    border: string;

    // Accents
    sage: string;          // positive / green pill
    terracotta: string;    // primary accent, charts
    plum: string;
    gold: string;
    rose: string;

    // Semantic
    positive: string;
    negative: string;
    warning: string;
    accent: string;
    accentSoft: string;

    // Chart palette (same as accents above for variety)
    chart1: string;
    chart2: string;
    chart3: string;
    chart4: string;
    chart5: string;

    // App-shell colors used by drawer / header
    text1: string;
    text2: string;
    text3: string;
    menuBg: string;
    headerBg: string;
    fabBg: string;
    fabText: string;
    overlay: string;
    borderStrong: string;
    statusBar: 'dark-content' | 'light-content';
  };
  radius: number;
  fontHead: string;
  fontBody: string;
  fontMono: string;
}

// LIGHT (cream) — matches the HTML mockup exactly
export const lightTheme: Theme = {
  name: 'Light',
  key: 'light',
  colors: {
    bg: '#f5f0e8',
    bgAlt: '#ebe3d5',
    surface: '#ffffff',
    surfaceAlt: '#faf6ee',

    ink: '#1f1d1a',
    inkSoft: '#4a463f',
    muted: '#8b8478',

    line: '#e0d6c4',
    border: '#e0d6c4',

    sage: '#7a8a5f',
    terracotta: '#c97b54',
    plum: '#6b4f6e',
    gold: '#c8a96a',
    rose: '#d49aa0',

    positive: '#7a8a5f',
    negative: '#c97b54',
    warning: '#c8a96a',
    accent: '#c97b54',
    accentSoft: 'rgba(201,123,84,0.12)',

    chart1: '#c97b54',
    chart2: '#6b4f6e',
    chart3: '#c8a96a',
    chart4: '#d49aa0',
    chart5: '#7a8a5f',

    text1: '#1f1d1a',
    text2: '#8b8478',
    text3: '#c4b9a3',
    menuBg: '#faf6ee',
    headerBg: 'rgba(245,240,232,0.92)',
    fabBg: '#1f1d1a',
    fabText: '#f5f0e8',
    overlay: 'rgba(31,29,26,0.4)',
    borderStrong: '#c4b9a3',
    statusBar: 'dark-content',
  },
  radius: 20,
  fontHead: 'InstrumentSerif_400Regular_Italic',
  fontBody: 'Geist_400Regular',
  fontMono: 'monospace',
};

// DARK — same design language inverted to dark ink
export const darkTheme: Theme = {
  name: 'Dark',
  key: 'dark',
  colors: {
    bg: '#1a1714',
    bgAlt: '#22201c',
    surface: '#2a2622',
    surfaceAlt: '#332f2a',

    ink: '#f5f0e8',
    inkSoft: '#d4cdbb',
    muted: '#8b8478',

    line: '#3a3530',
    border: '#3a3530',

    sage: '#9aaa7f',
    terracotta: '#e09a73',
    plum: '#9077a3',
    gold: '#dbc28a',
    rose: '#e5b3b8',

    positive: '#9aaa7f',
    negative: '#e09a73',
    warning: '#dbc28a',
    accent: '#e09a73',
    accentSoft: 'rgba(224,154,115,0.16)',

    chart1: '#e09a73',
    chart2: '#9077a3',
    chart3: '#dbc28a',
    chart4: '#e5b3b8',
    chart5: '#9aaa7f',

    text1: '#f5f0e8',
    text2: '#8b8478',
    text3: '#5a534b',
    menuBg: '#22201c',
    headerBg: 'rgba(26,23,20,0.92)',
    fabBg: '#f5f0e8',
    fabText: '#1f1d1a',
    overlay: 'rgba(0,0,0,0.6)',
    borderStrong: '#4a443e',
    statusBar: 'light-content',
  },
  radius: 20,
  fontHead: 'InstrumentSerif_400Regular_Italic',
  fontBody: 'Geist_400Regular',
  fontMono: 'monospace',
};

export const themes: Record<ThemeKey, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

// Legacy alias so existing imports keep working
export const auroraTheme = lightTheme;
