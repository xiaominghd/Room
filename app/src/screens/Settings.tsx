import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Room as RoomState, Scope, User, formatDate, nameOf, otherOf } from '../domain';
import { C, NUM, R, S, T } from '../theme';
import { BackBar, Btn, Card, Dialog, Icon, IconTile, Page, Row, Toggle } from '../ui';

/* ------------------------------------------------------------------ */
/* 我的                                                                */
/* ------------------------------------------------------------------ */

export function Me({
  room,
  viewer,
  onBack,
  onProfile,
  onExport,
  onRecovery,
  onAbout,
  onInvite,
  onNotify,
}: {
  room: RoomState;
  viewer: User;
  onBack: () => void;
  onProfile: () => void;
  onExport: () => void;
  onRecovery: () => void;
  onAbout: () => void;
  onInvite: () => void;
  onNotify: (on: boolean) => void;
}) {
  const me = nameOf(room, viewer);
  const other = nameOf(room, otherOf(viewer));

  return (
    <Page background={C.surfaceMine}>
      <BackBar onBack={onBack} title="我的" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={onProfile}>
          <Card style={styles.profileCard}>
            <View style={styles.avatar}>
              <Icon name="door" size={22} color={C.accent} weight={1.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{me}</Text>
              <Text style={styles.profileSub}>和 {other} 在同一个房间</Text>
            </View>
            <Icon name="chevron" size={14} color={C.text3} />
          </Card>
        </Pressable>

        <Card style={styles.group}>
          <Row
            left={
              <IconTile bg={C.surfaceMine}>
                <Icon name="bell" size={16} color={C.text2} />
              </IconTile>
            }
            title="通知"
            desc="只推新消息，锁屏不显示内容"
            right={<Toggle value={room.notify} onChange={onNotify} active={C.blue} />}
          />
          <Row
            left={
              <IconTile bg={C.blueSoft}>
                <Icon name="download" size={16} color={C.blue} />
              </IconTile>
            }
            title="导出"
            desc="随时导出，并保留本地副本"
            right={<Icon name="chevron" size={14} color={C.text3} />}
            onPress={onExport}
          />
          <Row
            last
            left={
              <IconTile bg={C.amberSoft}>
                <Icon name="key" size={16} color={C.amber} />
              </IconTile>
            }
            title="恢复码"
            desc="忘记密码时用它来找回"
            right={<Icon name="chevron" size={14} color={C.text3} />}
            onPress={onRecovery}
          />
        </Card>

        <Card style={styles.group}>
          <Row
            last
            left={
              <IconTile bg={C.surfaceMine}>
                <Icon name="info" size={16} color={C.text2} />
              </IconTile>
            }
            title="这个房间怎么运转"
            desc="服务器、AI 读什么、怎么关"
            right={<Icon name="chevron" size={14} color={C.text3} />}
            onPress={onAbout}
          />
        </Card>

        <Text style={styles.footer}>话七天后消失，留下的才进相册</Text>
        <Pressable onPress={onInvite} hitSlop={8} style={styles.demoLink}>
          <Text style={styles.demoText}>演示：邀请码</Text>
        </Pressable>
      </ScrollView>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 个人资料                                                            */
/* ------------------------------------------------------------------ */

export function Profile({
  room,
  viewer,
  onBack,
  onRename,
}: {
  room: RoomState;
  viewer: User;
  onBack: () => void;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nameOf(room, viewer));
  const me = nameOf(room, viewer);
  const other = nameOf(room, otherOf(viewer));

  return (
    <Page>
      <BackBar onBack={onBack} title="个人资料" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Icon name="door" size={22} color={C.accent} weight={1.5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{me}</Text>
            <Text style={styles.profileSub}>和 {other} 在同一个房间</Text>
          </View>
          <Pressable onPress={() => { setDraft(me); setEditing(true); }} hitSlop={8}>
            <Text style={styles.change}>更换</Text>
          </Pressable>
        </Card>

        <Card style={styles.group}>
          {[
            ['昵称', me],
            ['房间里的称呼', me],
            ['房间', `和 ${other}`],
            ['加入时间', formatDate(room.profile.joinedAt)],
          ].map(([label, value], i, arr) => (
            <View key={label} style={[styles.formRow, i < arr.length - 1 && styles.formDivider]}>
              <Text style={styles.formLabel}>{label}</Text>
              <Text style={styles.formValue}>{value}</Text>
            </View>
          ))}
        </Card>

        <Text style={styles.footer}>称呼只在这个房间里显示</Text>
      </ScrollView>

      <Dialog visible={editing} onClose={() => setEditing(false)} width={300}>
        <Text style={styles.dialogTitle}>改一个称呼</Text>
        <Text style={styles.dialogSub}>只在这个房间里显示，不会同步到别处。</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          autoFocus
          maxLength={12}
          placeholder="称呼"
          placeholderTextColor={C.text3}
          style={styles.dialogInput}
        />
        <View style={styles.dialogRow}>
          <Btn label="算了" tone="muted" onPress={() => setEditing(false)} style={{ flex: 1 }} />
          <Btn
            label="保存"
            onPress={() => {
              onRename(draft);
              setEditing(false);
            }}
            style={{ flex: 1 }}
          />
        </View>
      </Dialog>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 导出                                                                */
/* ------------------------------------------------------------------ */

export function Export({
  room,
  onBack,
  onScope,
  onFormat,
  onRun,
}: {
  room: RoomState;
  onBack: () => void;
  onScope: (s: Scope) => void;
  onFormat: (f: 'pdf' | 'text') => void;
  onRun: () => void;
}) {
  const { scope, format, lastExportAt } = room.exportPrefs;
  const scopes: { value: Scope; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: '30', label: '近 30 天' },
    { value: '7', label: '近 7 天' },
  ];

  return (
    <Page>
      <BackBar onBack={onBack} title="导出" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>范围</Text>
        <View style={styles.chipRow}>
          {scopes.map((s) => {
            const on = s.value === scope;
            return (
              <Pressable key={s.value} onPress={() => onScope(s.value)} style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Card style={styles.group}>
          <Row
            title="PDF 纪念册"
            desc="带照片排版，适合留着看"
            right={<Radio on={format === 'pdf'} />}
            onPress={() => onFormat('pdf')}
          />
          <Row
            last
            title="纯文本"
            desc="方便搜索和备份"
            right={<Radio on={format === 'text'} />}
            onPress={() => onFormat('text')}
          />
        </Card>

        <View style={styles.noteRow}>
          <View style={styles.noteDot} />
          <Text style={styles.note}>导出时，对方会收到一条提示</Text>
        </View>

        {lastExportAt ? <Text style={styles.success}>已生成，对方已收到提示</Text> : null}

        <Btn label="生成导出文件" tone="blue" onPress={onRun} style={{ marginTop: 10 }} />
        <Text style={styles.footerLeft}>导出的是你的这份副本，照片原图一并打包</Text>
      </ScrollView>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 恢复码                                                              */
/* ------------------------------------------------------------------ */

export function Recovery({ room, onBack }: { room: RoomState; onBack: () => void }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 3000);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Page>
      <BackBar onBack={onBack} title="恢复码" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>你的恢复码</Text>
          <Text style={styles.code}>{room.recoveryCode}</Text>
        </View>

        <Btn
          label={copied ? '已复制' : '复制'}
          tone="ink"
          onPress={() => {
            // demo：剪贴板未接；这里只走「复制成功」的状态边界。
            // 真机接 expo-clipboard 后把失败分支接到 catch。
            try {
              setFailed(false);
              setCopied(true);
            } catch {
              setFailed(true);
            }
          }}
        />
        {copied ? <Text style={styles.copied}>已复制，去收好它</Text> : null}
        {failed ? <Text style={styles.failed}>没复制上，再试一次</Text> : null}

        <View style={styles.bullets}>
          {['忘记密码时，这是唯一的找回方式', '不要截图留在相册里', '抄在纸上，放在只有你知道的地方'].map((t) => (
            <View key={t} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bullet}>{t}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.footerLeft}>我们也看不到这串码，丢了就真的丢了</Text>
      </ScrollView>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* 运转说明                                                            */
/* ------------------------------------------------------------------ */

const ABOUT: [string, string][] = [
  ['七天', '消息只留七天。到期从服务器删除，我们也找不回来。'],
  ['服务器', '只存这个房间的内容，不做推荐，不给任何人看。'],
  ['AI 读什么', '只有点「想聊」时才读最近这段对话，生成一张卡片，不留存、不他用。'],
  ['怎么关掉', '想离开时，先在「我的」里导出，再删除房间，两边同时清空。'],
];

export function About({ onBack }: { onBack: () => void }) {
  return (
    <Page>
      <BackBar onBack={onBack} title="这个房间怎么运转" />
      <ScrollView contentContainerStyle={styles.content}>
        {ABOUT.map(([title, body]) => (
          <View key={title} style={styles.aboutBlock}>
            <View style={styles.aboutHead}>
              <View style={styles.aboutDot} />
              <Text style={styles.aboutTitle}>{title}</Text>
            </View>
            <Text style={styles.aboutBody}>{body}</Text>
          </View>
        ))}
        <Text style={styles.footerLeft}>这一页随时可以从「我的」里再看</Text>
      </ScrollView>
    </Page>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <View style={[styles.radio, on && styles.radioOn]}>
      {on ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  content: { paddingHorizontal: S.page, paddingTop: 16, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.gap,
    padding: S.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: C.surfaceMine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: { ...T.name, color: C.text },
  profileSub: { ...T.label, color: C.text2, marginTop: 3 },
  change: { ...T.label, color: C.text2 },

  group: { marginTop: 12, paddingVertical: 0 },
  footer: { ...T.caption, color: C.text3, textAlign: 'center', marginTop: 22 },
  footerLeft: { ...T.caption, color: C.text3, marginTop: 14 },
  demoLink: { alignSelf: 'center', marginTop: 14 },
  demoText: { ...T.caption, color: C.text3, textDecorationLine: 'underline' },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: S.card,
    height: 57,
  },
  formDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider },
  formLabel: { ...T.body, color: C.text2 },
  formValue: { ...T.body, color: C.text, ...NUM },

  dialogTitle: { ...T.name, color: C.text },
  dialogSub: { ...T.label, color: C.text3, marginTop: 4 },
  dialogInput: {
    marginTop: 14,
    backgroundColor: C.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    ...T.body,
    color: C.text,
  },
  dialogRow: { flexDirection: 'row', gap: 10, marginTop: 16 },

  sectionLabel: { ...T.meta, color: C.text2, marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  chip: { borderRadius: R.pill, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: 'transparent' },
  chipOn: { backgroundColor: C.card },
  chipText: { ...T.meta, color: C.text2 },
  chipTextOn: { color: C.text, fontWeight: '600' },

  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 4 },
  noteDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.amber },
  note: { ...T.meta, color: C.text2 },
  success: { ...T.label, color: C.accent, marginTop: 14, marginBottom: 2 },

  codeCard: {
    backgroundColor: C.amberSoft,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    marginBottom: 14,
  },
  codeLabel: { ...T.label, color: C.text2 },
  code: { ...T.display, fontSize: 26, letterSpacing: 1.4, color: C.text, ...NUM },
  copied: { ...T.label, color: C.accent, marginTop: 10, textAlign: 'center' },
  failed: { ...T.label, color: C.rose, marginTop: 10, textAlign: 'center' },
  bullets: { marginTop: 22, gap: 12, paddingHorizontal: 4 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bulletDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.amber },
  bullet: { ...T.meta, color: C.text2 },

  aboutBlock: { marginBottom: 26 },
  aboutHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aboutDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent },
  aboutTitle: { ...T.bodyStrong, color: C.text },
  aboutBody: { ...T.meta, color: C.text2, marginTop: 8, paddingLeft: 16 },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.toggleOff,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: C.blue },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue },
});
