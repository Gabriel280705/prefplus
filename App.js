import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, BackHandler, KeyboardAvoidingView, Platform,
  ActivityIndicator, StyleSheet, useWindowDimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
} from '@expo-google-fonts/montserrat';

import { RouterCtx, SessionCtx, UICtx } from './src/context';
import { C } from './src/theme';
import { T, Logo } from './src/components/ui';
import { firebaseConfigurado, firebaseErro, firebasePronto } from './src/firebase/config';
import { restaurarSessao, sair } from './src/services/auth';

import { Splash, Login, Register } from './src/screens/Publicas';
import { Menu, Perfil, Config } from './src/screens/Principal';
import { Alvara, Iptu } from './src/screens/AlvaraIptu';
import { Ouvidoria, Processos, Agendamento } from './src/screens/OuvidoriaProcessosAgenda';

const SCREENS = {
  splash: Splash, login: Login, register: Register,
  menu: Menu, perfil: Perfil, config: Config,
  alvara: Alvara, iptu: Iptu, ouvidoria: Ouvidoria, processos: Processos, agendamento: Agendamento,
};

/* ---------- Telas de aviso (usam só componentes básicos, para nunca falharem) ---------- */
function TelaAviso({ titulo, texto, itens = [], detalhe, onTentar }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: 32 }}>
      <View style={{ alignItems: 'center', marginBottom: 18 }}><Logo size={80} /></View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: C.blue, textAlign: 'center', marginBottom: 6 }}>{titulo}</Text>
      {texto ? <Text style={{ fontSize: 13, color: C.ink, textAlign: 'center', marginBottom: 16 }}>{texto}</Text> : null}
      {itens.map((p) => <Text key={p} style={{ fontSize: 13, color: C.ink, marginBottom: 8, lineHeight: 19 }}>{p}</Text>)}
      {detalhe ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: C.muted, marginBottom: 4 }}>Detalhe do erro (copie e envie):</Text>
          <Text selectable style={{ fontSize: 12, color: C.errorInk, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>{detalhe}</Text>
        </View>
      ) : null}
      {onTentar ? (
        <Pressable onPress={onTentar} style={{ backgroundColor: C.blue, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 18 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Tentar novamente</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

// Mostra o erro real dentro do app, em vez da tela genérica "Something went wrong" do Expo Go
class ErrorBoundary extends React.Component {
  state = { erro: null };
  static getDerivedStateFromError(erro) { return { erro }; }
  componentDidCatch(erro, info) { console.warn('Erro no app:', erro, info && info.componentStack); }
  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;
    const msg = String((erro && erro.message) || erro);
    const pilha = String((erro && erro.stack) || '').split('\n').slice(0, 6).join('\n');
    return (
      <TelaAviso
        titulo="O app encontrou um erro"
        texto="Envie o texto abaixo para quem está dando suporte."
        detalhe={`${msg}\n\n${pilha}`}
        onTentar={() => this.setState({ erro: null })}
      />
    );
  }
}

/* ---------- Moldura de celular no navegador (igual ao app web original) ---------- */
function Frame({ children }) {
  const { width, height } = useWindowDimensions();
  if (Platform.OS !== 'web' || width < 520) return <View style={{ flex: 1 }}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: '#eef3fd', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 390, height: Math.min(860, height - 32), borderRadius: 38, overflow: 'hidden', backgroundColor: '#fff', boxShadow: '0 0 0 10px #fff, 0 20px 50px rgba(30,58,138,0.18)' }}>
        {children}
      </View>
    </View>
  );
}

