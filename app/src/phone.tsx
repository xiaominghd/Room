import React, { ReactNode } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { C, NUM, T } from './theme';

/**
 * 网页预览专用：把 App 放进一台 402 × 874 的手机里。
 * 原生端不会用到这里（SafeAreaView 由系统提供）。
 */

const SCREEN_W = 402;
const SCREEN_H = 874;
const BEZEL = 10;
const DEVICE_W = SCREEN_W + BEZEL * 2;
const DEVICE_H = SCREEN_H + BEZEL * 2;

function StatusBarMock({ light }: { light?: boolean }) {
  return (
    <View style={styles.statusBar} pointerEvents="none">
      <Text style={[styles.statusTime, light && { color: '#FFFFFF' }]}>9:41</Text>
      <View style={[styles.statusRight, light && { opacity: 1 }]}>
        <View style={styles.signal}>
          {[4, 6, 8, 10].map((h, i) => (
            <View key={i} style={[styles.signalBar, { height: h }]} />
          ))}
        </View>
        <View style={styles.wifi}>
          <View style={[styles.wifiRing, { width: 22, height: 22, borderRadius: 11 }]} />
          <View style={[styles.wifiRing, { width: 15, height: 15, borderRadius: 7.5 }]} />
          <View style={[styles.wifiRing, { width: 8, height: 8, borderRadius: 4 }]} />
          <View style={styles.wifiDot} />
        </View>
        <View style={styles.battery}>
          <View style={styles.batteryFill} />
        </View>
        <View style={styles.batteryCap} />
      </View>
      <View style={styles.island} />
    </View>
  );
}

export function PhoneShell({ children, light }: { children: ReactNode; light?: boolean }) {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(1, (height - 64) / (DEVICE_H + 40), (width - 64) / DEVICE_W);

  return (
    <View style={styles.desk}>
      <View style={{ width: DEVICE_W * scale, height: (DEVICE_H + 34) * scale }}>
        <View style={{ width: DEVICE_W, height: DEVICE_H + 34, transform: [{ scale }], transformOrigin: 'top left' }}>
          <View style={styles.device}>
            <View style={styles.screen}>
              <StatusBarMock light={light} />
              <View style={styles.appArea}>{children}</View>
              <View style={styles.homeIndicator} pointerEvents="none" />
            </View>
          </View>
          <Text style={styles.caption}>房间 · 402 × 874 · 网页预览</Text>
        </View>
      </View>
    </View>
  );
}

const STATUS_H = 59;
const HOME_H = 21;

const styles = StyleSheet.create({
  desk: {
    flex: 1,
    backgroundColor: '#E6E8EC',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  device: {
    width: DEVICE_W,
    height: DEVICE_H,
    borderRadius: 56,
    backgroundColor: '#0F1012',
    padding: BEZEL,
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 18,
  },
  screen: {
    flex: 1,
    borderRadius: 46,
    overflow: 'hidden',
    backgroundColor: C.surface,
    position: 'relative',
  },
  appArea: {
    flex: 1,
    paddingTop: STATUS_H,
    paddingBottom: HOME_H,
    position: 'relative',
  },
  caption: {
    ...T.caption,
    color: '#8B909B',
    textAlign: 'center',
    marginTop: 14,
    ...NUM,
  },

  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STATUS_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 26,
    paddingRight: 22,
    zIndex: 5,
  },
  statusTime: { fontSize: 15, fontWeight: '600', color: C.text, letterSpacing: 0.2, ...NUM },
  statusRight: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6 },
  signal: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 11 },
  signalBar: { width: 3, borderRadius: 1, backgroundColor: C.text },
  wifi: { width: 16, height: 12, alignItems: 'center', overflow: 'hidden' },
  wifiRing: { position: 'absolute', top: 1, borderWidth: 1.5, borderColor: C.text },
  wifiDot: { position: 'absolute', top: 10, width: 2.4, height: 2.4, borderRadius: 1.2, backgroundColor: C.text },
  battery: {
    width: 23,
    height: 11.5,
    borderRadius: 3.2,
    borderWidth: 1,
    borderColor: 'rgba(35,38,43,0.5)',
    padding: 1.4,
  },
  batteryFill: { flex: 1, borderRadius: 1.6, backgroundColor: C.text },
  batteryCap: { width: 1.6, height: 4, borderRadius: 1, backgroundColor: 'rgba(35,38,43,0.45)', marginLeft: 1 },

  island: {
    position: 'absolute',
    top: 11,
    left: '50%',
    marginLeft: -55,
    width: 110,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0B0C0E',
  },

  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -67,
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(20,22,27,0.85)',
  },
});
