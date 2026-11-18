import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Note, formatDateTime } from './domain';
import { C, NUM, S, T } from './theme';
import { Btn, Dialog, Sheet } from './ui';

export function Drawer({
  visible,
  notes,
  onClose,
  onAdd,
  onDelete,
}: {
  visible: boolean;
  notes: Note[];
  onClose: () => void;
  onAdd: (text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  return (
    <Sheet visible={visible} onClose={onClose} height={620}>
      <Text style={styles.title}>给自己</Text>
      <Text style={styles.sub}>只在本机，换机即消失</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {notes.length === 0 ? (
          <Text style={styles.empty}>还没有。切到「给自己」写一句。</Text>
        ) : (
          notes.map((n) => (
            <Pressable key={n.id} onLongPress={() => onDelete(n.id)} style={styles.note}>
              <Text style={styles.noteDate}>{formatDateTime(n.at)}</Text>
              <Text style={styles.noteText}>{n.text}</Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="写一句只给自己看的话"
          placeholderTextColor={C.text3}
          style={styles.input}
          multiline
        />
        <Pressable
          onPress={() => {
            if (!canSend) return;
            onAdd(text.trim());
            setText('');
          }}
          disabled={!canSend}
          style={[styles.send, !canSend && { opacity: 0.4 }]}
        >
          <Text style={styles.sendGlyph}>↑</Text>
        </Pressable>
      </View>
    </Sheet>
  );
}

export function KeepConfirm({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog visible={visible} onClose={onCancel} width={340}>
      <Text style={styles.dialogTitle}>留下这张照片</Text>

      <View style={styles.rules}>
        {[
          '留下就是永久',
          '相册是你们两个人共同的内容',
          '之后只能从我这边隐藏，不能单方删除',
        ].map((rule, i) => (
          <View key={rule} style={styles.rule}>
            <Text style={styles.ruleNo}>{i + 1}</Text>
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      <View style={styles.buttons}>
        <Btn label="再想想" tone="muted" onPress={onCancel} style={{ flex: 1 }} />
        <Btn label="留下" tone="rose" onPress={onConfirm} style={{ flex: 1 }} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  title: { ...T.section, color: C.text, marginTop: 6 },
  sub: { ...T.caption, color: C.text3, marginTop: 4 },
  list: { flex: 1, marginTop: 16 },
  listContent: { gap: 18, paddingBottom: 12 },
  empty: { ...T.label, color: C.text3, marginTop: 8 },
  note: { gap: 4 },
  noteDate: { ...T.caption, color: C.text3, ...NUM },
  noteText: { ...T.body, color: C.text },

  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...T.body,
    color: C.text,
  },
  send: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  sendGlyph: { color: C.white, fontSize: 16, fontWeight: '700', marginTop: -1 },

  dialogTitle: { ...T.name, color: C.text },
  rules: { marginTop: 14, gap: 12 },
  rule: { flexDirection: 'row', gap: 8 },
  ruleNo: { ...T.caption, color: C.text3, width: 12, ...NUM },
  ruleText: { ...T.meta, color: C.text, flex: 1 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
