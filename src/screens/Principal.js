import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Shell, T, Btn, Field, Icon, Card, Note, Empty, ErrorBox, DocBtns, DocRow, SearchBox } from '../components/ui';
import { useRouter, useSession, useUI } from '../context';
import { atualizarPerfil } from '../services/auth';
import { docCadastro } from '../services/documentos';
import { first, norm } from '../utils';
import { C } from '../theme';

/* ---------- Menu de serviços ---------- */
const TILES = [
  { id: 'perfil', wide: true, t: 'MEU PERFIL', s: 'Acesse seus dados e configurações', k: 'meu perfil dados configuracoes' },
  { id: 'alvara', t: 'ALVARÁ', s: 'Consulte ou solicite seu alvará', k: 'alvara licenca' },
  { id: 'iptu', t: 'IPTU', s: 'Consulte débitos e pagamentos', k: 'iptu imposto debitos pagamentos' },
  { id: 'ouvidoria', t: 'OUVIDORIA', s: 'Envie suas solicitações', k: 'ouvidoria reclamacao sugestao' },
  { id: 'processos', t: 'PROCESSOS', s: 'Acompanhe seus processos', k: 'processos protocolo' },
  { id: 'agendamento', solo: true, t: 'AGENDAMENTO', s: 'Agende seu atendimento presencial', k: 'agendamento atendimento horario' },
];

