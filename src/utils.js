export const SERVICOS_ATENDIMENTO = ['Atendimento Tributário', 'Protocolo Geral', 'Obras e Posturas', 'Meio Ambiente', 'Assistência Social'];
export const TIPOS_OUVIDORIA = ['Reclamação', 'Sugestão', 'Elogio', 'Denúncia', 'Solicitação'];
export const ATIVIDADES = ['Comércio varejista', 'Prestação de serviços', 'Alimentação', 'Indústria', 'Profissional autônomo'];
export const SLOTS = ['09:00', '09:30', '10:00', '10:30', '14:00', '14:30', '15:00', '15:30'];
export const IPTU_ANO = 2026;

export const pad2 = (n) => String(n).padStart(2, '0');
export const brl = (n) => 'R$ ' + Number(n).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const brDate = (iso) => String(iso).split('-').reverse().join('/');
export const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const fmtBR = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
export const isoOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const todayISO = () => isoOf(new Date());
export const parseISO = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d, 12); // meio-dia evita problemas de fuso
};
export const first = (nome) => String(nome || '').trim().split(/\s+/)[0] || 'cidadão';

// Cor da bolinha de status nas telas: ok / info / bad / warn
export const dotFor = (s) =>
  ({ Ativo: 'ok', 'Em andamento': 'ok', Concluído: 'ok', Respondida: 'ok', Vencido: 'bad', 'Em análise': 'info', Recebida: 'info' }[s] || 'warn');
