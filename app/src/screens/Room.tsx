import React, { Dispatch, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Action,
  Msg,
  Room as RoomState,
  User,
  buildFeed,
  dayKey,
  formatDate,
  formatDateTime,
  formatTime,
  sameDay,
  talkActive,
} from '../domain';
import { C, NUM, R, S, SHADOW, T } from '../theme';
import { Icon, PhotoBlock, Segmented } from '../ui';

type Mode = 'to' | 'self';

export default function Room({
  room,
  viewer,
  now,
  offsetDays,
  dispatch,
  onMe,
  onAlbum,
  onDrawer,
  onKeep,
  onViewer,
  onTime,
  toast,
}: {
  room: RoomState;
  viewer: User;
  now: number;
  offsetDays: number;
  dispatch: Dispatch<Action>;
  onMe: () => void;
  onAlbum: () => void;
  onDrawer: () => void;
  onKeep: (msg: Msg) => void;
  onViewer: () => void;
  onTime: () => void;
  toast: (t: string) => void;
}) {
  const [mode, setMode] = useState<Mode>('to');
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const feedRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const feed = useMemo(() => buildFeed(room), [room]);
  const talk = talkActive(room, now);
  const talking = !!talk?.talking;
  const bothPressed = !!talk && talk.pressed.A && talk.pressed.B;
  const myAnswered = !!talk?.answers[viewer];
  const bothAnswered = !!(talk?.answers.A && talk?.answers.B);
  const myStop = room.stop?.by === viewer;
  const otherStop = room.stop && room.stop.by !== viewer;

  const kept = useMemo(() => new Set(room.album.map((a) => a.photo.id)), [room.album]);
  const canSend = input.trim().length > 0;

  function send() {
    const text = input.trim();
    if (!text) return;
    if (mode === 'self') {
      dispatch({ type: 'noteAdd', text, now });
      setInput('');
      toast('放进抽屉了');
      return;
    }
    dispatch({ type: 'send', user: viewer, text, now });
    setInput('');
  }

  function pressTalk() {
    if (talk?.pressed[viewer]) {
      toast(bothPressed ? '在聊了' : '已记下');
      return;
    }
    dispatch({ type: 'talkPress', user: viewer, now });
    toast(bothPressed ? '两个人都按了' : '已记下');
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable onPress={onMe} hitSlop={10} style={styles.meBtn}>
            <Icon name="door" size={16} color={C.accent} weight={1.6} />
          </Pressable>
          <View style={styles.actions}>
            <Pressable onPress={pressTalk} hitSlop={10} style={styles.iconBtn}>
              <Icon name="talk" size={15} />
              {talk && !bothPressed ? <View style={styles.talkDot} /> : null}
            </Pressable>
            <Pressable
              onPress={() => {
                if (room.stop) {
                  toast(myStop ? '再发一句，房间就亮了' : '对方按下了停');
                  return;
                }
                dispatch({ type: 'stop', user: viewer, now });
                toast('房间暗了');
              }}
              hitSlop={10}
              style={styles.iconBtn}
            >
              <Icon name="pause" size={15} />
            </Pressable>
            <Pressable onPress={onDrawer} hitSlop={10} style={styles.iconBtn}>
              <Icon name="drawer" size={15} />
            </Pressable>
            <Pressable onPress={onAlbum} hitSlop={10} style={styles.iconBtn}>
              <Icon name="album" size={15} />
            </Pressable>
          </View>
        </View>
        <Text style={styles.title}>我们的房间</Text>
      </View>

      {otherStop ? (
        <View style={styles.stopBanner}>
          <Text style={styles.stopBannerTitle}>{room.stop?.line || '今晚到这儿'}</Text>
          <Text style={styles.stopBannerSub}>对方按下了停 · 你的消息 TA 照常收到</Text>
        </View>
      ) : null}

      <ScrollView
        ref={feedRef}
        style={styles.feed}
        contentContainerStyle={styles.feedContent}
        onContentSizeChange={() => feedRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {feed.length === 0 && !talking ? (
          <View style={styles.empty}>
            <View style={styles.emptyLogo}>
              <Icon name="door" size={22} color={C.accent} weight={1.5} />
            </View>
            <Text style={styles.emptyTitle}>不用做什么</Text>
            {!room.members.B ? <Text style={styles.emptySub}>这儿还只有你</Text> : null}
          </View>
        ) : null}

        {feed.map((item, index) => {
          if (item.kind === 'trace') {
            return (
              <View key={`trace-${item.key}`} style={styles.trace}>
                <View style={styles.traceLine} />
                <View style={styles.traceTick} />
                <Text style={styles.traceText}>{item.text}</Text>
                <View style={styles.traceTick} />
                <View style={styles.traceLine} />
              </View>
            );
          }

          const m = item.msg;
          const mine = m.from === viewer;
          const prev = feed[index - 1];
          const showDay = !prev || dayKey(prev.at) !== dayKey(m.at);
          const dayLabel = sameDay(m.at, now) ? '今天' : formatDate(m.at);

          return (
            <React.Fragment key={m.id}>
              {showDay ? <Text style={styles.day}>{dayLabel}</Text> : null}
              <View style={[styles.msgRow, mine ? styles.msgRowMine : styles.msgRowTheirs]}>
                <View style={styles.msgCol}>
                  {m.kind === 'text' ? (
                    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                      <Text style={[styles.msgText, mine && styles.msgTextMine]}>{m.text}</Text>
                    </View>
                  ) : null}

                  {m.kind === 'photo' && m.photo ? (
                    <View style={styles.photoCard}>
                      <PhotoBlock hue={m.photo.hue} label={m.photo.place} style={{ width: 220, height: 164 }} />
                      <View style={styles.photoFoot}>
                        <Text style={styles.photoCaption} numberOfLines={1}>
                          {formatDateTime(m.at)} {m.photo.place}
                        </Text>
                        {kept.has(m.photo.id) ? (
                          <Text style={styles.kept}>已留</Text>
                        ) : (
                          <Pressable onPress={() => onKeep(m)} hitSlop={8} style={styles.keepHit}>
                            <Text style={styles.keep}>留</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ) : null}

                  {m.kind === 'voice' ? (
                    <View style={styles.voiceCard}>
                      <View style={styles.voicePlay}>
                        <Icon name="play" size={11} color={C.blue} />
                      </View>
                      <View style={styles.wave}>
                        {[6, 12, 8, 16, 10, 14, 7, 13, 9, 15, 6, 11, 8, 14, 10].map((h, i) => (
                          <View key={i} style={[styles.waveBar, { height: h }]} />
                        ))}
                      </View>
                      <Text style={styles.voiceSec}>{`0:${String(m.voiceSec ?? 0).padStart(2, '0')}`}</Text>
                    </View>
                  ) : null}

                  <View style={[styles.metaRow, mine ? { justifyContent: 'flex-end' } : null]}>
                    {mine && now - m.at <= 2 * 60_000 ? (
                      <Pressable
                        onPress={() => {
                          dispatch({ type: 'recall', msgId: m.id, user: viewer, now });
                          toast('撤回了');
                        }}
                        hitSlop={6}
                      >
                        <Text style={styles.recall}>撤回</Text>
                      </Pressable>
                    ) : null}
                    <Text style={styles.meta}>{formatTime(m.at)}</Text>
                  </View>
                </View>
              </View>
            </React.Fragment>
          );
        })}

        {talking && talk ? (
          <View style={styles.talkCard}>
            <View style={styles.talkHead}>
              <Icon name="talk" size={13} color={C.amber} weight={1.6} />
              <Text style={styles.talkTag}>想聊</Text>
            </View>
            <Text style={styles.talkQ}>刚才最让你难受的是哪一句？</Text>

            {(['A', 'B'] as User[]).map((u) =>
              talk.answers[u] ? (
                <View key={u} style={styles.answerRow}>
                  <Text style={[styles.whoChip, u === 'A' ? styles.whoA : styles.whoB]}>{u === viewer ? '你' : 'TA'}</Text>
                  <Text style={styles.answerText}>{talk.answers[u]}</Text>
                </View>
              ) : null
            )}

            {bothAnswered ? (
              <View style={styles.reflectBox}>
                <View style={styles.divider} />
                <Text style={styles.reflectLabel}>AI 复述</Text>
                <Text style={styles.reflect}>
                  {`${talk.answers.A ? '你' : 'TA'}说了「${(talk.answers.A ?? '').slice(0, 18)}」，${talk.answers.B ? '对方' : '你'}说了「${(talk.answers.B ?? '').slice(0, 18)}」。你们都在意对方，只是那晚谁都没有先说完。`}
                </Text>
                <Pressable
                  onPress={() => {
                    dispatch({ type: 'talkDismiss', now });
                    toast('收起来了');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.talkDismiss}>收起来</Text>
                </Pressable>
              </View>
            ) : myAnswered ? (
              <Text style={styles.talkWait}>已答。等对方一句。</Text>
            ) : (
              <View style={styles.answerInputRow}>
                <TextInput
                  value={answer}
                  onChangeText={setAnswer}
                  placeholder="各答一句…"
                  placeholderTextColor={C.text3}
                  style={styles.answerInput}
                  multiline
                />
                <Pressable
                  onPress={() => {
                    if (!answer.trim()) return;
                    dispatch({ type: 'talkAnswer', user: viewer, text: answer, now });
                    setAnswer('');
                  }}
                  style={[styles.answerBtn, !answer.trim() && { opacity: 0.4 }]}
                >
                  <Text style={styles.answerBtnText}>答一句</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <Segmented
          options={[
            { value: 'to', label: '给对方' },
            { value: 'self', label: '给自己' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <View style={styles.inputRow}>
          <Pressable style={styles.photoBtn} hitSlop={8}>
            <Icon name="image" size={16} color={C.text2} weight={1.4} />
          </Pressable>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={mode === 'self' ? '写一句只给自己看的话' : '说点什么'}
            placeholderTextColor={C.text3}
            style={styles.input}
            multiline
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={!canSend}
            style={[styles.send, { backgroundColor: mode === 'self' ? C.accent : C.blue }, !canSend && { opacity: 0.4 }]}
          >
            <Text style={styles.sendGlyph}>↑</Text>
          </Pressable>
        </View>

        <View style={styles.debugRow}>
          <Pressable onPress={onViewer} hitSlop={6} style={styles.debugChip}>
            <Text style={styles.debugText}>视角 {viewer === 'A' ? '你' : 'TA'}</Text>
          </Pressable>
          <Pressable onPress={onTime} hitSlop={6} style={styles.debugChip}>
            <Text style={styles.debugText}>时间 {offsetDays === 0 ? '现在' : `+${offsetDays} 天`}</Text>
          </Pressable>
          <View style={{ flex: 1 }} />
          <Text style={styles.debugHint}>{myStop ? '停着' : '话七天后消失'}</Text>
        </View>
      </View>

      {myStop ? (
        <View style={styles.paused}>
          <View style={styles.pausedPanel}>
            <TextInput
              value={room.stop?.line ?? ''}
              onChangeText={(line) => dispatch({ type: 'stopLine', user: viewer, line })}
              placeholder="今晚到这儿"
              placeholderTextColor="rgba(243,238,230,0.5)"
              style={styles.pausedTitle}
              textAlign="center"
            />
            <Text style={styles.pausedSub}>只有你能重新点亮</Text>
            <Pressable
              onPress={() => {
                dispatch({ type: 'relight', user: viewer, now });
                toast('房间亮了');
              }}
              style={styles.relight}
            >
              <Text style={styles.relightText}>点亮房间</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.surface },
  header: {
    paddingHorizontal: S.page,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  headerRow: { height: 44, flexDirection: 'row', alignItems: 'center' },
  meBtn: {
    width: 34,
    height: 34,
    borderRadius: R.icon,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', marginLeft: 'auto', gap: 6 },
  iconBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  talkDot: { position: 'absolute', top: 6, right: 7, width: 6, height: 6, borderRadius: 3, backgroundColor: C.amber },
  title: { ...T.roomTitle, color: C.text, marginTop: 4 },

  stopBanner: {
    paddingHorizontal: S.page,
    paddingVertical: 10,
    backgroundColor: C.amberSoft,
  },
  stopBannerTitle: { ...T.body, color: C.text, fontWeight: '600' },
  stopBannerSub: { ...T.caption, color: C.text2, marginTop: 2 },

  feed: { flex: 1 },
  feedContent: { padding: S.page, paddingBottom: 20, gap: 10 },

  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 120, gap: 10 },
  emptyLogo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: { ...T.body, color: C.text2 },
  emptySub: { ...T.label, color: C.text3 },

  day: { ...T.caption, color: C.text3, textAlign: 'center', marginTop: 8, marginBottom: 2 },

  trace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 6 },
  traceLine: { width: 42, height: StyleSheet.hairlineWidth, backgroundColor: C.traceLine },
  traceTick: { width: 3, height: 8, backgroundColor: C.traceLine },
  traceText: { ...T.caption, color: C.text3, ...NUM },

  msgRow: { flexDirection: 'row' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgRowTheirs: { justifyContent: 'flex-start' },
  msgCol: { maxWidth: '82%' },

  bubble: { borderRadius: R.bubble, paddingHorizontal: 12, paddingVertical: 10 },
  bubbleTheirs: { backgroundColor: C.card, borderTopLeftRadius: 4, ...SHADOW.card },
  bubbleMine: { backgroundColor: C.blue, borderTopRightRadius: 4 },
  msgText: { ...T.body, color: C.text },
  msgTextMine: { color: C.white },

  photoCard: {
    backgroundColor: C.card,
    borderRadius: R.card,
    padding: 8,
    gap: 8,
    ...SHADOW.card,
  },
  photoFoot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 2 },
  photoCaption: { ...T.caption, color: C.text3, flex: 1, ...NUM },
  keep: { ...T.label, color: C.blue, fontWeight: '600' },
  keepHit: { paddingHorizontal: 2 },
  kept: { ...T.label, color: C.text3 },

  voiceCard: {
    width: 190,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.card,
    borderRadius: R.bubble,
    borderTopLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    ...SHADOW.card,
  },
  voicePlay: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  wave: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1 },
  waveBar: { width: 2, borderRadius: 1, backgroundColor: C.wave },
  voiceSec: { ...T.caption, color: C.text2, ...NUM },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  recall: { ...T.caption, color: C.text3 },
  meta: { ...T.caption, color: C.text3, ...NUM },

  talkCard: {
    backgroundColor: C.card,
    borderRadius: R.card,
    padding: 14,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    ...SHADOW.card,
  },
  talkHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  talkTag: { ...T.label, color: C.amber, fontWeight: '600' },
  talkQ: { ...T.bodyStrong, color: C.text },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  whoChip: {
    ...T.caption,
    color: C.white,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  whoA: { backgroundColor: C.blue },
  whoB: { backgroundColor: C.bubbleTheirsAlt },
  answerText: { ...T.meta, color: C.text2, flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: C.divider, marginVertical: 8 },
  reflectBox: { gap: 6 },
  reflectLabel: { ...T.caption, color: C.accent },
  reflect: { ...T.meta, color: C.text2 },
  talkDismiss: { ...T.label, color: C.text3, marginTop: 2 },
  talkWait: { ...T.label, color: C.text3 },
  answerInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  answerInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    ...T.meta,
    color: C.text,
  },
  answerBtn: { backgroundColor: C.accentSoft, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  answerBtnText: { ...T.label, color: C.accent, fontWeight: '600' },

  composer: {
    backgroundColor: C.card,
    paddingHorizontal: S.page,
    paddingTop: 10,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.hairline,
    ...SHADOW.bar,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  photoBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 96,
    paddingHorizontal: 4,
    paddingVertical: 8,
    ...T.body,
    color: C.text,
  },
  send: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sendGlyph: { color: C.white, fontSize: 17, fontWeight: '700', marginTop: -1 },

  debugRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  debugChip: { backgroundColor: C.track, borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 3 },
  debugText: { ...T.caption, color: C.text2 },
  debugHint: { ...T.caption, color: C.text3 },

  paused: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(20,22,27,0.86)', alignItems: 'center', justifyContent: 'center' },
  pausedPanel: {
    width: 300,
    backgroundColor: C.darkPanel,
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  pausedTitle: { ...T.section, color: '#F3EEE6', textAlign: 'center', width: '100%', paddingVertical: 2 },
  pausedSub: { ...T.caption, color: 'rgba(243,238,230,0.6)' },
  relight: { marginTop: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  relightText: { ...T.label, color: '#F3EEE6', fontWeight: '600' },
});
