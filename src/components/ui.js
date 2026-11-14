import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import Svg, { G, Path, Circle, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { ICONS } from './icons';
import { useRouter, useSession, useUI } from '../context';
import { imprimir, baixarPdf } from '../services/pdf';
import { brDate, isoOf, parseISO } from '../utils';

// O seletor de data nativo não existe na web; lá usamos <input type="date">.
const DateTimePicker = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;

/* ---------- Texto ---------- */
export const T = ({ w = 400, style, ...p }) => <Text {...p} style={[{ fontFamily: F[w], color: C.ink }, style]} />;
export const B = ({ style, ...p }) => <T w={800} {...p} style={style} />;

/* ---------- Ícones (parser dos mesmos SVGs do app web) ---------- */
const TAGS = { path: Path, circle: Circle, rect: Rect };
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
function parse(inner) {
  const out = [];
  const re = /<(path|circle|rect)\s+([^>]*?)\/>/g;
  let m;
  while ((m = re.exec(inner))) {
    const props = {};
    const ar = /([\w-]+)="([^"]*)"/g;
    let a;
    while ((a = ar.exec(m[2]))) props[camel(a[1])] = a[2];
    out.push([TAGS[m[1]], props]);
  }
  return out;
}

export function Icon({ name, color = '#fff', size }) {
  const [inner, w, h] = ICONS[name];
  const els = useMemo(() => parse(inner), [inner]);
  return (
    <Svg width={size || w} height={size ? (h * size) / w : h} viewBox="0 0 24 24">
      <G fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {els.map(([Tag, props], i) => <Tag key={i} {...props} />)}
      </G>
    </Svg>
  );
}

export function Logo({ size = 150 }) {
  return (
    <Svg width={size} height={size * 1.25} viewBox="0 0 160 200" accessibilityLabel="Pref+">
      <Rect x="10" y="6" width="120" height="188" rx="26" fill="none" stroke="#4a8bf0" strokeWidth="10" />
      <Path d="M32 78 L70 48 L108 78 Z" fill="#1e3a8a" />
      <Rect x="34" y="82" width="72" height="8" fill="#1e3a8a" />
      <Rect x="40" y="94" width="14" height="46" fill="#1e3a8a" />
      <Rect x="63" y="94" width="14" height="46" fill="#1e3a8a" />
      <Rect x="86" y="94" width="14" height="46" fill="#1e3a8a" />
      <Rect x="32" y="144" width="76" height="10" fill="#1e3a8a" />
      <Circle cx="116" cy="140" r="30" fill="#17a589" />
      <Path d="M102 141l10 10 18-20" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export const LogoChip = ({ onPress }) => (
  <Pressable onPress={onPress} disabled={!onPress} accessibilityLabel="Início" style={s.logoChip}>
    <Logo size={22} />
  </Pressable>
);

/* ---------- Botões ---------- */
const KINDS = {
  primary: { bg: C.blue, press: C.blueD, fg: '#fff', border: 'transparent' },
  ghost: { bg: '#fff', press: '#eef3fd', fg: C.blue, border: C.blue },
  light: { bg: C.light, press: '#d2e0fa', fg: C.blue, border: 'transparent' },
  soft: { bg: C.bg, press: '#cddcf8', fg: C.blue, border: 'transparent' },
};

export function Btn({ label, onPress, kind = 'primary', sm, block, disabled, icon, style, accessibilityLabel }) {
  const k = KINDS[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? k.press : k.bg,
          borderRadius: sm ? 10 : 12,
          paddingVertical: sm ? 8 : 12,
          paddingHorizontal: sm ? 12 : 18,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: sm ? 5 : 8,
          borderWidth: kind === 'ghost' ? 2 : 0, borderColor: k.border,
          opacity: disabled ? 0.5 : 1,
        },
        block && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {icon}
      {label ? <T w={800} style={{ color: k.fg, fontSize: sm ? 12 : 14 }}>{label}</T> : null}
    </Pressable>
  );
}

/* ---------- Cartões e blocos ---------- */
export const Card = ({ white, style, children }) => (
  <View style={[s.card, white && { backgroundColor: '#fff' }, style]}>{children}</View>
);
export const CardTitle = ({ children }) => <B style={{ fontSize: 14, marginBottom: 4 }}>{children}</B>;
export const CardText = ({ children, style }) => <T style={[{ fontSize: 13, lineHeight: 20 }, style]}>{children}</T>;
export const Title = ({ children, sm }) => <T w={800} style={[s.title, sm && { fontSize: 26 }]}>{children}</T>;
export const Sub = ({ children, style }) => <T style={[{ fontSize: 12, marginBottom: 14 }, style]}>{children}</T>;
export const SectionLabel = ({ children }) => <T w={800} style={{ fontSize: 12, color: C.navy, marginTop: 18, marginBottom: 8 }}>{children}</T>;
export const Note = ({ children }) => <T style={{ fontSize: 10, color: C.muted, textAlign: 'center', marginTop: 14 }}>{children}</T>;
export const Empty = ({ children }) => <T style={{ fontSize: 12, textAlign: 'center', marginTop: 18 }}>{children}</T>;

export const Dot = ({ tipo }) => <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C[tipo] || C.warn, marginRight: 6 }} />;
export const Status = ({ tipo, children, extra }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Dot tipo={tipo} />
    <T w={800} style={{ fontSize: 13 }}>{children}</T>
    {extra ? <T style={{ fontSize: 13 }}> {extra}</T> : null}
  </View>
);

