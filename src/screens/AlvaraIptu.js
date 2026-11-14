import React, { useCallback, useEffect, useState } from 'react';
import { View, Keyboard, Platform } from 'react-native';
import {
  Shell, T, B, Btn, Field, Select, Card, CardTitle, CardText, Title, SectionLabel, Note, Empty,
  Loading, ErrorBox, Actions, DocRow, DocBtns, Status, SearchBox,
} from '../components/ui';
import { useSession, useUI } from '../context';
import { listarAlvaras, solicitarAlvara, obterIptu, pagarParcela } from '../services/data';
import { docAlvara, docSegundaVia, docComprovanteParcela, docSegundaViaLista, docComprovanteLista } from '../services/documentos';
import { ATIVIDADES, brl, dotFor, norm, pad2 } from '../utils';
import { C } from '../theme';

/* ---------- Alvará ---------- */
function NovoAlvara({ onFeito }) {
  const { closeSheet } = useUI();
  const [empresa, setEmpresa] = useState('');
  const [atividade, setAtividade] = useState(ATIVIDADES[0]);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const enviar = async () => {
    setErro(''); setBusy(true);
    try {
      const r = await solicitarAlvara({ empresa, atividade });
      closeSheet();
      onFeito(r.numero);
    } catch (e) {
      setErro(e.message); setBusy(false);
    }
  };
  return (
    <View>
      <T w={800} style={{ fontSize: 18, color: C.blue, marginBottom: 12 }}>Solicitar novo alvará</T>
      <ErrorBox>{erro}</ErrorBox>
      <Field label="Nome da empresa" value={empresa} onChangeText={setEmpresa} placeholder="Ex.: Padaria Pão Quente ME" />
      <Select label="Atividade" value={atividade} options={ATIVIDADES} onChange={setAtividade} />
      <Btn label={busy ? 'Enviando...' : 'Enviar solicitação'} onPress={enviar} disabled={busy} block />
    </View>
  );
}

export function Alvara() {
  const { user } = useSession();
  const { openSheet, toast } = useUI();
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');
  const [q, setQ] = useState('');

  const carregar = useCallback(async () => {
    try { setLista(await listarAlvaras()); setErro(''); } catch (e) { setErro(e.message); }
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const f = norm(q.trim());
  const rows = (lista || []).filter((a) => !f || norm(`${a.numero} ${a.empresa}`).includes(f));

  return (
    <Shell nav="home">
      <Title>ALVARÁ</Title>
      <SearchBox value={q} onChangeText={setQ} placeholder="Consulte seu alvará..." accessibilityLabel="Consultar alvará" />
      <View style={{ gap: 12 }}>
        <Btn label="CONSULTAR" onPress={Keyboard.dismiss} block />
        <Btn
          label="+ SOLICITAR NOVO ALVARÁ"
          block
          onPress={() => openSheet(<NovoAlvara onFeito={(numero) => { toast(`Solicitação enviada. Processo ${numero}`); carregar(); }} />)}
        />
      </View>
      <View style={{ marginTop: 18 }}>
        {erro ? <ErrorBox>{erro}</ErrorBox> : lista === null ? <Loading /> : rows.length === 0 ? (
          <Empty>Nenhum alvará encontrado para essa busca.</Empty>
        ) : rows.map((a) => (
          <Card key={a.numero}>
            <CardTitle>Alvará nº {a.numero}</CardTitle>
            <CardText>{a.empresa}{'\n'}{a.atividade}</CardText>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <CardText>Status: </CardText>
              <Status tipo={dotFor(a.status)}>{a.status}</Status>
            </View>
            <CardText>Validade: {a.validade}</CardText>
            <Actions>
              <DocBtns build={() => docAlvara(user, a)} rotulo={`comprovante do alvará ${a.numero}`} />
            </Actions>
          </Card>
        ))}
      </View>
      <Note>Dados de demonstração, simulando a consulta ao gov.</Note>
    </Shell>
  );
}

/* ---------- IPTU ---------- */
const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

function PagarSheet({ user, d, prox, onPago }) {
  const { closeSheet, toast } = useUI();
  const [busy, setBusy] = useState(false);
  const simular = async () => {
    setBusy(true);
    try {
      const novo = await pagarParcela(prox.n);
      closeSheet();
      onPago(novo);
      toast('Pagamento confirmado.');
    } catch (e) {
      toast(e.message); setBusy(false);
    }
  };
  return (
    <View>
      <T w={800} style={{ fontSize: 18, color: C.blue, marginBottom: 12 }}>Pagar parcela {pad2(prox.n)}</T>
      <T style={{ fontSize: 12, marginBottom: 14 }}>
        Valor: <B style={{ fontSize: 12 }}>{brl(prox.valor)}</B> · vencimento {prox.vencimento}
      </T>
      <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 10, marginBottom: 12 }}>
        <T style={{ fontSize: 11, fontFamily: mono }}>{`00020126580014BR.GOV.PREF+0136IPTU2026-${pad2(prox.n)}5204000053039865406125.005802BR`}</T>
      </View>
      <DocRow label="2ª via desta parcela">
        <DocBtns build={() => docSegundaVia(user, d, prox)} rotulo={`2ª via da parcela ${pad2(prox.n)}`} />
      </DocRow>
      <View style={{ gap: 12, marginTop: 4 }}>
        <Btn label={busy ? 'Processando...' : 'Simular pagamento'} onPress={simular} disabled={busy} block />
        <Btn kind="ghost" label="Cancelar" onPress={closeSheet} block />
      </View>
    </View>
  );
}

