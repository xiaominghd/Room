import React, { ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { C, FONT_SERIF, NUM, R, S, SHADOW, T } from './theme';

/* ------------------------------------------------------------------ */
/* icons：用 View 画线，不引图标库                                      */
/* ------------------------------------------------------------------ */

export type IconName =
  | 'door'
  | 'talk'
  | 'pause'
  | 'drawer'
  | 'album'
  | 'chevron'
  | 'back'
  | 'image'
  | 'play'
  | 'server'
  | 'bell'
  | 'download'
  | 'key'
  | 'info'
  | 'hide';

export function Icon({
  name,
  size = 14,
  color = C.text2,
  weight = 1.5,
}: {
  name: IconName;
  size?: number;
  color?: string;
  weight?: number;
}) {
  const s = size;
  const b = { borderColor: color, borderWidth: weight } as const;

  switch (name) {
    case 'door':
      return (
        <View style={{ width: s, height: s, justifyContent: 'flex-end', alignItems: 'center' }}>
          <View style={[b, { width: s * 0.72, height: s * 0.92, borderTopLeftRadius: s * 0.3, borderTopRightRadius: s * 0.3 }]}>
            <View style={{ position: 'absolute', right: s * 0.12, top: s * 0.42, width: Math.max(1.5, s * 0.1), height: Math.max(1.5, s * 0.1), borderRadius: 2, backgroundColor: color }} />
          </View>
        </View>
      );
    case 'talk':
      return (
        <View style={{ width: s, height: s }}>
          <View style={[b, { width: s * 0.86, height: s * 0.68, borderRadius: s * 0.28 }]} />
          <View
            style={{
              position: 'absolute',
              left: s * 0.2,
              top: s * 0.6,
              width: s * 0.26,
              height: s * 0.26,
              borderLeftWidth: weight,
              borderBottomWidth: weight,
              borderColor: color,
              transform: [{ rotate: '-28deg' }],
            }}
          />
        </View>
      );
    case 'pause':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s * 0.2 }}>
          <View style={{ width: Math.max(2, s * 0.16), height: s * 0.72, borderRadius: 2, backgroundColor: color }} />
          <View style={{ width: Math.max(2, s * 0.16), height: s * 0.72, borderRadius: 2, backgroundColor: color }} />
        </View>
      );
    case 'drawer':
      return (
        <View style={{ width: s, height: s, justifyContent: 'center' }}>
          <View style={[b, { width: s, height: s * 0.78, borderRadius: s * 0.2, justifyContent: 'center' }]}>
            <View style={{ height: weight, backgroundColor: color, marginTop: s * 0.1 }} />
          </View>
        </View>
      );
    case 'album':
      return (
        <View style={{ width: s, height: s, flexDirection: 'row', flexWrap: 'wrap', gap: s * 0.14 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: s * 0.42, height: s * 0.42, borderRadius: s * 0.1, borderWidth: weight, borderColor: color }} />
          ))}
        </View>
      );
    case 'chevron':
      return (
        <View
          style={{
            width: s * 0.46,
            height: s * 0.46,
            borderRightWidth: weight + 0.2,
            borderTopWidth: weight + 0.2,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginLeft: -s * 0.1,
          }}
        />
      );
    case 'back':
      return (
        <View
          style={{
            width: s * 0.5,
            height: s * 0.5,
            borderLeftWidth: weight + 0.3,
            borderBottomWidth: weight + 0.3,
            borderColor: color,
            transform: [{ rotate: '45deg' }],
            marginLeft: s * 0.1,
          }}
        />
      );
    case 'image':
      return (
        <View style={[b, { width: s, height: s * 0.82, borderRadius: s * 0.2, justifyContent: 'center', alignItems: 'center' }]}>
          <View style={{ width: s * 0.18, height: s * 0.18, borderRadius: s * 0.1, backgroundColor: color, position: 'absolute', left: s * 0.16, top: s * 0.14 }} />
          <View style={{ width: s * 0.45, height: s * 0.3, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: color, opacity: 0.55, marginTop: s * 0.2 }} />
        </View>
      );
    case 'play':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: s * 0.28,
              borderBottomWidth: s * 0.28,
              borderLeftWidth: s * 0.46,
              borderTopColor: 'transparent',
              borderBottomColor: 'transparent',
              borderLeftColor: color,
              marginLeft: s * 0.12,
            }}
          />
        </View>
      );
    case 'server':
      return (
        <View style={{ width: s, height: s, justifyContent: 'space-between' }}>
          {[0, 1].map((i) => (
            <View key={i} style={[b, { width: s, height: s * 0.42, borderRadius: s * 0.12, flexDirection: 'row', alignItems: 'center', paddingLeft: s * 0.16, gap: s * 0.1 }]}>
              <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: color }} />
              <View style={{ width: s * 0.1, height: s * 0.1, borderRadius: s * 0.05, backgroundColor: color }} />
            </View>
          ))}
        </View>
      );
    case 'bell':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
          <View style={[b, { width: s * 0.72, height: s * 0.62, borderTopLeftRadius: s * 0.36, borderTopRightRadius: s * 0.36, borderBottomWidth: 0 }]} />
          <View style={{ width: s * 0.86, height: weight, backgroundColor: color, marginTop: -weight }} />
          <View style={{ width: s * 0.16, height: s * 0.12, borderRadius: s * 0.08, backgroundColor: color, marginTop: weight }} />
        </View>
      );
    case 'download':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: weight, height: s * 0.5, backgroundColor: color }} />
          <View style={{ width: s * 0.44, height: s * 0.44, borderRightWidth: weight, borderBottomWidth: weight, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -s * 0.28 }} />
          <View style={{ width: s * 0.8, height: weight, backgroundColor: color, marginTop: s * 0.1 }} />
        </View>
      );
    case 'key':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' }}>
          <View style={[b, { width: s * 0.5, height: s * 0.5, borderRadius: s * 0.25 }]} />
          <View style={{ width: s * 0.44, height: weight, backgroundColor: color }} />
          <View style={{ width: weight, height: s * 0.22, backgroundColor: color, marginLeft: -s * 0.1 }} />
        </View>
      );
    case 'info':
      return (
        <View style={[b, { width: s, height: s, borderRadius: s * 0.5, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color, fontSize: s * 0.62, fontWeight: '700', lineHeight: s * 0.72 }}>i</Text>
        </View>
      );
    case 'hide':
      return (
        <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
          <View style={[b, { width: s * 0.86, height: s * 0.5, borderRadius: s * 0.25 }]} />
          <View style={{ position: 'absolute', width: s, height: weight, backgroundColor: color, transform: [{ rotate: '-40deg' }] }} />
        </View>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* 基础件                                                              */
/* ------------------------------------------------------------------ */

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Btn({
  label,
  onPress,
  tone = 'accent',
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  tone?: 'accent' | 'blue' | 'rose' | 'ink' | 'muted';
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
}) {
  const bg =
    tone === 'accent' ? C.accent : tone === 'blue' ? C.blue : tone === 'rose' ? C.rose : tone === 'ink' ? C.text : C.divider;
  const fg = tone === 'muted' ? C.text2 : C.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg },
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.86 },
        style,
      ]}
    >
      <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Toggle({ value, onChange, active = C.blue }: { value: boolean; onChange: (v: boolean) => void; active?: string }) {
  return (
    <Pressable onPress={() => onChange(!value)} hitSlop={10} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={[styles.toggleTrack, { backgroundColor: value ? active : C.toggleOff }]}>
        <View style={[styles.toggleKnob, { transform: [{ translateX: value ? 18 : 0 }] }]} />
      </View>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.segmented, style]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, on && styles.segmentOn]}>
            <Text style={[styles.segmentText, on && styles.segmentTextOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function IconTile({ children, bg = C.surfaceMine }: { children: ReactNode; bg?: string }) {
  return <View style={[styles.tile, { backgroundColor: bg }]}>{children}</View>;
}

export function Row({
  left,
  title,
  desc,
  right,
  onPress,
  last,
}: {
  left?: ReactNode;
  title: string;
  desc?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && styles.rowDivider]}>
      {left}
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle}>{title}</Text>
        {desc ? <Text style={styles.rowDesc}>{desc}</Text> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {body}
    </Pressable>
  );
}

