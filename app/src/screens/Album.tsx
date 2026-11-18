import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlbumItem, Room as RoomState, User, formatDate, visibleAlbum } from '../domain';
import { C, NUM, S, T } from '../theme';
import { BackBar, Page, PhotoBlock } from '../ui';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

export default function Album({
  room,
  viewer,
  onBack,
  onOpen,
}: {
  room: RoomState;
  viewer: User;
  onBack: () => void;
  onOpen: (item: AlbumItem) => void;
}) {
  const months = useMemo(() => {
    const items = visibleAlbum(room, viewer);
    const map = new Map<string, { year: number; month: number; list: AlbumItem[] }>();
    for (const it of items) {
      const d = new Date(it.at);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const hit = map.get(key);
      if (hit) hit.list.push(it);
      else map.set(key, { year: d.getFullYear(), month: d.getMonth(), list: [it] });
    }
    return Array.from(map.values()).sort((a, b) => b.year - a.year || b.month - a.month);
  }, [room, viewer]);

  return (
    <Page>
      <BackBar onBack={onBack} title="相册" />
      {months.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.empty}>还没有照片</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {months.map(({ year, month, list }) => {
            const first = new Date(year, month, 1).getDay();
            const offset = (first + 6) % 7; // 周一开头
            const days = new Date(year, month + 1, 0).getDate();
            const cells: (number | null)[] = [];
            for (let i = 0; i < offset; i += 1) cells.push(null);
            for (let d = 1; d <= days; d += 1) cells.push(d);

            return (
              <View key={`${year}-${month}`} style={styles.month}>
                <Text style={styles.monthName}>
                  {year} 年 {month + 1} 月
                </Text>
                <View style={styles.weekRow}>
                  {WEEK.map((w) => (
                    <Text key={w} style={styles.weekText}>
                      {w}
                    </Text>
                  ))}
                </View>
                <View style={styles.grid}>
                  {cells.map((day, i) => {
                    if (day === null) return <View key={`b-${i}`} style={styles.cell} />;
                    const item = list.find((it) => new Date(it.at).getDate() === day);
                    return (
                      <View key={`d-${i}`} style={styles.cell}>
                        {item ? (
                          <Pressable style={styles.cellInner} onPress={() => onOpen(item)}>
                            <PhotoBlock hue={item.photo.hue} showLabel={false} style={styles.thumb} radius={8} />
                            <Text style={[styles.dayNum, styles.dayNumOn]}>{day}</Text>
                          </Pressable>
                        ) : (
                          <Text style={styles.dayNum}>{day}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: S.page, paddingTop: 20, paddingBottom: 40 },
  month: { marginBottom: 26 },
  monthName: { ...T.section, color: C.text, marginBottom: 10 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekText: { ...T.micro, color: C.text3, width: '14.2857%', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', aspectRatio: 1, padding: 2 },
  cellInner: { flex: 1 },
  thumb: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  dayNum: { ...T.micro, color: C.text3, position: 'absolute', top: 5, left: 6, ...NUM },
  dayNumOn: { color: C.white, fontWeight: '600' },
  emptyWrap: { flex: 1, alignItems: 'center', paddingTop: 160 },
  empty: { ...T.meta, color: C.text3 },
});
