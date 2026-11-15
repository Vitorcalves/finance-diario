import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import {
  listCategoriasLancamento,
  ultimaCategoriaPorEmpresa,
} from '../../models/categoriasLancamento';
import { listContasPorTipo } from '../../models/contas';
import {
  getEmpresaById,
  insertEmpresa,
  listCategoriasPorEmpresa,
  listEmpresas,
  updateEmpresa,
} from '../../models/empresas';
import { listDeParaItensNfce } from '../../models/nfceItensVariantes';
import { NomeRepetidoError } from '../../models/nomeRepetido';
import { listProdutos } from '../../models/produtos';
import { listProdutoVariantes } from '../../models/produtoVariantes';
import { buscarLancamentoDaNota } from '../../models/transacoesModel';
import { lerQrCodeNfce, type QrCodeNfce } from '../../utils/chaveNfce';
import { toCurrency } from '../../utils/format';
import { vibrarAviso } from '../../utils/haptics';
import type { NotaFiscalLida } from '../../utils/paginaNfceMg';
import {
  acharEmpresaDaNota,
  cadastroDaNota,
  type CatalogoNotaFiscal,
  type EmpresaDaNota,
  rascunhoDaChave,
  rascunhoDaNotaFiscal,
} from '../../utils/rascunhoDaNotaFiscal';
import type { RascunhoLancamento } from './types';

export type UseCupomFiscal = {
  /** Camera aberta no modo QR Code. */
  scannerAberto: boolean;
  abrirScanner: () => void;
  fecharScanner: () => void;
  /** Texto lido pela camera. */
  lerQrCode: (texto: string) => void;
  /** QR Code da consulta aberta na WebView; `null` com ela fechada. */
  consulta: QrCodeNfce | null;
  fecharConsulta: () => void;
  /** A pagina da SEFAZ mostrou a nota. */
  receberNota: (nota: NotaFiscalLida) => void;
  /** "Lançar sem os itens": so com o que o QR Code da. */
  lancarSemItens: () => void;
};

/** Cadastros que o rascunho da nota usa, lidos na hora (so os ativos). */
const carregarCatalogo = async (): Promise<CatalogoNotaFiscal> => {
  const [
    empresas,
    categorias,
    categoriaPorEmpresa,
    categoriasDaEmpresa,
    produtos,
    variantes,
    dePara,
    caixas,
    cartoes,
  ] = await Promise.all([
    listEmpresas(),
    listCategoriasLancamento(),
    ultimaCategoriaPorEmpresa(),
    listCategoriasPorEmpresa(),
    listProdutos(),
    listProdutoVariantes(),
    listDeParaItensNfce(),
    listContasPorTipo('caixa'),
    listContasPorTipo('cartao'),
  ]);

  return {
    empresas,
    categorias,
    categoriaPorEmpresa,
    categoriasDaEmpresa,
    produtos,
    variantes,
    dePara,
    contas: [...caixas, ...cartoes],
  };
};

/** Pergunta sim ou nao num alerta; fechar o alerta vale "nao". */
const perguntar = (titulo: string, mensagem: string, confirmar: string): Promise<boolean> =>
  new Promise((resolver) => {
    Alert.alert(
      titulo,
      mensagem,
      [
        { text: 'Agora não', style: 'cancel', onPress: (): void => resolver(false) },
        { text: confirmar, onPress: (): void => resolver(true) },
      ],
      { cancelable: true, onDismiss: (): void => resolver(false) },
    );
  });

/** `14/11` no ano corrente; `14/11/2025` em outro ano. */
const diaDoLancamento = (data: string): string => {
  const dia = dayjs(data);
  return dia.format(dia.year() === dayjs().year() ? 'DD/MM' : 'DD/MM/YYYY');
};

/**
 * Empresa do lancamento: a do CNPJ da chave (ou outra filial dela). Sem
 * nenhuma, oferece cadastrar o emitente com o CNPJ ou, se o nome ja existe sem
 * CNPJ, gravar o CNPJ nela. Recusar deixa o lancamento sem empresa (ou com a do
 * mesmo nome, sem gravar o CNPJ).
 */
