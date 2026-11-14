import React, { useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { Shell, T, Btn, Field, Logo, LogoChip, Icon, ErrorBox } from '../components/ui';
import { useRouter, useSession, useUI } from '../context';
import { entrar, cadastrar } from '../services/auth';
import { C } from '../theme';

/* ---------- Tela inicial ---------- */
export function Splash() {
  const { go } = useRouter();
  return (
    <Shell header={false} white>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
        <Logo size={150} />
        <T w={700} style={{ fontSize: 30, color: C.blue, textAlign: 'center', marginTop: 22, marginBottom: 6, lineHeight: 38 }}>
          {'Bem Vindo\nao Pref+'}
        </T>
        <T style={{ fontSize: 11, color: C.blue, marginBottom: 28 }}>Sua aventura começa por aqui...</T>
        <Btn kind="soft" label="ENTRE AQUI" onPress={() => go('login')} style={{ width: '100%', maxWidth: 260 }} />
      </View>
    </Shell>
  );
}

const Topo = ({ voltar }) => {
  const { go } = useRouter();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Pressable onPress={() => go(voltar)} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="back" color={C.navy} />
      </Pressable>
      <LogoChip />
    </View>
  );
};

/* ---------- Login ---------- */
export function Login() {
  const { go } = useRouter();
  const { setUser } = useSession();
  const { toast } = useUI();
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(true);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const senhaRef = useRef(null);

  const acessar = async () => {
    setErro(''); setBusy(true);
    try {
      setUser(await entrar({ usuario, senha }), 'menu');
    } catch (e) {
      setErro(e.message);
      setBusy(false);
    }
  };

  return (
    <Shell header={false} footer>
      <Topo voltar="splash" />
      <T w={800} style={{ color: C.blue, fontSize: 20, marginTop: 14, marginBottom: 2 }}>Acesse:</T>
      <T style={{ fontSize: 12, marginBottom: 14 }}>Com o usuário e senha para entrar</T>
      <ErrorBox>{erro}</ErrorBox>
      <Field label="Nome de Usuário:" value={usuario} onChangeText={setUsuario} placeholder="Usuário" autoCapitalize="none" autoCorrect={false}
        textContentType="username" returnKeyType="next" onSubmitEditing={() => senhaRef.current && senhaRef.current.focus()} />
      <Field label="Sua senha:" inputRef={senhaRef} value={senha} onChangeText={setSenha} placeholder="Senha" secureTextEntry autoCapitalize="none"
        textContentType="password" returnKeyType="go" onSubmitEditing={acessar} />
      <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
        <Btn kind="ghost" label="Cadastrar" onPress={() => go('register')} style={{ flex: 1 }} />
        <Btn label={busy ? 'Entrando...' : 'Acessar'} onPress={acessar} disabled={busy} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
        <Pressable onPress={() => setLembrar(!lembrar)} accessibilityRole="checkbox" accessibilityState={{ checked: lembrar }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: lembrar ? C.blue : '#fff', borderWidth: 1.5, borderColor: C.blue, alignItems: 'center', justifyContent: 'center' }}>
            {lembrar && <T w={800} style={{ color: '#fff', fontSize: 10, lineHeight: 12 }}>✓</T>}
          </View>
          <T style={{ fontSize: 11 }}>Lembrar minha senha</T>
        </Pressable>
        <Pressable onPress={() => toast('Recuperação de senha não está ativa nesta demonstração.')} accessibilityRole="link">
          <T style={{ fontSize: 11 }}>Esqueci minha senha</T>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 12 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: '#9fb3d9' }} />
        <T style={{ fontSize: 11, color: C.muted }}>Ou acesse com</T>
        <View style={{ flex: 1, height: 1, backgroundColor: '#9fb3d9' }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
        <Pressable onPress={() => toast('Login social não está ativo nesta demonstração.')} accessibilityRole="button" accessibilityLabel="Entrar com Google"
          style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
          <T w={800} style={{ fontSize: 20, color: '#ea4335' }}>G</T>
        </Pressable>
        <Pressable onPress={() => toast('Login social não está ativo nesta demonstração.')} accessibilityRole="button" accessibilityLabel="Entrar com Facebook"
          style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: '#1877f2', alignItems: 'center', justifyContent: 'center' }}>
          <T w={800} style={{ fontSize: 20, color: '#fff' }}>f</T>
        </Pressable>
      </View>
      <T style={{ textAlign: 'center', fontSize: 11, color: C.muted, marginTop: 18 }}>
        Conta de teste: <T w={800} style={{ fontSize: 11, color: C.muted }}>gabriel</T> / <T w={800} style={{ fontSize: 11, color: C.muted }}>123456</T>
      </T>
    </Shell>
  );
}

/* ---------- Cadastro ---------- */
export function Register() {
  const { go } = useRouter();
  const { setUser } = useSession();
  const [f, setF] = useState({ nome: '', usuario: '', email: '', telefone: '', senha: '', senha2: '' });
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const paraTopo = () => scrollRef.current && scrollRef.current.scrollTo({ y: 0, animated: true });

  const criar = async () => {
    setErro('');
    if (f.senha !== f.senha2) { setErro('As senhas não coincidem.'); paraTopo(); return; }
    setBusy(true);
    try {
      const { senha2, ...dados } = f;
      setUser(await cadastrar(dados), 'menu');
    } catch (e) {
      setErro(e.message); setBusy(false); paraTopo();
    }
  };

  return (
    <Shell header={false} footer scrollRef={scrollRef}>
      <Topo voltar="login" />
      <T w={800} style={{ color: C.blue, fontSize: 20, marginTop: 14, marginBottom: 2 }}>Crie sua conta</T>
      <T style={{ fontSize: 12, marginBottom: 14 }}>Preencha os dados para acessar os serviços da prefeitura</T>
      <ErrorBox>{erro}</ErrorBox>
      <Field label="Nome completo" value={f.nome} onChangeText={set('nome')} placeholder="Seu nome" textContentType="name" />
      <Field label="Nome de usuário" value={f.usuario} onChangeText={set('usuario')} placeholder="Ex.: maria.silva" autoCapitalize="none" autoCorrect={false} />
      <Field label="E-mail" value={f.email} onChangeText={set('email')} placeholder="voce@email.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Field label="Telefone" value={f.telefone} onChangeText={set('telefone')} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
      <Field label="Senha" value={f.senha} onChangeText={set('senha')} placeholder="Mínimo de 6 caracteres" secureTextEntry autoCapitalize="none" />
      <Field label="Confirmar senha" value={f.senha2} onChangeText={set('senha2')} placeholder="Repita a senha" secureTextEntry autoCapitalize="none" onSubmitEditing={criar} />
      <Btn label={busy ? 'Criando...' : 'Criar conta'} onPress={criar} disabled={busy} block style={{ marginTop: 6 }} />
      <Pressable onPress={() => go('login')} accessibilityRole="link" style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}>
        <T style={{ fontSize: 11, textDecorationLine: 'underline' }}>Já tenho conta</T>
      </Pressable>
    </Shell>
  );
}
