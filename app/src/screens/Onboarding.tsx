import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { INVITE_CODE, Room as RoomState } from '../domain';
import { C, FONT_SERIF, R, S, T } from '../theme';
import { Btn, Icon, Page } from '../ui';

export function Launch({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <Page enterFrom={0}>
      <Pressable style={styles.launch} onPress={onDone}>
        <View style={styles.launchLogo}>
          <Icon name="door" size={40} color={C.accent} weight={2} />
        </View>
        <Text style={styles.launchTitle}>房间</Text>
        <Text style={styles.launchSub}>一个会忘的房间，一个不会忘的相册</Text>
        <View style={styles.launchDot} />
      </Pressable>
    </Page>
  );
}

export function Invite({
  room,
  onEnter,
}: {
  room: RoomState;
  onEnter: () => void;
}) {
  const [code, setCode] = useState('K7Q');
  const [error, setError] = useState(false);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const full = room.invite.seats >= room.invite.limit;
  const cells = [0, 1, 2, 3].map((i) => code[i] ?? '');

  function submit() {
    if (full) return;
    if (code.trim().toUpperCase() === INVITE_CODE) onEnter();
    else setError(true);
  }

  return (
    <Page enterFrom={0}>
      <View style={styles.invite}>
        <View style={styles.inviteLogo}>
          <Icon name="door" size={24} color={C.accent} weight={1.7} />
        </View>

        <Text style={styles.inviteTitle}>有人给你留了一个房间</Text>
        <Text style={styles.inviteSub}>这个房间只住两个人。输入邀请码进来。</Text>

        <Pressable style={styles.codeRow} onPress={() => inputRef.current?.focus()}>
          {cells.map((ch, i) => {
            const active = !full && i === Math.min(code.length, 3);
            return (
              <View key={i} style={[styles.codeCell, error && styles.codeCellError, active && styles.codeCellActive]}>
                <Text style={styles.codeChar}>{ch}</Text>
                {active && ch === '' ? <View style={styles.caret} /> : null}
              </View>
            );
          })}
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(v) => {
              setError(false);
              setCode(v.toUpperCase().slice(0, 4));
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={4}
            style={styles.hiddenInput}
          />
        </Pressable>

        <View style={styles.hintRow}>
          <Icon name="server" size={12} color={C.text3} weight={1.2} />
          <Text style={styles.hint}>这个邀请指向 room.lichen.example</Text>
        </View>

        {error ? <Text style={styles.error}>邀请码不对，再对一下</Text> : null}

        <Btn label="进入房间" onPress={submit} disabled={full} style={{ marginTop: 16 }} />

        <Text style={styles.fine}>
          {full
            ? '这个房间已经满了。'
            : '一个邀请码只能注册两个人。进来之后，用户名、密码和恢复码由你自己设。'}
        </Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  launch: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  launchLogo: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  launchTitle: { fontFamily: FONT_SERIF, fontSize: 22, fontWeight: '600', color: C.text, letterSpacing: 2 },
  launchSub: { ...T.label, color: C.text3, marginTop: 10 },
  launchDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent, marginTop: 60 },

  invite: { flex: 1, paddingHorizontal: S.page, paddingTop: 40 },
  inviteLogo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 26,
  },
  inviteTitle: { ...T.display, color: C.text },
  inviteSub: { ...T.meta, color: C.text2, marginTop: 8 },

  codeRow: { flexDirection: 'row', gap: 12, marginTop: 34 },
  codeCell: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  codeCellActive: { borderColor: C.accent },
  codeCellError: { borderColor: C.rose },
  codeChar: { ...T.display, color: C.text },
  caret: { width: 2, height: 24, backgroundColor: C.accent, position: 'absolute' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },

  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  hint: { ...T.label, color: C.text3 },
  error: { ...T.label, color: C.rose, marginTop: 10 },

  fine: { ...T.label, color: C.text3, marginTop: 14, lineHeight: 19 },
});
