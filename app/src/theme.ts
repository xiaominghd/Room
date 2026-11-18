import { Platform, TextStyle, ViewStyle } from 'react-native';

/**
 * 设计令牌 —— 唯一来源。
 * 数值来自 demo/未命名画布.kui.fig（402×874，iPhone 16 Pro）。
 * 组件里不许出现十六进制色值或裸字号。
 */

export const C = {
  surface: '#F2F3F5',
  card: '#FFFFFF',
  surfaceMine: '#E8EAF0',

  text: '#23262B',
  text2: '#6E7279',
  text3: '#A8ABB3',

  line: '#E5E7EB',
  divider: '#EDEEF1',
  hairline: '#E7E9ED',

  accent: '#3E6B5A',
  accentSoft: '#E5EFEA',

  blue: '#3F5E8C',
  blueSoft: '#E4EAF3',

  amber: '#B9862F',
  amberSoft: '#F4ECDA',

  rose: '#A85751',
  roseSoft: '#F2E5E3',

  dim: '#14161B',
  darkPanel: '#1E2127',
  bubbleTheirsAlt: '#3A3E47',

  track: '#F0F1F4',
  toggleOff: '#D4D8E0',
  traceLine: '#C9CDD4',
  wave: '#9DB4D2',
  white: '#FFFFFF',
} as const;

export const R = {
  icon: 9,
  photo: 12,
  card: 14,
  bubble: 16,
  sheet: 20,
  pill: 999,
} as const;

export const S = {
  page: 16,
  card: 16,
  gap: 12,
  tight: 8,
  hair: 4,
} as const;

export const FONT_SERIF = Platform.select({ ios: 'Songti SC', android: 'serif', default: 'serif' });

type Weight = TextStyle['fontWeight'];

export const T: Record<
  'display' | 'roomTitle' | 'section' | 'name' | 'body' | 'bodyStrong' | 'meta' | 'label' | 'caption' | 'micro',
  { fontSize: number; lineHeight: number; fontWeight: Weight }
> = {
  display: { fontSize: 24, lineHeight: 32, fontWeight: '700' },
  roomTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  section: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  name: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  meta: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 17, fontWeight: '400' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '400' },
  micro: { fontSize: 10, lineHeight: 14, fontWeight: '400' },
};

export const SHADOW: Record<'card' | 'bar' | 'sheet' | 'dialog', ViewStyle> = {
  card: Platform.select({
    ios: { shadowColor: '#3A2E22', shadowOpacity: 0.07, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle,
  bar: Platform.select({
    ios: { shadowColor: '#3A2E22', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
    android: { elevation: 8 },
    default: {},
  }) as ViewStyle,
  sheet: Platform.select({
    ios: { shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: -12 } },
    android: { elevation: 16 },
    default: {},
  }) as ViewStyle,
  dialog: Platform.select({
    ios: { shadowColor: '#000000', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 16 },
    default: {},
  }) as ViewStyle,
};

export const NUM = { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] };
