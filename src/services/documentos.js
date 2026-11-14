// Documentos simulados (HTML) que o expo-print transforma em PDF ou imprime.
// Mesmo conteúdo e visual dos PDFs do app web.
import { brl, brDate, fmtBR, pad2, todayISO } from '../utils.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Valores "falsos" mas estáveis (linha digitável, barras, códigos) ---------- */
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function rng(seed) {
  let a = xmur3(String(seed))();
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const digits = (seed, len) => { const r = rng(seed); let s = ''; while (s.length < len) s += Math.floor(r() * 10); return s; };
const codigo = (seed) => {
  const r = rng('cod-' + seed); let s = '';
  for (let i = 0; i < 16; i++) s += '0123456789ABCDEF'[Math.floor(r() * 16)];
  return s.match(/.{4}/g).join('-');
};
const linhaDigitavel = (user, p) => {
  const d = digits(`${user.id}-ld-${p.n}`, 47);
  return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d.slice(32, 33)} ${d.slice(33)}`;
};
const autenticacao = (user, p) => codigo(`aut-${user.id}-${p.n}`);
const barras = (seed) => {
  const r = rng('bar-' + seed);
  let h = '';
  for (let i = 0; i < 64; i++) h += `<i style="width:${1 + Math.floor(r() * 3)}px;margin-right:${1 + Math.floor(r() * 3)}px"></i>`;
  return `<div class="bars">${h}</div>`;
};
const agora = () => { const d = new Date(); return `${fmtBR(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

/* ---------- Layout base ---------- */
const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #17294f; }
.page { position: relative; width: 210mm; height: 296mm; overflow: hidden; }
.hdr { background: #3f7fe6; color: #fff; height: 26mm; padding: 7mm 14mm; display: flex; justify-content: space-between; }
.hdr b { font-size: 24px; } .hdr span { font-size: 11px; }
.hdr small { font-size: 10px; }
.wm { position: absolute; top: 125mm; left: 22mm; font-size: 112px; font-weight: bold; color: #edf2fc; transform: rotate(-35deg); z-index: 0; }
.body { position: relative; z-index: 1; padding: 0 14mm; }
h1 { color: #3f7fe6; font-size: 19px; margin: 11mm 0 6mm; }
.box { background: #eef2fb; padding: 5mm; display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-bottom: 6mm; }
.l { display: block; color: #59688f; font-size: 10px; margin-bottom: 1mm; }
.v { font-size: 13px; font-weight: bold; }
.banner { padding: 4.5mm 5mm; font-weight: bold; font-size: 15px; margin-bottom: 7mm; text-transform: uppercase; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm 8mm; }
.full { grid-column: 1 / -1; } .full .v { font-weight: normal; font-size: 12px; line-height: 1.45; }
.big { font-size: 30px; color: #3f7fe6; font-weight: bold; }
.hr { border-top: 1px solid #c7d3ee; margin: 6mm 0; }
.ld { font-size: 15px; font-weight: bold; letter-spacing: .3px; }
.bars { display: flex; height: 24mm; margin: 6mm 0 5mm; } .bars i { display: block; height: 100%; background: #000; }
.note { font-size: 11px; }
h2 { color: #3f7fe6; font-size: 14px; margin: 0 0 4mm; }
.tl { position: relative; padding-left: 7mm; border-left: 2px solid #b6c9f1; margin-left: 2mm; }
.tl div { position: relative; font-size: 12px; margin-bottom: 4.5mm; }
.tl div::before { content: ''; position: absolute; left: -9.6mm; top: 1px; width: 9px; height: 9px; background: #3f7fe6; }
.tl b { display: inline-block; width: 26mm; }
table { width: 100%; border-collapse: collapse; margin-top: 2mm; }
th { background: #3f7fe6; color: #fff; text-align: left; font-size: 11px; padding: 3mm; }
td { font-size: 12px; padding: 3.4mm 3mm; border-bottom: 1px solid #dfe6f6; } td.sm { font-size: 9px; }
.total { color: #3f7fe6; font-weight: bold; font-size: 15px; margin-top: 6mm; }
.cod { position: absolute; left: 14mm; bottom: 27mm; font-size: 11px; font-weight: bold; z-index: 1; }
.foot { position: absolute; left: 14mm; right: 14mm; bottom: 10mm; border-top: 1px solid #c7d3ee; padding-top: 3mm; font-size: 10px; color: #59688f; z-index: 1; }
`;

const layout = ({ titulo, corpo, rodape, cod }) => `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${CSS}</style></head>
<body><div class="page">
  <div class="wm">SIMULADO</div>
  <div class="hdr"><div><b>Pref+</b><br><span>Prefeitura Municipal - Portal do Cidadão</span></div><small>Emitido em ${agora()}</small></div>
  <div class="body"><h1>${esc(titulo)}</h1>${corpo}</div>
  ${cod ? `<div class="cod">Código de verificação: ${esc(cod)}</div>` : ''}
  <div class="foot">${esc(rodape)}<br>Documento gerado pela demonstração do Pref+. Sem valor fiscal ou legal.</div>
</div></body></html>`;

const item = (label, valor, extra = '') => `<div class="${extra}"><span class="l">${esc(label)}</span><span class="v">${esc(valor)}</span></div>`;

const pessoa = (u) =>
  `<div class="box">${item('Cidadão', u.nome)}${item('E-mail', u.email)}${item('Usuário', '@' + u.usuario)}${item('Telefone', u.telefone || 'Não informado')}</div>`;

const contribuinte = (u, iptu) =>
  `<div class="box">${item('Contribuinte', u.nome)}${item('E-mail', u.email)}${item('Imóvel', iptu.imovel)}${item('Inscrição imobiliária', iptu.inscricao)}</div>`;

const COR = {
  ok: ['#dcf5e8', '#12805a'],
  info: ['#dbeafd', '#1f54bf'],
  warn: ['#fdf0cc', '#996600'],
  bad: ['#fde3e3', '#a61f1f'],
};
const tipoPdf = (s) =>
  ({ Ativo: 'ok', Concluído: 'ok', Respondida: 'ok', Confirmado: 'ok', 'Em andamento': 'info', 'Em análise': 'info', Recebida: 'info', Vencido: 'bad' }[s] || 'warn');
const banner = (status, rotulo = 'Situação') => {
  const [bg, fg] = COR[tipoPdf(status)];
  return `<div class="banner" style="background:${bg};color:${fg}">${esc(rotulo)}: ${esc(status)}</div>`;
};

// campos: [rótulo, valor, linhaInteira?]
const campos = (lista) => `<div class="grid">${lista.map(([l, v, full]) => item(l, v, full ? 'full' : '')).join('')}</div>`;

const timeline = (etapas) =>
  `<div class="hr"></div><h2>Andamento</h2><div class="tl">${etapas.map((e) => `<div><b>${esc(e.data)}</b>${esc(e.texto)}</div>`).join('')}</div>`;

/* ---------- IPTU ---------- */
export function docSegundaVia(user, iptu, p) {
  const n = pad2(p.n);
  return {
    nome: `segunda-via-iptu-${iptu.ano}-parcela-${n}.pdf`,
    html: layout({
      titulo: `2ª via - IPTU ${iptu.ano} - Parcela ${n}/${pad2(iptu.parcelas.length)}`,
      corpo: `${contribuinte(user, iptu)}
        <div class="grid" style="margin-top:8mm"><div><span class="l">Vencimento</span><span class="v" style="font-size:18px">${esc(p.vencimento)}</span></div>
        <div><span class="l">Valor a pagar</span><span class="big">${brl(p.valor)}</span></div></div>
        <div class="hr"></div><span class="l">Linha digitável</span><div class="ld">${linhaDigitavel(user, p)}</div>
        ${barras(`${user.id}-${p.n}`)}
        <div class="note">Pague em qualquer banco, lotérica ou pelo app do seu banco (PIX e boleto).</div>`,
      rodape: `Segunda via da parcela ${n}. Situação: em aberto.`,
    }),
  };
}

export function docComprovanteParcela(user, iptu, p) {
  const n = pad2(p.n);
  const [bg, fg] = COR.ok;
  return {
    nome: `comprovante-iptu-${iptu.ano}-parcela-${n}.pdf`,
    html: layout({
      titulo: `Comprovante de pagamento - IPTU ${iptu.ano} - Parcela ${n}`,
      corpo: `${contribuinte(user, iptu)}
        <div class="banner" style="background:${bg};color:${fg}">Pagamento confirmado</div>
        <div class="grid" style="grid-template-columns:1fr 1fr 1fr">
          ${item('Parcela', `${n} de ${pad2(iptu.parcelas.length)}`)}${item('Vencimento', p.vencimento)}${item('Pago em', p.pagoEm || p.vencimento)}
        </div>
        <div class="grid" style="margin-top:8mm"><div><span class="l">Valor pago</span><span class="big">${brl(p.valor)}</span></div>
        ${item('Forma de pagamento', 'PIX (simulado)')}</div>
        <div class="hr"></div>${item('Autenticação', autenticacao(user, p))}`,
      rodape: `Comprovante da parcela ${n}. Guarde este documento.`,
    }),
  };
}

function docLista(user, iptu, { titulo, nome, parcelas, cols, linha, rodape }) {
  const total = parcelas.reduce((s, p) => s + p.valor, 0);
  return {
    nome,
    html: layout({
      titulo,
      corpo: `${contribuinte(user, iptu)}
        <table><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>
        ${parcelas.map((p) => `<tr>${linha(p).map(([t, cls]) => `<td class="${cls || ''}">${esc(t)}</td>`).join('')}</tr>`).join('')}</table>
        <div class="total">Total: ${brl(total)}</div>`,
      rodape,
    }),
  };
}

export const docSegundaViaLista = (user, iptu) =>
  docLista(user, iptu, {
    titulo: `2ª via - IPTU ${iptu.ano} - Parcelas em aberto`,
    nome: `segunda-via-iptu-${iptu.ano}-em-aberto.pdf`,
    parcelas: iptu.parcelas.filter((p) => !p.paga),
    cols: ['Parcela', 'Vencimento', 'Valor', 'Linha digitável'],
    linha: (p) => [[pad2(p.n)], [p.vencimento], [brl(p.valor)], [linhaDigitavel(user, p), 'sm']],
    rodape: 'Segunda via das parcelas em aberto.',
  });

export const docComprovanteLista = (user, iptu) =>
  docLista(user, iptu, {
    titulo: `Comprovante de pagamentos - IPTU ${iptu.ano}`,
    nome: `comprovantes-iptu-${iptu.ano}.pdf`,
    parcelas: iptu.parcelas.filter((p) => p.paga),
    cols: ['Parcela', 'Pago em', 'Valor', 'Autenticação'],
    linha: (p) => [[pad2(p.n)], [p.pagoEm || p.vencimento], [brl(p.valor)], [autenticacao(user, p)]],
    rodape: 'Comprovante das parcelas pagas.',
  });

/* ---------- Demais telas ---------- */
export const docAlvara = (user, a) => ({
  nome: `alvara-${a.numero}.pdf`,
  html: layout({
    titulo: `${a.status === 'Em análise' ? 'Solicitação de alvará' : 'Comprovante de alvará'} nº ${a.numero}`,
    corpo: `${pessoa(user)}${banner(a.status)}${campos([
      ['Número do alvará', a.numero], ['Validade', a.validade],
      ['Empresa', a.empresa, true], ['Atividade', a.atividade, true],
    ])}`,
    rodape: { Ativo: 'Alvará ativo.', 'Em análise': 'Solicitação em andamento. Este documento não autoriza o funcionamento.', Vencido: 'Alvará vencido. Solicite a renovação.' }[a.status] || 'Comprovante de alvará.',
    cod: codigo(`alv-${user.id}-${a.numero}`),
  }),
});

export const docOuvidoria = (user, m) => ({
  nome: `manifestacao-${m.protocolo}.pdf`,
  html: layout({
    titulo: `Comprovante de manifestação ${m.protocolo}`,
    corpo: `${pessoa(user)}${banner(m.status)}${campos([
      ['Protocolo', m.protocolo], ['Data de envio', m.data], ['Tipo', m.tipo],
      ['Assunto', m.assunto, true], ['Descrição', m.descricao || 'Sem descrição registrada.', true],
    ])}`,
    rodape: m.status === 'Respondida' ? 'Manifestação respondida.' : 'Manifestação recebida e em acompanhamento pela Ouvidoria.',
    cod: codigo(`ouv-${user.id}-${m.protocolo}`),
  }),
});

export const docProcesso = (user, p) => ({
  nome: `processo-${p.numero}.pdf`,
  html: layout({
    titulo: `Comprovante de processo nº ${p.numero}`,
    corpo: `${pessoa(user)}${banner(p.status)}${campos([
      ['Número do processo', p.numero], ['Data de abertura', (p.etapas[0] && p.etapas[0].data) || '-'],
      ['Assunto', p.titulo, true],
    ])}${p.etapas.length ? timeline(p.etapas.slice(0, 16)) : ''}`,
    rodape: p.status === 'Concluído' ? 'Processo concluído.' : 'Processo em andamento. O histórico acima mostra as etapas até a emissão deste documento.',
    cod: codigo(`proc-${user.id}-${p.numero}`),
  }),
});

export function docAgendamento(user, a) {
  const realizado = a.data < todayISO();
  return {
    nome: `agendamento-${a.protocolo}.pdf`,
    html: layout({
      titulo: `Comprovante de agendamento ${a.protocolo}`,
      corpo: `${pessoa(user)}${banner(realizado ? 'Concluído' : 'Confirmado')}${campos([
        ['Protocolo', a.protocolo], ['Horário', a.hora],
        ['Data', brDate(a.data)], ['Situação do atendimento', realizado ? 'Realizado' : 'Aguardando'],
        ['Serviço', a.servico, true],
        ['Local', 'Centro de Atendimento ao Cidadão, Praça Central, 100', true],
      ])}`,
      rodape: 'Chegue com 10 minutos de antecedência e leve um documento com foto.',
      cod: codigo(`ag-${user.id}-${a.id}`),
    }),
  };
}

export const docCadastro = (user) => ({
  nome: `cadastro-${user.usuario}.pdf`,
  html: layout({
    titulo: 'Comprovante de cadastro',
    corpo: `${banner('Ativo', 'Cadastro')}${campos([
      ['Nome completo', user.nome, true], ['Usuário', '@' + user.usuario], ['Telefone', user.telefone || 'Não informado'],
      ['E-mail', user.email, true],
    ])}`,
    rodape: 'Cadastro ativo no Pref+.',
    cod: codigo(`cad-${user.id}`),
  }),
});