export function Loading({ text = 'Consultando o gov.br...' }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 26 }}>
      <ActivityIndicator color={C.blue} />
      {text ? <T w={600} style={{ fontSize: 12, color: C.blue, marginTop: 10 }}>{text}</T> : null}
    </View>
  );
}

export const ErrorBox = ({ children }) =>
  children ? (
    <View style={{ backgroundColor: C.errorBg, borderRadius: 10, padding: 12, marginBottom: 12 }} accessibilityRole="alert">
      <T w={600} style={{ color: C.errorInk, fontSize: 12 }}>{children}</T>
    </View>
  ) : null;

export const SuccessBox = ({ title, children, footer }) => (
  <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginTop: 14, alignItems: 'center' }}>
    <T w={800} style={{ fontSize: 13, textAlign: 'center' }}>✅ {title}</T>
    {children ? <T w={600} style={{ fontSize: 13, textAlign: 'center', marginTop: 2 }}>{children}</T> : null}
    {footer ? <View style={{ marginTop: 10 }}>{footer}</View> : null}
  </View>
);

export const Actions = ({ children, center }) => (
  <View style={{ flexDirection: 'row', justifyContent: center ? 'center' : 'flex-end', marginTop: 10 }}>{children}</View>
);

export const DocRow = ({ label, children }) => (
  <View style={s.docRow}>
    <T w={700} style={{ fontSize: 12, flex: 1 }}>{label}</T>
    {children}
  </View>
);

/* ---------- Campos ---------- */
export function Field({ label, style, multiline, inputRef, ...props }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <T w={600} style={{ fontSize: 12 }}>{label}</T>
      <TextInput
        {...props}
        ref={inputRef}
        multiline={multiline}
        placeholderTextColor="#8a97b3"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, { borderColor: focus ? C.blue : 'transparent' }, multiline && { minHeight: 100, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function SearchBox({ style, ...props }) {
  return (
    <View style={[{ marginBottom: 12, justifyContent: 'center' }, style]}>
      <View style={{ position: 'absolute', left: 10, zIndex: 1 }} pointerEvents="none"><Icon name="search" color={C.navy} /></View>
      <TextInput
        {...props}
        placeholderTextColor="#8a97b3"
        returnKeyType="search"
        autoCapitalize="none"
        style={{ backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, paddingLeft: 36, paddingRight: 10, fontSize: 13, fontFamily: F[400], color: C.ink }}
      />
    </View>
  );
}

// "Select": abre uma folha com as opções (equivalente ao <select> da web)
export function Select({ label, value, options, onChange, placeholder = 'Selecione...' }) {
  const { openSheet, closeSheet } = useUI();
  const abrir = () =>
    openSheet(
      <View>
        <T w={800} style={s.sheetTitle}>{label}</T>
        {options.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            onPress={() => { onChange(o); closeSheet(); }}
            style={({ pressed }) => [s.option, (pressed || o === value) && { backgroundColor: '#cfdcf5' }]}
          >
            <T w={o === value ? 800 : 600} style={{ fontSize: 14 }}>{o}</T>
          </Pressable>
        ))}
      </View>
    );
  return (
    <View style={{ marginBottom: 12 }}>
      <T w={600} style={{ fontSize: 12 }}>{label}</T>
      <Pressable onPress={abrir} accessibilityRole="button" accessibilityLabel={`${label}: ${value || 'nenhum'}`} style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <T style={{ fontSize: 14, color: value ? C.ink : '#8a97b3' }}>{value || placeholder}</T>
        <T style={{ fontSize: 12, color: C.muted }}>▼</T>
      </Pressable>
    </View>
  );
}