function Root() {
  const insets = useSafeAreaInsets();
  const [stack, setStack] = useState(['splash']);
  const [user, setUserState] = useState(null);
  const [boot, setBoot] = useState(true);
  // pilha de folhas: uma folha pode abrir outra por cima (ex.: lista de atividades dentro de "novo alvará")
  const [sheets, setSheets] = useState([]);
  const sheetId = useRef(0);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  // Reabre o login salvo no aparelho
  useEffect(() => {
    if (!firebasePronto) { setBoot(false); return; }
    restaurarSessao()
      .then((u) => { if (u) { setUserState(u); setStack(['menu']); } })
      .catch(() => {})
      .finally(() => setBoot(false));
  }, []);

  const go = useCallback((name) => {
    setSheets([]);
    setStack((s) => {
      const i = s.indexOf(name);
      if (i === s.length - 1) return s;
      return i >= 0 ? s.slice(0, i + 1) : [...s, name];
    });
  }, []);
  const back = useCallback(() => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const setUser = useCallback((u, destino) => {
    setUserState(u);
    if (destino) { setSheets([]); setStack([destino]); }
  }, []);
  const logout = useCallback(async () => {
    try { await sair(); } catch { /* segue para o login */ }
    setSheets([]); setUserState(null); setStack(['login']);
  }, []);

  const toast = useCallback((msg) => {
    clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
  }, []);
  const openSheet = useCallback((el, opts = {}) => setSheets((l) => [...l, { id: ++sheetId.current, el, left: !!opts.left }]), []);
  const closeSheet = useCallback(() => setSheets((l) => l.slice(0, -1)), []); // fecha só a folha de cima

  // Botão voltar do Android: fecha a folha, senão volta uma tela, senão sai do app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheets.length) { closeSheet(); return true; }
      if (stack.length > 1) { back(); return true; }
      return false;
    });
    return () => sub && sub.remove && sub.remove();
  }, [sheets, stack, back, closeSheet]);

  const route = stack[stack.length - 1];
  const router = useMemo(() => ({ route, go, back }), [route, go, back]);
  const session = useMemo(() => ({ user, setUser, logout }), [user, setUser, logout]);
  const ui = useMemo(() => ({ toast, openSheet, closeSheet }), [toast, openSheet, closeSheet]);

  if (!firebaseConfigurado) {
    return (
      <TelaAviso
        titulo="Falta configurar o Firebase"
        texto="As chaves do Firebase não foram encontradas no arquivo .env."
        itens={[
          '1. Crie um projeto em console.firebase.google.com',
          '2. Ative Authentication > Método de login > E-mail/senha',
          '3. Crie o banco em Firestore Database e publique as regras do arquivo firestore.rules',
          '4. Adicione um app Web no projeto e copie as chaves',
          '5. Copie .env.example para .env, cole as chaves e reinicie com: npx expo start -c',
        ]}
      />
    );
  }
  if (firebaseErro) {
    return (
      <TelaAviso
        titulo="Não foi possível iniciar o Firebase"
        texto="As chaves foram encontradas, mas o Firebase não iniciou. Confira se a biblioteca está na versão 12 ou mais nova (npx expo install firebase) e reinicie com: npx expo start -c"
        detalhe={firebaseErro}
      />
    );
  }
  if (boot) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
        <Logo size={110} />
        <ActivityIndicator color={C.blue} style={{ marginTop: 20 }} />
      </View>
    );
  }

  // proteção de rotas: telas internas só com login
  const publicas = ['splash', 'login', 'register'];
  const Screen = !user && !publicas.includes(route) ? Login : user && publicas.includes(route) ? Menu : SCREENS[route] || Splash;

  return (
    <SessionCtx.Provider value={session}>
      <RouterCtx.Provider value={router}>
        <UICtx.Provider value={ui}>
          <StatusBar style="light" backgroundColor={C.blue} />
          <Screen key={route} />

          {sheets.map((sheet, i) => (
            <View key={sheet.id} style={StyleSheet.absoluteFill}>
              <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: i === 0 ? 'rgba(15,30,70,0.5)' : 'rgba(15,30,70,0.25)' }]} onPress={closeSheet} accessibilityLabel="Fechar" />
              {sheet.left ? (
                <View style={{ width: '78%', height: '100%', backgroundColor: C.bg, paddingTop: insets.top + 28, paddingHorizontal: 18 }}>
                  <ScrollView>{sheet.el}</ScrollView>
                </View>
              ) : (
                <View style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
                    <View style={{ backgroundColor: C.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 20, paddingHorizontal: 22, paddingBottom: 26 + insets.bottom, maxHeight: '88%' }}>
                      <ScrollView keyboardShouldPersistTaps="handled">{sheet.el}</ScrollView>
                    </View>
                  </KeyboardAvoidingView>
                </View>
              )}
            </View>
          ))}

          {toastMsg ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 76, backgroundColor: C.navy, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14 }}>
              <T w={600} style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{toastMsg}</T>
            </View>
          ) : null}
        </UICtx.Provider>
      </RouterCtx.Provider>
    </SessionCtx.Provider>
  );
}

export default function App() {
  const [fontsOk, fontsErr] = useFonts({
    Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, Montserrat_800ExtraBold,
  });
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <Frame>
          {fontsOk || fontsErr ? <Root /> : <View style={{ flex: 1, backgroundColor: '#fff' }} />}
        </Frame>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
