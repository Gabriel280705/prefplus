import {
  collection, doc, getDoc, getDocs, query, orderBy, where,
  setDoc, writeBatch, runTransaction,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { traduzErro } from './auth';
import { fmtBR, todayISO, IPTU_ANO, SLOTS } from '../utils';

const uid = () => {
  const u = auth.currentUser;
  if (!u) throw new Error('Sessão expirada. Entre novamente.');
  return u.uid;
};
const col = (nome) => collection(db, 'users', uid(), nome);

// Envolve cada operação para devolver mensagens em português
async function seguro(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e && e.code) throw new Error(traduzErro(e));
    throw e;
  }
}

/* ---------- Protocolos (contador global) ---------- */
const PRIMEIRO = 4582;
const formatar = (seq) => `2026-${String(seq).padStart(6, '0')}`;

async function proximoNumero() {
  const ref = doc(db, 'counters', 'protocolo');
  return runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    const seq = (s.exists() ? s.data().seq : PRIMEIRO) + 1;
    tx.set(ref, { seq });
    return formatar(seq);
  });
}

/* ---------- Alvarás ---------- */
export const listarAlvaras = () =>
  seguro(async () => {
    const s = await getDocs(query(col('alvaras'), orderBy('ordem', 'desc')));
    return s.docs.map((d) => d.data());
  });

export const solicitarAlvara = ({ empresa, atividade }) =>
  seguro(async () => {
    empresa = String(empresa || '').trim();
    atividade = String(atividade || '').trim();
    if (empresa.length < 3) throw new Error('Informe o nome da empresa.');
    if (!atividade) throw new Error('Escolha a atividade.');
    const numero = await proximoNumero();
    const u = uid();
    const ordem = Date.now();
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', u, 'alvaras', numero), { numero, empresa, atividade, status: 'Em análise', validade: '—', ordem });
    batch.set(doc(db, 'users', u, 'processos', numero), {
      numero, titulo: 'Solicitação de Alvará', status: 'Em análise', ordem,
      etapas: [{ data: fmtBR(new Date()), texto: 'Processo protocolado' }],
    });
    await batch.commit();
    return { numero };
  });

/* ---------- IPTU ---------- */
const iptuRef = () => doc(db, 'users', uid(), 'iptu', String(IPTU_ANO));

export const obterIptu = () =>
  seguro(async () => {
    const s = await getDoc(iptuRef());
    if (!s.exists()) throw new Error('Nenhum IPTU encontrado para este cadastro.');
    return s.data();
  });

export const pagarParcela = (n) =>
  seguro(() =>
    runTransaction(db, async (tx) => {
      const ref = iptuRef();
      const s = await tx.get(ref);
      const d = s.data();
      const p = d.parcelas.find((x) => x.n === Number(n));
      if (!p) throw new Error('Parcela não encontrada.');
      if (p.paga) throw new Error('Essa parcela já foi paga.');
      p.paga = true;
      p.pagoEm = fmtBR(new Date());
      tx.set(ref, d);
      return d;
    })
  );

/* ---------- Ouvidoria ---------- */
export const listarOuvidoria = () =>
  seguro(async () => {
    const s = await getDocs(query(col('ouvidoria'), orderBy('ordem', 'desc')));
    return s.docs.map((d) => d.data());
  });

export const enviarManifestacao = ({ tipo, assunto, descricao }) =>
  seguro(async () => {
    tipo = String(tipo || '').trim();
    assunto = String(assunto || '').trim();
    descricao = String(descricao || '').trim();
    if (!tipo) throw new Error('Escolha o tipo de manifestação.');
    if (assunto.length < 3) throw new Error('Digite o assunto.');
    if (descricao.length < 10) throw new Error('Descreva sua solicitação com pelo menos 10 caracteres.');
    const protocolo = await proximoNumero();
    await setDoc(doc(db, 'users', uid(), 'ouvidoria', protocolo), {
      protocolo, tipo, assunto, descricao, data: fmtBR(new Date()), status: 'Recebida', ordem: Date.now(),
    });
    return { protocolo };
  });

/* ---------- Processos ---------- */
export const listarProcessos = () =>
  seguro(async () => {
    const s = await getDocs(query(col('processos'), orderBy('ordem', 'desc')));
    return s.docs.map((d) => d.data());
  });

/* ---------- Agendamentos ---------- */
const slotId = (data, hora) => `${data}_${hora.replace(':', '')}`;

export const listarAgendamentos = () =>
  seguro(async () => {
    const s = await getDocs(query(col('agendamentos'), orderBy('ordem', 'asc')));
    return s.docs.map((d) => ({ id: d.id, ...d.data() }));
  });

export const horariosDoDia = (data) =>
  seguro(async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data || '')) throw new Error('Data inválida.');
    const dow = new Date(`${data}T12:00:00`).getDay();
    if (data < todayISO()) return { horarios: [], aviso: 'Escolha uma data a partir de hoje.' };
    if (dow === 0 || dow === 6) return { horarios: [], aviso: 'Não há atendimento aos sábados e domingos.' };
    const s = await getDocs(query(collection(db, 'slots'), where('data', '==', data)));
    const ocupados = s.docs.map((d) => d.data().hora);
    return { horarios: SLOTS.map((h) => ({ hora: h, livre: !ocupados.includes(h) })) };
  });

export const agendar = ({ servico, data, hora }) =>
  seguro(async () => {
    if (!servico || !data || !hora) throw new Error('Escolha o serviço, a data e o horário.');
    if (!SLOTS.includes(hora)) throw new Error('Esse horário não está mais disponível. Escolha outro.');
    const u = uid();
    const slotRef = doc(db, 'slots', slotId(data, hora));
    const agRef = doc(collection(db, 'users', u, 'agendamentos'));
    const counterRef = doc(db, 'counters', 'protocolo');
    return runTransaction(db, async (tx) => {
      const slot = await tx.get(slotRef);
      const counter = await tx.get(counterRef);
      if (slot.exists()) throw new Error('Esse horário não está mais disponível. Escolha outro.');
      const seq = (counter.exists() ? counter.data().seq : PRIMEIRO) + 1;
      const protocolo = formatar(seq);
      const ag = { protocolo, servico, data, hora, ordem: Date.now() };
      tx.set(counterRef, { seq });
      tx.set(slotRef, { data, hora, uid: u });
      tx.set(agRef, ag);
      return { id: agRef.id, ...ag };
    });
  });

export const cancelarAgendamento = (ag) =>
  seguro(async () => {
    const u = uid();
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', u, 'agendamentos', ag.id));
    batch.delete(doc(db, 'slots', slotId(ag.data, ag.hora)));
    await batch.commit();
  });
