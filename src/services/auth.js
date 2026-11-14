import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { govData } from './govData';

// O Firebase Auth exige e-mail. Para manter o login por "usuário e senha",
// o usuário vira um e-mail interno (usuario@pref-plus.app). O e-mail real do
// cidadão fica salvo no perfil, no Firestore.
const DOMINIO = 'pref-plus.app';
const emailInterno = (usuario) => `${String(usuario).trim().toLowerCase()}@${DOMINIO}`;

export function traduzErro(e) {
  const code = e && e.code ? String(e.code) : '';
  const mapa = {
    'auth/invalid-credential': 'Usuário ou senha incorretos.',
    'auth/user-not-found': 'Usuário ou senha incorretos.',
    'auth/wrong-password': 'Usuário ou senha incorretos.',
    'auth/invalid-email': 'Usuário inválido.',
    'auth/email-already-in-use': 'Esse nome de usuário já está em uso.',
    'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
    'auth/network-request-failed': 'Sem conexão com a internet. Tente novamente.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um pouco e tente de novo.',
    'auth/operation-not-allowed': 'Ative o login por e-mail/senha no Firebase (Authentication).',
    'permission-denied': 'Sem permissão no Firestore. Publique as regras do arquivo firestore.rules.',
    unavailable: 'Sem conexão com o servidor. Tente novamente.',
  };
  return mapa[code] || (e && e.message) || 'Algo deu errado. Tente novamente.';
}

export async function getPerfil(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) throw new Error('Perfil não encontrado. Crie a conta novamente.');
  return { id: uid, ...snap.data() };
}

// Reabre a sessão salva no aparelho (se houver)
export async function restaurarSessao() {
  await auth.authStateReady();
  const u = auth.currentUser;
  if (!u) return null;
  try {
    return await getPerfil(u.uid);
  } catch {
    return null;
  }
}

export async function cadastrar({ nome, usuario, email, telefone, senha }) {
  nome = String(nome || '').trim();
  usuario = String(usuario || '').trim();
  email = String(email || '').trim();
  telefone = String(telefone || '').trim();
  senha = String(senha || '');
  if (nome.length < 3) throw new Error('Informe seu nome completo.');
  if (!/^[a-zA-Z0-9._-]{3,20}$/.test(usuario)) throw new Error('O usuário deve ter de 3 a 20 letras, números, ponto, traço ou sublinhado.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.');
  if (senha.length < 6) throw new Error('A senha precisa ter pelo menos 6 caracteres.');

  let cred;
  try {
    cred = await createUserWithEmailAndPassword(auth, emailInterno(usuario), senha);
  } catch (e) {
    throw new Error(traduzErro(e));
  }
  const uid = cred.user.uid;

  try {
    const gov = govData();
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid), { nome, usuario: usuario.toLowerCase(), email, telefone, criadoEm: Date.now() });
    gov.alvaras.forEach((a) => batch.set(doc(db, 'users', uid, 'alvaras', a.numero), a));
    gov.processos.forEach((p) => batch.set(doc(db, 'users', uid, 'processos', p.numero), p));
    gov.ouvidoria.forEach((o) => batch.set(doc(db, 'users', uid, 'ouvidoria', o.protocolo), o));
    batch.set(doc(db, 'users', uid, 'iptu', String(gov.iptu.ano)), gov.iptu);
    await batch.commit();
  } catch (e) {
    // não deixa uma conta "pela metade" no Firebase Auth
    try { await cred.user.delete(); } catch { /* ignora */ }
    throw new Error(traduzErro(e));
  }
  return getPerfil(uid);
}

export async function entrar({ usuario, senha }) {
  usuario = String(usuario || '').trim();
  if (!usuario || !senha) throw new Error('Informe o usuário e a senha.');
  try {
    const cred = await signInWithEmailAndPassword(auth, emailInterno(usuario), senha);
    return await getPerfil(cred.user.uid);
  } catch (e) {
    // Conta de teste (gabriel / 123456): criada automaticamente no primeiro acesso
    const naoExiste = e && (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found');
    if (naoExiste && usuario.toLowerCase() === 'gabriel' && senha === '123456') {
      try {
        return await cadastrar({ nome: 'Gabriel Souza', usuario: 'gabriel', email: 'gabriel@email.com', telefone: '(19) 99999-0000', senha: '123456' });
      } catch {
        throw new Error('Usuário ou senha incorretos.');
      }
    }
    throw new Error(traduzErro(e));
  }
}

export async function sair() {
  await signOut(auth);
}

export async function atualizarPerfil(uid, { nome, email, telefone }) {
  nome = String(nome || '').trim();
  email = String(email || '').trim();
  if (nome.length < 3) throw new Error('Informe seu nome completo.');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Informe um e-mail válido.');
  try {
    await updateDoc(doc(db, 'users', uid), { nome, email, telefone: String(telefone || '').trim() });
  } catch (e) {
    throw new Error(traduzErro(e));
  }
  return getPerfil(uid);
}
