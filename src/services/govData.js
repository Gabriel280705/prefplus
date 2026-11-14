import { fmtBR, IPTU_ANO } from '../utils.js';

// Dados genéricos que simulam o retorno do gov. São gravados no Firestore
// quando a conta é criada. Para ligar em um gov real, troque esta função
// por chamadas às APIs oficiais.
export function govData() {
  const parcelas = [];
  for (let i = 0; i < 10; i++) {
    parcelas.push({
      n: i + 1,
      valor: 125,
      vencimento: fmtBR(new Date(2026, 7 + i, 10)),
      paga: i < 2,
      pagoEm: i < 2 ? fmtBR(new Date(2026, 7 + i, 8)) : null,
    });
  }
  return {
    alvaras: [
      { numero: '2026-001245', empresa: 'Comércio XYZ Ltda.', atividade: 'Comércio varejista', status: 'Ativo', validade: '31/12/2026', ordem: 2 },
      { numero: '2025-000318', empresa: 'Comércio XYZ Ltda. (Filial)', atividade: 'Comércio varejista', status: 'Vencido', validade: '30/06/2026', ordem: 1 },
    ],
    iptu: { ano: IPTU_ANO, imovel: 'Rua Exemplo, 123', inscricao: '01.02.034.0567.001', total: 1250, parcelas },
    processos: [
      {
        numero: '2026-001245', titulo: 'Solicitação de Alvará', status: 'Em andamento', ordem: 2,
        etapas: [
          { data: '12/08/2026', texto: 'Processo protocolado' },
          { data: '14/08/2026', texto: 'Documentos conferidos' },
          { data: '20/08/2026', texto: 'Vistoria agendada' },
        ],
      },
      {
        numero: '2026-000982', titulo: 'Regularização de imóvel', status: 'Em análise', ordem: 1,
        etapas: [
          { data: '03/07/2026', texto: 'Processo protocolado' },
          { data: '09/07/2026', texto: 'Encaminhado ao setor de Obras' },
        ],
      },
    ],
    ouvidoria: [
      { protocolo: '2026-004101', tipo: 'Sugestão', assunto: 'Iluminação da praça central', descricao: '', data: '02/08/2026', status: 'Respondida', ordem: 1 },
    ],
  };
}