const resolverEmpresa = async (
  nota: NotaFiscalLida,
  qrCode: QrCodeNfce,
  catalogo: CatalogoNotaFiscal,
): Promise<EmpresaDaNota | null> => {
  const achada = acharEmpresaDaNota(qrCode.chave.cnpj, catalogo.empresas);

  if (achada) {
    return achada.empresa;
  }

  const cadastro = cadastroDaNota(nota.emitente.nome, qrCode.chave.cnpj, catalogo.empresas);

  try {
    if (cadastro.tipo === 'gravar_cnpj') {
      const gravar = await perguntar(
        'Empresa da nota',
        `"${cadastro.empresa.nome}" já está cadastrada, sem CNPJ. Gravar nela o CNPJ ${cadastro.cnpj}? ` +
          'As próximas notas da loja já vêm com a empresa.',
        'Gravar CNPJ',
      );
      const empresa = await getEmpresaById(cadastro.empresa.id);

      if (gravar && empresa) {
        await updateEmpresa({ ...empresa, cnpj: cadastro.cnpj });
      }

      return cadastro.empresa;
    }

    const cadastrar = await perguntar(
      'Empresa nova',
      `Cadastrar "${cadastro.nome}" com o CNPJ ${cadastro.cnpj}? ` +
        'As próximas notas da loja já vêm com a empresa.',
      'Cadastrar',
    );

    if (!cadastrar) {
      return null;
    }

    const nova = { id: uuidv4(), nome: cadastro.nome, cnpj: cadastro.cnpj };
    await insertEmpresa({ ...nova, created_at: new Date().toISOString() });
    return nova;
  } catch (error: unknown) {
    if (error instanceof NomeRepetidoError) {
      Alert.alert('Nome repetido', error.message);
    } else {
      console.error('Erro ao gravar a empresa da nota', error);
      Alert.alert('Erro', 'Não foi possível gravar a empresa. O lançamento segue sem ela.');
    }

    return null;
  }
};

/**
 * Fluxo do atalho "Cupom" da Home: camera (QR Code) -> nota ja lancada? ->
 * consulta da SEFAZ na WebView -> empresa -> rascunho do formulario.
 */
export function useCupomFiscal(
  abrirRascunho: (rascunho: RascunhoLancamento) => void,
): UseCupomFiscal {
  const [scannerAberto, setScannerAberto] = useState(false);
  const [consulta, setConsulta] = useState<QrCodeNfce | null>(null);

  const abrirScanner = useCallback((): void => setScannerAberto(true), []);
  const fecharScanner = useCallback((): void => setScannerAberto(false), []);
  const fecharConsulta = useCallback((): void => setConsulta(null), []);

  /** Avisa quando a nota ja tem lancamento; "Lançar de novo" segue para a consulta. */
  const conferirRepetida = useCallback(async (qrCode: QrCodeNfce): Promise<void> => {
    try {
      const lancada = await buscarLancamentoDaNota(qrCode.chave.chave);

      if (lancada) {
        vibrarAviso();
        Alert.alert(
          'Nota já lançada',
          `Esta nota já foi lançada em ${diaDoLancamento(lancada.data)} (${toCurrency(Math.abs(lancada.valor))}).`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Lançar de novo', onPress: (): void => setConsulta(qrCode) },
          ],
        );
        return;
      }
    } catch (error: unknown) {
      // Sem a conferencia, a nota ainda pode ser lancada.
      console.error('Erro ao conferir se a nota ja foi lancada', error);
    }

    setConsulta(qrCode);
  }, []);

  const lerQrCode = useCallback(
    (texto: string): void => {
      setScannerAberto(false);
      const leitura = lerQrCodeNfce(texto);

      if (!leitura.ok) {
        vibrarAviso();
        Alert.alert('QR Code não reconhecido', leitura.mensagem);
        return;
      }

      void conferirRepetida(leitura.qrCode);
    },
    [conferirRepetida],
  );

  const receberNota = useCallback(
    (nota: NotaFiscalLida): void => {
      const qrCode = consulta;
      setConsulta(null);

      if (!qrCode) {
        return;
      }

      void (async (): Promise<void> => {
        try {
          const catalogo = await carregarCatalogo();
          const empresa = await resolverEmpresa(nota, qrCode, catalogo);
          abrirRascunho(rascunhoDaNotaFiscal(nota, qrCode, catalogo, empresa));
        } catch (error: unknown) {
          console.error('Erro ao preparar o lancamento da nota', error);
          Alert.alert('Erro', 'Não foi possível preparar o lançamento da nota.');
        }
      })();
    },
    [abrirRascunho, consulta],
  );

  const lancarSemItens = useCallback((): void => {
    const qrCode = consulta;
    setConsulta(null);

    if (!qrCode) {
      return;
    }

    void (async (): Promise<void> => {
      try {
        const catalogo = await carregarCatalogo();
        const achada = acharEmpresaDaNota(qrCode.chave.cnpj, catalogo.empresas);
        abrirRascunho(rascunhoDaChave(qrCode, catalogo, achada?.empresa ?? null));
      } catch (error: unknown) {
        console.error('Erro ao preparar o lancamento da nota', error);
        Alert.alert('Erro', 'Não foi possível preparar o lançamento da nota.');
      }
    })();
  }, [abrirRascunho, consulta]);

  return {
    scannerAberto,
    abrirScanner,
    fecharScanner,
    lerQrCode,
    consulta,
    fecharConsulta,
    receberNota,
    lancarSemItens,
  };
}