function Tile({ t, onPress, style, children }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${t.t}. ${t.s}`}
      style={({ pressed }) => [{ backgroundColor: pressed ? C.blueD : C.blue, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, marginBottom: 12 }, style]}>
      {children}
    </Pressable>
  );
}

export function Menu() {
  const { go } = useRouter();
  const { user } = useSession();
  const [q, setQ] = useState('');
  const f = norm(q.trim());
  const vis = TILES.filter((t) => !f || norm(`${t.k} ${t.t} ${t.s}`).includes(f));
  const wide = vis.filter((t) => t.wide);
  const normais = vis.filter((t) => !t.wide && !t.solo);
  const solo = vis.filter((t) => t.solo);

  const Texto = ({ t }) => (
    <>
      <T w={800} style={{ color: '#fff', fontSize: 15, textAlign: 'center' }}>{t.t}</T>
      <T w={500} style={{ color: '#fff', fontSize: 9, textAlign: 'center', marginTop: 3, lineHeight: 12, opacity: 0.9 }}>{t.s}</T>
    </>
  );

  return (
    <Shell nav="menu" right="gear">
      <SearchBox value={q} onChangeText={setQ} placeholder="Pesquise aqui..." accessibilityLabel="Pesquisar serviços" />
      <View style={{ alignItems: 'center' }}>
        <View style={{ borderWidth: 2, borderColor: C.blue, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 2, marginTop: 4 }}>
          <T w={800} style={{ color: C.navy, fontSize: 13 }}>Olá {first(user.nome)}!</T>
        </View>
        <T style={{ fontSize: 11, marginTop: 4 }}>O que você precisa hoje?</T>
        <T w={800} style={{ fontSize: 26, color: C.blue, marginTop: 12, letterSpacing: -0.3 }}>SERVIÇOS</T>
      </View>

      <View style={{ marginTop: 14 }}>
        {wide.map((t) => (
          <Tile key={t.id} t={t} onPress={() => go(t.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 }}>
            <Icon name="perfil" />
            <View style={{ flex: 1 }}>
              <T w={800} style={{ color: '#fff', fontSize: 15 }}>{t.t}</T>
              <T w={500} style={{ color: '#fff', fontSize: 9, marginTop: 3, opacity: 0.9 }}>{t.s}</T>
            </View>
          </Tile>
        ))}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {normais.map((t) => (
            <Tile key={t.id} t={t} onPress={() => go(t.id)} style={{ width: '48.5%' }}><Texto t={t} /></Tile>
          ))}
        </View>
        {solo.map((t) => (
          <Tile key={t.id} t={t} onPress={() => go(t.id)} style={{ width: '62%', alignSelf: 'center' }}><Texto t={t} /></Tile>
        ))}
        {vis.length === 0 && <Empty>Nenhum serviço encontrado. Tente outra palavra.</Empty>}
      </View>
    </Shell>
  );
}

/* ---------- Perfil ---------- */
export function Perfil() {
  const { user, setUser, logout } = useSession();
  const { toast } = useUI();
  const [f, setF] = useState({ nome: user.nome, email: user.email, telefone: user.telefone || '' });
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const [nomeTopo, setNomeTopo] = useState(user.nome);
  const ini = user.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const salvar = async () => {
    setErro(''); setBusy(true);
    try {
      const novo = await atualizarPerfil(user.id, f);
      setUser(novo);
      setNomeTopo(novo.nome);
      toast('Perfil atualizado.');
    } catch (e) {
      setErro(e.message);
    }
    setBusy(false);
  };

  return (
    <Shell nav="perfil" right="gear">
      <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: '#fff', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 14 }} accessibilityLabel="Foto de perfil">
        <T w={800} style={{ fontSize: 44, color: '#8aa3d6' }}>{ini}</T>
      </View>
      <T w={800} style={{ textAlign: 'center', fontSize: 20, color: C.blue }}>{nomeTopo}</T>
      <T style={{ textAlign: 'center', fontSize: 12, color: C.blue, marginTop: 2, marginBottom: 16 }}>@{user.usuario}</T>
      <ErrorBox>{erro}</ErrorBox>
      <Field label="Nome completo" value={f.nome} onChangeText={set('nome')} />
      <Field label="E-mail" value={f.email} onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Telefone" value={f.telefone} onChangeText={set('telefone')} keyboardType="phone-pad" />
      <Btn label={busy ? 'SALVANDO...' : 'SALVAR'} onPress={salvar} disabled={busy} block />
      <Card white style={{ marginTop: 16 }}>
        <DocRow label="Comprovante de cadastro">
          <DocBtns build={() => docCadastro(user)} rotulo="comprovante de cadastro" />
        </DocRow>
      </Card>
      <Pressable onPress={logout} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 12, padding: 8 }}>
        <T style={{ fontSize: 11, textDecorationLine: 'underline' }}>Deseja sair da sua conta?</T>
      </Pressable>
      <Note>BY TÂLUGA</Note>
    </Shell>
  );
}

/* ---------- Configurações ---------- */
export function Config() {
  const { go } = useRouter();
  const { logout } = useSession();
  const { toast } = useUI();
  const acao = (a, label) => () => {
    if (a === 'demo') toast(`"${label}" não faz parte desta demonstração.`);
    else if (a === 'cache') toast('Espaço liberado.');
    else if (a === 'logout') logout();
    else go(a);
  };
  const grupos = [
    ['Conta', [['cfgUser', 'Editar Perfil', 'perfil'], ['shield', 'Segurança', 'demo'], ['bell', 'Notificações', 'demo'], ['lock', 'Privacidade', 'demo']]],
    ['Suporte e Sobre', [['card', 'Pagamentos', 'iptu'], ['help', 'Ajuda e Suporte', 'ouvidoria'], ['info', 'Termos e Políticas', 'demo']]],
    ['Cache', [['trash', 'Libere espaço', 'cache'], ['chart', 'Economia de dados', 'demo']]],
    ['Ações', [['flag', 'Reportar um problema', 'ouvidoria'], ['users', 'Adicionar Conta', 'logout'], ['out', 'Sair', 'logout']]],
  ];
  return (
    <Shell right="logo">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Pressable onPress={() => go('menu')} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" color={C.navy} />
        </Pressable>
        <T w={800} style={{ fontSize: 16 }}>Configurações</T>
      </View>
      {grupos.map(([titulo, itens]) => (
        <View key={titulo}>
          <T w={800} style={{ fontSize: 11, marginTop: 14, marginBottom: 6 }}>{titulo}</T>
          <View style={{ backgroundColor: '#cfdcf5', borderRadius: 10, overflow: 'hidden' }}>
            {itens.map(([ic, label, a]) => (
              <Pressable key={label} onPress={acao(a, label)} accessibilityRole="button"
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: pressed ? '#c2d2f1' : 'transparent' })}>
                <Icon name={ic} color={C.ink} />
                <T w={700} style={{ fontSize: 12 }}>{label}</T>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Shell>
  );
}