export function BackBar({ onBack, title, right }: { onBack: () => void; title: string; right?: ReactNode }) {
  return (
    <View style={styles.backBar}>
      <View style={styles.backRow}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Icon name="back" size={17} color={C.text} weight={1.8} />
        </Pressable>
        <View style={{ flex: 1 }} />
        {right}
      </View>
      <Text style={styles.pageTitle}>{title}</Text>
    </View>
  );
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={C.text3} {...props} style={[styles.field, props.style]} />;
}

export function Toast({ text }: { text: string }) {
  return (
    <View style={styles.toastWrap} pointerEvents="none">
      <View style={styles.toast}>
        <Text style={styles.toastText}>{text}</Text>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 页面容器：一级页从左滑入，260ms                                      */
/* ------------------------------------------------------------------ */

export const EnterFrom = React.createContext(320);

export function Page({
  children,
  background = C.surface,
  enterFrom,
}: {
  children: ReactNode;
  background?: string;
  enterFrom?: number;
}) {
  const ctx = React.useContext(EnterFrom);
  const from = enterFrom ?? ctx;
  const x = useRef(new Animated.Value(from)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [x]);
  return (
    <Animated.View style={[styles.page, { backgroundColor: background, transform: [{ translateX: x }] }]}>
      {children}
    </Animated.View>
  );
}

/* ------------------------------------------------------------------ */
/* 照片占位（真机接入后换成 Image）                                     */
/* ------------------------------------------------------------------ */

export function hsl(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function PhotoBlock({
  hue,
  label,
  style,
  radius = R.photo,
  showLabel = true,
}: {
  hue: number;
  label?: string;
  style?: ViewStyle | ViewStyle[];
  radius?: number;
  showLabel?: boolean;
}) {
  return (
    <View style={[{ backgroundColor: hsl(hue, 26, 34), borderRadius: radius, overflow: 'hidden' }, style]}>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '44%', backgroundColor: 'rgba(255,255,255,0.14)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', backgroundColor: 'rgba(0,0,0,0.16)' }} />
      {showLabel && label ? (
        <Text style={{ position: 'absolute', left: 10, bottom: 8, color: 'rgba(255,255,255,0.86)', fontSize: 10, fontWeight: '500' }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* 弹层                                                                */
/* ------------------------------------------------------------------ */

const WEB = Platform.OS === 'web';

/** 网页预览里弹层要留在手机框内，所以不用 Modal（Modal 会铺满整个浏览器窗口）。 */
export function Dialog({
  visible,
  onClose,
  children,
  width = 340,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  if (WEB) {
    if (!visible) return null;
    return (
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.dialog, { width }]} onPress={() => {}}>
            {children}
          </Pressable>
        </Pressable>
      </View>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.dialog, { width }]} onPress={() => {}}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Sheet({
  visible,
  onClose,
  children,
  height,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  height: number;
}) {
  if (WEB) {
    if (!visible) return null;
    return (
      <View style={[styles.overlay, { justifyContent: 'flex-end' }]}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable style={[styles.sheet, { height }]} onPress={() => {}}>
            <View style={styles.handle} />
            {children}
          </Pressable>
        </Pressable>
      </View>
    );
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { height }]} onPress={() => {}}>
          <View style={styles.handle} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: R.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    ...SHADOW.card,
  },
  btn: {
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { ...T.bodyStrong, fontWeight: '600' },

  toggleTrack: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.white,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  segmented: {
    flexDirection: 'row',
    height: 38,
    borderRadius: R.pill,
    backgroundColor: C.track,
    padding: 3,
  },
  segment: { flex: 1, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: C.white, ...SHADOW.card },
  segmentText: { ...T.meta, color: C.text2 },
  segmentTextOn: { color: C.text, fontWeight: '600' },

  tile: { width: 34, height: 34, borderRadius: R.icon, alignItems: 'center', justifyContent: 'center' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.gap,
    minHeight: 62,
    paddingHorizontal: S.card,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  rowMain: { flex: 1, paddingVertical: 12 },
  rowTitle: { ...T.body, color: C.text, fontWeight: '500' },
  rowDesc: { ...T.caption, color: C.text3, marginTop: 2 },

  backBar: { paddingHorizontal: S.page, paddingTop: 8 },
  backRow: { height: 40, flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
  },
  pageTitle: { ...T.display, color: C.text, marginTop: 6 },

  field: { ...T.body, color: C.text, paddingVertical: 8 },

  page: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, flex: 1 },

  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 30 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,22,27,0.32)', alignItems: 'center', justifyContent: 'center' },
  dialog: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 20,
    ...SHADOW.dialog,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: R.sheet,
    borderTopRightRadius: R.sheet,
    paddingHorizontal: S.page,
    paddingBottom: 24,
    ...SHADOW.sheet,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.toggleOff, alignSelf: 'center', marginTop: 8, marginBottom: 6 },

  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 120, alignItems: 'center' },
  toast: {
    backgroundColor: 'rgba(30,33,39,0.94)',
    borderRadius: R.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  toastText: { ...T.caption, color: C.white },
});

export { styles as uiStyles, FONT_SERIF, NUM };