export function Iptu() {
  const { user } = useSession();
  const { openSheet } = useUI();
  const [d, setD] = useState(null);
  const [erro, setErro] = useState('');
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    obterIptu().then(setD).catch((e) => setErro(e.message));
  }, []);

  if (!d) {
    return (
      <Shell nav="home">
        <Title>MEU IPTU</Title>
        {erro ? <ErrorBox>{erro}</ErrorBox> : <Loading />}
      </Shell>
    );
  }

  const pagas = d.parcelas.filter((p) => p.paga).length;
  const aberto = d.parcelas.filter((p) => !p.paga).reduce((s, p) => s + p.valor, 0);
  const quitado = pagas === d.parcelas.length;
  const prox = d.parcelas.find((p) => !p.paga);

  return (
    <Shell nav="home">
      <Title>MEU IPTU</Title>
      <Card>
        <CardTitle>IPTU {d.ano}</CardTitle>
        <CardText>Imóvel: {d.imovel}{'\n'}Inscrição: {d.inscricao}</CardText>
        <CardText>Valor total: <B style={{ fontSize: 13 }}>{brl(d.total)}</B></CardText>
        <CardText>Em aberto: <B style={{ fontSize: 13 }}>{brl(aberto)}</B></CardText>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <CardText>Status: </CardText>
          <Status tipo={quitado ? 'ok' : 'warn'}>{quitado ? 'Quitado' : 'Em aberto'}</Status>
        </View>
      </Card>

      <View style={{ gap: 12 }}>
        <Btn label="Pagar IPTU" disabled={quitado} block
          onPress={() => openSheet(<PagarSheet user={user} d={d} prox={prox} onPago={setD} />)} />
        <Btn label={mostrar ? 'Ocultar parcelas' : 'Ver parcelas'} block onPress={() => setMostrar(!mostrar)} />
      </View>

      <SectionLabel>Imprimir e baixar</SectionLabel>
      <Card white>
        <DocRow label="2ª via das parcelas em aberto">
          <DocBtns build={() => docSegundaViaLista(user, d)} rotulo="2ª via das parcelas em aberto" disabled={!aberto} />
        </DocRow>
        <View style={{ height: 1, backgroundColor: C.line }} />
        <DocRow label="Comprovante das parcelas pagas">
          <DocBtns build={() => docComprovanteLista(user, d)} rotulo="comprovante das parcelas pagas" disabled={!pagas} />
        </DocRow>
      </Card>

      {mostrar && (
        <Card white style={{ marginTop: 2 }}>
          <CardTitle>Parcelas</CardTitle>
          {d.parcelas.map((p, i) => (
            <View key={p.n} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: C.line }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <B style={{ fontSize: 12 }}>Parcela {pad2(p.n)}</B>
                <T w={700} style={{ fontSize: 12 }}>{brl(p.valor)}</T>
              </View>
              <T style={{ fontSize: 11, marginTop: 2 }}>vence {p.vencimento}</T>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                <Status tipo={p.paga ? 'ok' : 'bad'}>{p.paga ? 'Paga' : 'Pendente'}</Status>
                <T style={{ fontSize: 11 }}> ({p.paga ? 'comprovante' : '2ª via'})</T>
              </View>
              <Actions>
                <DocBtns
                  build={() => (p.paga ? docComprovanteParcela(user, d, p) : docSegundaVia(user, d, p))}
                  rotulo={`${p.paga ? 'comprovante' : '2ª via'} da parcela ${pad2(p.n)}`}
                />
              </Actions>
            </View>
          ))}
        </Card>
      )}
      <Note>Dados de demonstração, simulando a consulta ao gov.</Note>
    </Shell>
  );
}