// Campo de data. Android: abre o calendário do sistema. iOS: seletor compacto.
export function DateField({ label, value, onChange, min }) {
  const [show, setShow] = useState(false);
  const date = parseISO(value);
  const minimo = min ? parseISO(min) : undefined;
  const mudou = (e, d) => {
    if (Platform.OS === 'android') setShow(false);
    if (e.type === 'set' && d) onChange(isoOf(d));
  };
  if (Platform.OS === 'web') {
    return (
      <View style={{ marginBottom: 12 }}>
        <T w={600} style={{ fontSize: 12 }}>{label}</T>
        {React.createElement('input', {
          type: 'date', value, min,
          'aria-label': label,
          onChange: (e) => { if (e.target.value) onChange(e.target.value); },
          style: {
            marginTop: 5, width: '100%', boxSizing: 'border-box', backgroundColor: '#fff', borderRadius: 10,
            border: '2px solid transparent', padding: '11px 12px', fontSize: 14,
            fontFamily: 'Montserrat_400Regular, sans-serif', color: C.ink,
          },
        })}
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 12 }}>
      <T w={600} style={{ fontSize: 12 }}>{label}</T>
      {Platform.OS === 'ios' ? (
        <View style={[s.input, { alignItems: 'flex-start' }]}>
          <DateTimePicker value={date} mode="date" display="compact" minimumDate={minimo} onChange={mudou} locale="pt-BR" />
        </View>
      ) : (
        <>
          <Pressable onPress={() => setShow(true)} accessibilityRole="button" accessibilityLabel={`${label}: ${brDate(value)}`} style={[s.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <T style={{ fontSize: 14 }}>{brDate(value)}</T>
            <Icon name="cal" color={C.navy} size={20} />
          </Pressable>
          {show && <DateTimePicker value={date} mode="date" display="default" minimumDate={minimo} onChange={mudou} />}
        </>
      )}
    </View>
  );
}

/* ---------- Imprimir / PDF ---------- */
export function DocBtns({ build, rotulo, disabled }) {
  const { toast } = useUI();
  const [busy, setBusy] = useState(null);
  const run = async (modo) => {
    setBusy(modo);
    try {
      const doc = build();
      if (modo === 'print') await imprimir(doc);
      else {
        await baixarPdf(doc);
        if (Platform.OS === 'web') toast('Na janela que abriu, escolha "Salvar como PDF" como destino.');
      }
    } catch (e) {
      const msg = String((e && e.message) || '');
      if (!/cancel|did not complete/i.test(msg)) toast(msg || 'Não foi possível gerar o documento.');
    } finally {
      setBusy(null);
    }
  };
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Btn kind="light" sm disabled={disabled || !!busy} label={busy === 'print' ? 'Preparando...' : 'Imprimir'}
        icon={<Icon name="print" color={C.blue} />} accessibilityLabel={`Imprimir ${rotulo}`} onPress={() => run('print')} />
      <Btn kind="light" sm disabled={disabled || !!busy} label={busy === 'pdf' ? 'Gerando...' : 'PDF'}
        accessibilityLabel={`Baixar PDF: ${rotulo}`} onPress={() => run('pdf')} />
    </View>
  );
}

/* ---------- Estrutura de cada tela (barra de status, cabeçalho, conteúdo, navegação) ---------- */
const NAV = [['menu', 'home', 'Início'], ['ouvidoria', 'hand', 'Ouvidoria'], ['processos', 'doc', 'Processos'], ['perfil', 'user', 'Perfil']];

