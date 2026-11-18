import React, { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { AlbumItem, DAY, Msg, User, reduce, seed } from './src/domain';
import { Drawer, KeepConfirm } from './src/overlays';
import Album from './src/screens/Album';
import PhotoDetail from './src/screens/PhotoDetail';
import Room from './src/screens/Room';
import { Invite, Launch } from './src/screens/Onboarding';
import { About, Export, Me, Profile, Recovery } from './src/screens/Settings';
import { Btn, Dialog, EnterFrom, Toast } from './src/ui';
import { PhoneShell } from './src/phone';
import { C, S, T } from './src/theme';

type Route = 'launch' | 'invite' | 'room' | 'album' | 'photo' | 'me' | 'profile' | 'export' | 'recovery' | 'about';

const ROUTES: Route[] = ['launch', 'invite', 'room', 'album', 'photo', 'me', 'profile', 'export', 'recovery', 'about'];

/** 网页预览用：?screen=room 直接落到某一屏，方便截图核对。原生端永远从启动页开始。 */
function wantedRoute(): Route | null {
  if (Platform.OS !== 'web') return null;
  const search = (globalThis as { location?: { search?: string } }).location?.search ?? '';
  const wanted = new URLSearchParams(search).get('screen') as Route | null;
  return wanted && ROUTES.includes(wanted) ? wanted : null;
}

export default function App() {
  const initial = React.useMemo(() => seed(), []);
  const [room, dispatch] = useReducer(reduce, initial);
  const [viewer, setViewer] = useState<User>('A');
  const [offsetDays, setOffsetDays] = useState(0);
  const [stack, setStack] = useState<Route[]>(() => [wantedRoute() ?? 'launch']);
  const [dir, setDir] = useState<'f' | 'b'>('f');
  const [drawer, setDrawer] = useState(false);
  const [keepMsg, setKeepMsg] = useState<Msg | null>(null);
  const [photo, setPhoto] = useState<AlbumItem | null>(() => (wantedRoute() === 'photo' ? initial.album[0] : null));
  const [timeOpen, setTimeOpen] = useState(false);
  const [toastText, setToastText] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const route = stack[stack.length - 1];
  const now = Date.now() + offsetDays * DAY;

  const toast = useCallback((text: string) => {
    setToastText(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastText(''), 1600);
  }, []);

  useEffect(() => {
    dispatch({ type: 'tick', now: Date.now() + offsetDays * DAY });
  }, [offsetDays]);

  useEffect(() => {
    const timer = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 30_000);
    return () => clearInterval(timer);
  }, []);

  const push = (r: Route) => {
    setDir('f');
    setStack((s) => [...s, r]);
  };
  const pop = () => {
    setDir('b');
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  };
  const replace = (r: Route) => setStack((s) => [...s.slice(0, -1), r]);

  const dark = route === 'photo';
  const enterFrom = dir === 'b' ? -40 : 320;
  const content = screen();

  function screen() {
    switch (route) {
      case 'launch':
        return <Launch onDone={() => replace('invite')} />;

      case 'invite':
        return (
          <Invite
            room={room}
            onEnter={() => {
              dispatch({ type: 'inviteJoin', user: 'B', now: Date.now() });
              replace('room');
              toast('进来了');
            }}
          />
        );

      case 'room':
        return (
          <Room
            room={room}
            viewer={viewer}
            now={now}
            offsetDays={offsetDays}
            dispatch={dispatch}
            onMe={() => push('me')}
            onAlbum={() => push('album')}
            onDrawer={() => setDrawer(true)}
            onKeep={(m) => setKeepMsg(m)}
            onViewer={() => setViewer((v) => (v === 'A' ? 'B' : 'A'))}
            onTime={() => setTimeOpen(true)}
            toast={toast}
          />
        );

      case 'album':
        return (
          <Album
            room={room}
            viewer={viewer}
            onBack={pop}
            onOpen={(item) => {
              setPhoto(item);
              push('photo');
            }}
          />
        );

      case 'photo':
        return photo ? (
          <PhotoDetail
            item={photo}
            room={room}
            onBack={pop}
            onToggleFootnote={(on) => dispatch({ type: 'footnote', itemId: photo.id, on })}
            onHide={() => {
              dispatch({ type: 'hide', itemId: photo.id, user: viewer });
              pop();
              toast('从你这边隐藏了');
            }}
          />
        ) : null;

      case 'me':
        return (
          <Me
            room={room}
            viewer={viewer}
            onBack={pop}
            onProfile={() => push('profile')}
            onExport={() => push('export')}
            onRecovery={() => push('recovery')}
            onAbout={() => push('about')}
            onInvite={() => push('invite')}
            onNotify={(on) => dispatch({ type: 'notify', on })}
          />
        );

      case 'profile':
        return (
          <Profile
            room={room}
            viewer={viewer}
            onBack={pop}
            onRename={(name) => {
              dispatch({ type: 'rename', user: viewer, name });
              toast('改好了');
            }}
          />
        );

      case 'export':
        return (
          <Export
            room={room}
            onBack={pop}
            onScope={(scope) => dispatch({ type: 'exportScope', scope })}
            onFormat={(format) => dispatch({ type: 'exportFormat', format })}
            onRun={() => {
              dispatch({ type: 'exportRun', now: Date.now() });
              toast('导出已生成');
            }}
          />
        );

      case 'recovery':
        return <Recovery room={room} onBack={pop} />;

      case 'about':
        return <About onBack={pop} />;

      default:
        return null;
    }
  }

  const app = (
    <SafeAreaView style={[styles.root, { backgroundColor: dark ? C.dim : C.surface }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <EnterFrom.Provider value={enterFrom}>
          <View style={styles.flex} key={route} collapsable={false}>
            {content}
          </View>
        </EnterFrom.Provider>
        {toastText ? <Toast text={toastText} /> : null}
      </KeyboardAvoidingView>

      <Drawer
        visible={drawer}
        notes={room.notes}
        onClose={() => setDrawer(false)}
        onAdd={(text) => {
          dispatch({ type: 'noteAdd', text, now: Date.now() });
          toast('放进抽屉了');
        }}
        onDelete={(id) => {
          dispatch({ type: 'noteDel', id });
          toast('删掉了');
        }}
      />

      <KeepConfirm
        visible={!!keepMsg}
        onCancel={() => setKeepMsg(null)}
        onConfirm={() => {
          if (keepMsg) dispatch({ type: 'keep', msgId: keepMsg.id, user: viewer, now: Date.now() });
          setKeepMsg(null);
          toast('留住了');
        }}
      />

      <Dialog visible={timeOpen} onClose={() => setTimeOpen(false)} width={300}>
        <Text style={styles.dialogTitle}>时间旅行</Text>
        <Text style={styles.dialogSub}>把它们往前拨，看看七天之后。</Text>
        <View style={styles.dialogRow}>
          {[1, 3, 7].map((d) => (
            <Btn
              key={d}
              label={`+${d} 天`}
              tone="muted"
              onPress={() => {
                setOffsetDays((o) => o + d);
                setTimeOpen(false);
                toast(`+${d} 天`);
              }}
              style={{ flex: 1 }}
            />
          ))}
        </View>
        <Btn
          label="重置"
          tone="muted"
          onPress={() => {
            dispatch({ type: 'reset', now: Date.now() });
            setOffsetDays(0);
            setViewer('A');
            setStack(['launch']);
            setTimeOpen(false);
            toast('重置了');
          }}
          style={{ marginTop: 10 }}
        />
      </Dialog>
    </SafeAreaView>
  );

  if (Platform.OS === 'web') {
    return <PhoneShell light={dark}>{app}</PhoneShell>;
  }
  return app;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  flex: { flex: 1 },
  dialogTitle: { ...T.name, color: C.text },
  dialogSub: { ...T.label, color: C.text3, marginTop: 4 },
  dialogRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
