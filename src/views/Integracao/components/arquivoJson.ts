// src/.../integracao/arquivoJson.ts
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

/** Abre o seletor do sistema e devolve o conteúdo do .json escolhido (ou null se cancelar). */
export async function escolherArquivoJson(): Promise<string | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (resultado.canceled || resultado.assets.length === 0) return null;

  return FileSystem.readAsStringAsync(resultado.assets[0].uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

/** Grava o JSON no cache e abre a folha de compartilhamento (Salvar em Arquivos, Drive, etc). */
export async function salvarArquivoJson(nome: string, conteudo: string): Promise<void> {
  const nomeSeguro = nome.replace(/[^a-zA-Z0-9._-]/g, '_');
  const caminho = `${FileSystem.cacheDirectory}${nomeSeguro}`;

  await FileSystem.writeAsStringAsync(caminho, conteudo, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(caminho, {
      mimeType: 'application/json',
      dialogTitle: 'Salvar backup',
      UTI: 'public.json',
    });
  }
}