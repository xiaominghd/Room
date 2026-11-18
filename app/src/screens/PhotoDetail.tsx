import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlbumItem, Room as RoomState, formatDateTime, footnoteSummary } from '../domain';
import { C, NUM, S, T } from '../theme';
import { Icon, Page, PhotoBlock, Toggle } from '../ui';

export default function PhotoDetail({
  item,
  room,
  onBack,
  onToggleFootnote,
  onHide,
}: {
  item: AlbumItem;
  room: RoomState;
  onBack: () => void;
  onToggleFootnote: (on: boolean) => void;
  onHide: () => void;
}) {
  return (
    <Page background={C.dim}>
      <View style={styles.top}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.round}>
          <Icon name="back" size={16} color={C.white} weight={1.8} />
        </Pressable>
      </View>

      <PhotoBlock hue={item.photo.hue} style={styles.hero} radius={0} />

      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.caption}>
          {formatDateTime(item.at)} {item.place}
        </Text>

        <View style={styles.footnoteHead}>
          <Text style={styles.footnoteTitle}>补一句当时在聊什么</Text>
          <Toggle value={item.footnote} onChange={onToggleFootnote} active={C.accent} />
        </View>
        <Text style={styles.explain}>
          打开后，AI 会读这段即将消散的对话，并把摘要永久留在照片脚注里。
        </Text>

        {item.footnote ? (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>AI 补的</Text>
            <Text style={styles.summaryText}>{footnoteSummary(room, item)}</Text>
          </View>
        ) : null}

        <Pressable onPress={onHide} hitSlop={8} style={styles.hideRow}>
          <Icon name="hide" size={13} color="rgba(255,255,255,0.45)" weight={1.4} />
          <Text style={styles.hide}>从我这边隐藏</Text>
        </Pressable>
        <Text style={styles.hideNote}>相册是你们两个人共同的内容，隐藏只影响你自己。</Text>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: S.page, paddingTop: 8, height: 48, justifyContent: 'center' },
  round: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { width: '100%', height: 380 },
  body: { paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 40 },
  caption: { ...T.label, color: 'rgba(242,243,245,0.7)', ...NUM },
  footnoteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22 },
  footnoteTitle: { ...T.bodyStrong, color: C.white },
  explain: { ...T.caption, color: 'rgba(255,255,255,0.45)', marginTop: 6, maxWidth: 330 },
  summary: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  summaryLabel: { ...T.caption, color: C.accent },
  summaryText: { ...T.meta, color: 'rgba(255,255,255,0.82)' },
  hideRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 32 },
  hide: { ...T.label, color: 'rgba(255,255,255,0.45)' },
  hideNote: { ...T.caption, color: 'rgba(255,255,255,0.28)', marginTop: 6 },
});
