import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const A4 = { width: 595, height: 842 };

// Dá ao PDF um nome legível (ex.: segunda-via-iptu-2026-parcela-03.pdf).
// No Expo SDK 57+ o File.copy() é assíncrono, então é preciso esperar (await) antes de usar o arquivo.
// Se algo falhar, devolve o PDF original (com nome temporário), que também funciona.
async function renomear(uri, nome) {
  try {
    const FS = require('expo-file-system');
    if (!FS.File || !FS.Paths) return uri;
    const destino = new FS.File(FS.Paths.cache, nome);
    if (destino.exists) destino.delete();
    await new FS.File(uri).copy(destino);
    return destino.exists ? destino.uri : uri;
  } catch {
    return uri;
  }
}

// Web: o expo-print só imprime a página atual, então imprimimos o documento em um iframe escondido.
// Na janela de impressão do navegador, escolha "Salvar como PDF" para baixar.
function imprimirWeb(html) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0';
  f.onload = () => {
    try {
      f.contentWindow.focus();
      f.contentWindow.print();
    } finally {
      setTimeout(() => f.remove(), 60000);
    }
  };
  f.srcdoc = html;
  document.body.appendChild(f);
}

// Abre a janela de impressão do sistema (AirPrint no iOS, serviço de impressão no Android).
// Nela também dá para escolher "Salvar como PDF".
export async function imprimir(doc) {
  if (Platform.OS === 'web') return imprimirWeb(doc.html);
  await Print.printAsync({ html: doc.html, ...A4 });
}

// Gera o PDF e abre o menu de compartilhamento ("Salvar em Arquivos", WhatsApp, e-mail, etc.)
export async function baixarPdf(doc) {
  if (Platform.OS === 'web') return imprimirWeb(doc.html);
  let uri;
  try {
    ({ uri } = await Print.printToFileAsync({ html: doc.html, ...A4 }));
  } catch (e) {
    console.warn('Falha ao gerar o PDF:', e);
    throw new Error(`Não foi possível gerar o PDF. ${e && e.message ? e.message : ''}`.trim());
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Compartilhar arquivos não está disponível neste aparelho. Use o botão Imprimir e escolha "Salvar como PDF".');
  }

  const arquivo = await renomear(uri, doc.nome);
  try {
    await Sharing.shareAsync(arquivo, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.nome });
  } catch (e) {
    console.warn('Falha ao compartilhar o PDF:', e);
    // se o arquivo renomeado deu problema, tenta de novo com o PDF original
    if (arquivo !== uri) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: doc.nome });
    } else {
      throw new Error(`Não foi possível compartilhar o PDF. ${e && e.message ? e.message : ''}`.trim());
    }
  }
}