function NavBar({ active }) {
  const { go } = useRouter();
  const insets = useSafeAreaInsets();
  const ativo = active === 'home' ? 'menu' : active;
  return (
    <View style={[s.nav, { paddingBottom: 8 + insets.bottom }]} accessibilityRole="tablist">
      {NAV.map(([r, ic, l]) => (
        <Pressable key={r} onPress={() => go(r)} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: ativo === r }}
          style={[s.navBtn, ativo === r && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Icon name={ic} color="#fff" />
        </Pressable>
      ))}
    </View>
  );
}

function DrawerContent() {
  const { go } = useRouter();
  const { logout } = useSession();
  const itens = [['menu', 'Início'], ['perfil', 'Meu perfil'], ['alvara', 'Alvará'], ['iptu', 'IPTU'], ['ouvidoria', 'Ouvidoria'], ['processos', 'Processos'], ['agendamento', 'Agendamento']];
  return (
    <View>
      <T w={800} style={s.sheetTitle}>Pref+</T>
      {itens.map(([r, l]) => (
        <Pressable key={r} onPress={() => go(r)} accessibilityRole="button" style={({ pressed }) => [s.drawerItem, pressed && { backgroundColor: '#cfdcf5' }]}>
          <T w={700} style={{ fontSize: 14 }}>{l}</T>
        </Pressable>
      ))}
      <Pressable onPress={logout} accessibilityRole="button" style={({ pressed }) => [s.drawerItem, pressed && { backgroundColor: '#cfdcf5' }]}>
        <T w={700} style={{ fontSize: 14, color: '#b42318' }}>Sair</T>
      </Pressable>
    </View>
  );
}

export function Shell({ children, nav = null, header = true, right = 'logo', white = false, footer = false, scrollRef, contentStyle }) {
  const insets = useSafeAreaInsets();
  const { go } = useRouter();
  const { openSheet } = useUI();
  const semBarraInferior = !nav && !footer;
  return (
    <View style={{ flex: 1, backgroundColor: white ? '#fff' : C.bg }}>
      <View style={{ backgroundColor: C.blue, paddingTop: insets.top }}>
        {header && (
          <View style={s.top}>
            <Pressable onPress={() => openSheet(<DrawerContent />, { left: true })} accessibilityRole="button" accessibilityLabel="Abrir menu" style={s.ic}>
              <Icon name="burger" />
            </Pressable>
            {right === 'gear' ? (
              <Pressable onPress={() => go('config')} accessibilityRole="button" accessibilityLabel="Configurações" style={s.ic}>
                <Icon name="gear" />
              </Pressable>
            ) : (
              <LogoChip onPress={() => go('menu')} />
            )}
          </View>
        )}
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[{ flexGrow: 1, paddingTop: 18, paddingHorizontal: 22, paddingBottom: 24 + (semBarraInferior ? insets.bottom : 0) }, contentStyle]}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
      {nav && <NavBar active={nav} />}
      {footer && (
        <View style={{ backgroundColor: C.blue, paddingTop: 14, paddingBottom: 14 + insets.bottom }}>
          <T w={700} style={{ color: '#fff', fontSize: 11, textAlign: 'center', letterSpacing: 0.5 }}>BY TÂLUGA</T>
        </View>
      )}
    </View>
  );
}

/* ---------- Estilos ---------- */
export const s = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10 },
  ic: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  logoChip: { width: 38, height: 38, backgroundColor: '#fff', borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  nav: { backgroundColor: C.blue, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, paddingHorizontal: 8 },
  navBtn: { width: 58, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 12 },
  title: { fontSize: 34, color: C.blue, textAlign: 'center', marginTop: 4, marginBottom: 6, letterSpacing: -0.3 },
  input: { marginTop: 5, backgroundColor: '#fff', borderRadius: 10, borderWidth: 2, borderColor: 'transparent', paddingVertical: 11, paddingHorizontal: 12, fontSize: 14, fontFamily: F[400], color: C.ink },
  docRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 8 },
  sheetTitle: { fontSize: 18, color: C.blue, marginBottom: 12 },
  option: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  drawerItem: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
});
