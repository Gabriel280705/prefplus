import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, Keyboard } from 'react-native';
import {
  Shell, T, Btn, Field, Select, DateField, Card, CardTitle, CardText, Title, SectionLabel, Empty,
  Loading, ErrorBox, SuccessBox, Actions, DocBtns, Status, SearchBox, Icon,
} from '../components/ui';
import { useSession, useUI } from '../context';
import {
  listarOuvidoria, enviarManifestacao, listarProcessos,
  listarAgendamentos, horariosDoDia, agendar, cancelarAgendamento,
} from '../services/data';
import { docOuvidoria, docProcesso, docAgendamento } from '../services/documentos';
import { SERVICOS_ATENDIMENTO, TIPOS_OUVIDORIA, brDate, dotFor, fmtBR, isoOf, norm, todayISO } from '../utils';
import { C } from '../theme';

/* ---------- Ouvidoria ---------- */
export function Ouvidoria() {
  const { user } = useSession();
  const [tipo, setTipo] = useState('');
  const [assunto, setAssunto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lista, setLista] = useState(null);
  const [erroLista, setErroLista] = useState('');

  const carregar = useCallback(async () => {
    try { setLista(await listarOuvidoria()); setErroLista(''); } catch (e) { setErroLista(e.message); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const enviar = async () => {
    setErro(''); setBusy(true);
    try {
      const r = await enviarManifestacao({ tipo, assunto, descricao });
      setTipo(''); setAssunto(''); setDescricao('');
      // comprovante logo após enviar
      const nova = { protocolo: r.protocolo, tipo, assunto, descricao, data: fmtBR(new Date()), status: 'Recebida' };
      setOk(nova);
      carregar();
    } catch (e) {
      setErro(e.message);
    }
    setBusy(false);
  };

  return (
    <Shell nav="ouvidoria">
      <Title>OUVIDORIA</Title>
      <T w={600} style={{ textAlign: 'center', color: C.blue, fontSize: 13, marginBottom: 14 }}>Como podemos ajudar?</T>
      <ErrorBox>{erro}</ErrorBox>
      <Select label="Tipo de manifestação" value={tipo} options={TIPOS_OUVIDORIA} onChange={setTipo} />
      <Field label="Assunto" value={assunto} onChangeText={setAssunto} placeholder="Digite o assunto..." />
      <Field label="Solicitação" value={descricao} onChangeText={setDescricao} placeholder="Descreva sua solicitação..." multiline />
      <Btn label={busy ? 'ENVIANDO...' : 'ENVIAR MANIFESTAÇÃO'} onPress={enviar} disabled={busy} block />
      {ok && (
        <SuccessBox title="Manifestação enviada!" footer={<DocBtns build={() => docOuvidoria(user, ok)} rotulo="comprovante da manifestação" />}>
          Protocolo: {ok.protocolo}
        </SuccessBox>
      )}

      <SectionLabel>Minhas manifestações</SectionLabel>
      {erroLista ? <ErrorBox>{erroLista}</ErrorBox> : lista === null ? <Loading /> : lista.length === 0 ? (
        <Empty>Você ainda não enviou manifestações.</Empty>
      ) : lista.map((m) => (
        <Card key={m.protocolo}>
          <CardTitle>{m.assunto}</CardTitle>
          <CardText>{m.tipo} · {m.data}{'\n'}Protocolo {m.protocolo}</CardText>
          <Status tipo={dotFor(m.status)}>{m.status}</Status>
          <Actions><DocBtns build={() => docOuvidoria(user, m)} rotulo={`comprovante da manifestação ${m.protocolo}`} /></Actions>
        </Card>
      ))}
    </Shell>
  );
}

/* ---------- Processos ---------- */
export function Processos() {
  const { user } = useSession();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [q, setQ] = useState('');
  const [abertos, setAbertos] = useState({});

  useEffect(() => {
    listarProcessos().then(setLista).catch((e) => setErro(e.message));
  }, []);

  const f = norm(q.trim());
  const rows = (lista || []).filter((p) => !f || norm(`${p.numero} ${p.titulo}`).includes(f));

  return (
    <Shell nav="processos">
      <Title sm>MEUS PROCESSOS</Title>
      <SearchBox value={q} onChangeText={setQ} placeholder="Consulte seus processos..." accessibilityLabel="Consultar processos" />
      <Btn label="CONSULTAR" onPress={Keyboard.dismiss} block />
      <View style={{ marginTop: 18 }}>
        {erro ? <ErrorBox>{erro}</ErrorBox> : lista === null ? <Loading /> : rows.length === 0 ? (
          <Empty>Nenhum processo encontrado.</Empty>
        ) : rows.map((p) => {
          const aberto = !!abertos[p.numero];
          return (
            <Card key={p.numero}>
              <Pressable onPress={() => setAbertos((a) => ({ ...a, [p.numero]: !a[p.numero] }))} accessibilityRole="button" accessibilityState={{ expanded: aberto }}>
                <CardTitle>Processo nº {p.numero}</CardTitle>
                <CardText>{p.titulo}</CardText>
                <Status tipo={dotFor(p.status)}>{p.status}</Status>
                {!aberto && <T style={{ fontSize: 11, marginTop: 2 }}>Toque para ver o andamento</T>}
              </Pressable>
              {aberto && (
                <View style={{ marginTop: 10, marginLeft: 3, paddingLeft: 14, borderLeftWidth: 3, borderLeftColor: C.blue }}>
                  {p.etapas.map((e, i) => (
                    <View key={i} style={{ marginBottom: 8 }}>
                      <View style={{ position: 'absolute', left: -22, top: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: C.blue, borderWidth: 2, borderColor: C.card }} />
                      <T w={700} style={{ fontSize: 12, color: C.navy }}>{e.data}</T>
                      <T style={{ fontSize: 12 }}>{e.texto}</T>
                    </View>
                  ))}
                </View>
              )}
              <Actions><DocBtns build={() => docProcesso(user, p)} rotulo={`comprovante do processo ${p.numero}`} /></Actions>
            </Card>
          );
        })}
      </View>
    </Shell>
  );
}

/* ---------- Agendamento ---------- */
const proximoDiaUtil = () => {
  const d = new Date(Date.now() + 864e5);
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1); // pula fim de semana
  return isoOf(d);
};

export function Agendamento() {
  const { user } = useSession();
  const { toast } = useUI();
  const [servico, setServico] = useState(SERVICOS_ATENDIMENTO[0]);
  const [data, setData] = useState(proximoDiaUtil());
  const [hora, setHora] = useState(null);
  const [slots, setSlots] = useState(null);
  const [aviso, setAviso] = useState('');
  const [erro, setErro] = useState('');
  const [ok, setOk] = useState(null);
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);

  const carregarSlots = useCallback(async (dia) => {
    setHora(null); setSlots(null); setAviso('');
    try {
      const r = await horariosDoDia(dia);
      setSlots(r.horarios);
      setAviso(r.horarios.length ? '' : r.aviso || 'Sem horários nessa data.');
    } catch (e) {
      setSlots([]); setAviso(e.message);
    }
  }, []);
  const carregarMine = useCallback(async () => {
    try { setMine(await listarAgendamentos()); } catch (e) { toast(e.message); setMine([]); }
  }, [toast]);

  useEffect(() => { carregarSlots(data); }, [data, carregarSlots]);
  useEffect(() => { carregarMine(); }, [carregarMine]);

  const confirmar = async () => {
    setErro(''); setBusy(true);
    try {
      setOk(await agendar({ servico, data, hora }));
      carregarMine(); carregarSlots(data);
    } catch (e) {
      setErro(e.message); setOk(null); carregarSlots(data);
    }
    setBusy(false);
  };

  const cancelar = async (a) => {
    try {
      await cancelarAgendamento(a);
      toast('Agendamento cancelado.');
      carregarMine(); carregarSlots(data);
    } catch (e) { toast(e.message); }
  };

  return (
    <Shell nav="home">
      <Title sm>AGENDAMENTO</Title>
      <ErrorBox>{erro}</ErrorBox>
      {ok && (
        <SuccessBox title="Agendamento confirmado!" footer={<DocBtns build={() => docAgendamento(user, ok)} rotulo="comprovante do agendamento" />}>
          {brDate(ok.data)} às {ok.hora} · Protocolo {ok.protocolo}
        </SuccessBox>
      )}
      <View style={{ height: ok ? 14 : 0 }} />
      <Select label="Escolha o serviço" value={servico} options={SERVICOS_ATENDIMENTO} onChange={setServico} />
      <DateField label="Escolha a data" value={data} onChange={setData} min={todayISO()} />

      <T w={800} style={{ fontSize: 12, color: C.navy, marginTop: 4, marginBottom: 8 }}>Horários disponíveis</T>
      {slots === null ? <Loading text="Buscando horários..." /> : slots.length === 0 ? (
        <Empty>{aviso}</Empty>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          {slots.map((h) => {
            const sel = hora === h.hora;
            return (
              <Pressable key={h.hora} disabled={!h.livre} onPress={() => setHora(h.hora)} accessibilityRole="button"
                accessibilityState={{ selected: sel, disabled: !h.livre }}
                style={{ width: '31.5%', backgroundColor: sel ? C.blue : '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center', opacity: h.livre ? 1 : 0.4 }}>
                <T w={700} style={{ fontSize: 13, color: sel ? '#fff' : C.ink, textDecorationLine: h.livre ? 'none' : 'line-through' }}>{h.hora}</T>
              </Pressable>
            );
          })}
        </View>
      )}
      <Btn label={busy ? 'CONFIRMANDO...' : 'CONFIRMAR AGENDAMENTO'} onPress={confirmar} disabled={!hora || busy} block />

      <SectionLabel>Meus agendamentos</SectionLabel>
      {mine === null ? <Loading text="" /> : mine.length === 0 ? (
        <Empty>Você não tem agendamentos.</Empty>
      ) : mine.map((a) => (
        <Card key={a.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <CardTitle>{a.servico}</CardTitle>
              <CardText>{brDate(a.data)} às {a.hora}{'\n'}Protocolo {a.protocolo}</CardText>
            </View>
            <Btn kind="light" sm label="" accessibilityLabel="Cancelar agendamento" onPress={() => cancelar(a)} icon={<Icon name="trash" color={C.blue} />} style={{ paddingHorizontal: 10 }} />
          </View>
          <Actions><DocBtns build={() => docAgendamento(user, a)} rotulo={`comprovante do agendamento ${a.protocolo}`} /></Actions>
        </Card>
      ))}
    </Shell>
  );
}
