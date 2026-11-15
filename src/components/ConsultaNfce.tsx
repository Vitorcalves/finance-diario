import Ionicons from '@expo/vector-icons/Ionicons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet, View } from 'react-native';
import type { WebViewMessageEvent, WebViewProps } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fontSize, fontWeight, iconSize, makeStyles, radius, spacing, useTheme } from '../theme';
import {
  ehPaginaDaSefazMg,
  HOST_CONSULTA_MG,
  type QrCodeNfce,
  urlConsultaMg,
  urlPermitidaNaConsulta,
} from '../utils/chaveNfce';
import { vibrarSucesso } from '../utils/haptics';
import { interpretarPaginaNfceMg, type NotaFiscalLida } from '../utils/paginaNfceMg';
import { Button, EmptyState, LoadingState, ScreenHeader, Text } from './ui';

type ComponenteWebView = typeof import('react-native-webview').WebView;

let webViewCarregada: ComponenteWebView | null | undefined;

/**
 * A WebView e carregada sob demanda: o `react-native-webview` pede o modulo
 * nativo (`RNCWebViewModule`) ja ao ser importado, e num build feito antes dele
 * o `import` direto derrubaria o app inteiro. Assim so a consulta fica
 * indisponivel, com o "Lançar sem os itens" a mao.
 */
const carregarWebView = (): ComponenteWebView | null => {
  if (webViewCarregada === undefined) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const lib = require('react-native-webview') as typeof import('react-native-webview');
      webViewCarregada = lib.WebView;
    } catch {
      webViewCarregada = null;
    }
  }

  return webViewCarregada;
};

/**
 * Roda a cada pagina carregada, so no frame principal. Confere o endereco e
 * manda o HTML ao app; um `MutationObserver` reenvia quando o conteudo muda (a
 * nota pode chegar por atualizacao parcial da pagina), no maximo a cada 400 ms
 * e so se o HTML mudou. O script nao mexe na pagina: nao toca no widget da
 * verificacao nem clica em "Visualizar".
 */
const SCRIPT_LEITURA = `
(function () {
  if (window.__financeDiarioNfce) { return; }
  window.__financeDiarioNfce = true;
  if (location.protocol !== 'https:' || location.hostname !== '${HOST_CONSULTA_MG}') { return; }
  var ultimo = '';
  var espera = null;
  function enviar() {
    espera = null;
    var html = document.documentElement ? document.documentElement.outerHTML : '';
    if (!html || html === ultimo) { return; }
    ultimo = html;
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ tipo: 'pagina', url: location.href, html: html })
    );
  }
  enviar();
  new MutationObserver(function () {
    if (espera === null) { espera = setTimeout(enviar, 400); }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();
true;
`;

/** Teto do HTML aceito: a pagina da nota tem dezenas de KB. */
const TAMANHO_MAXIMO_HTML = 5_000_000;

type MensagemPagina = { tipo: 'pagina'; url: string; html: string };

/** Mensagem do script, ou `null` se veio outra coisa. */
const lerMensagem = (dados: string): MensagemPagina | null => {
  if (dados.length > TAMANHO_MAXIMO_HTML) {
    return null;
  }

  try {
    const mensagem: unknown = JSON.parse(dados);

    if (
      typeof mensagem === 'object' &&
      mensagem !== null &&
      (mensagem as MensagemPagina).tipo === 'pagina' &&
      typeof (mensagem as MensagemPagina).url === 'string' &&
      typeof (mensagem as MensagemPagina).html === 'string'
    ) {
      return mensagem as MensagemPagina;
    }
  } catch {
    // Mensagem que nao e do script: ignorada.
  }

  return null;
};

type Situacao =
  | { tipo: 'aguardando' }
  | { tipo: 'nao_encontrada'; mensagem: string }
  | { tipo: 'outra_nota' }
  | { tipo: 'erro_http'; status: number };

type PedidoDeNavegacao = Parameters<NonNullable<WebViewProps['onShouldStartLoadWithRequest']>>[0];
type ErroHttp = Parameters<NonNullable<WebViewProps['onHttpError']>>[0];

/** So em desenvolvimento: um arquivo por vez no cache, apagado ao fechar a consulta. */
const ARQUIVO_CAPTURA = `${FileSystem.cacheDirectory ?? ''}nfce-pagina.html`;

type ConsultaNfceProps = {
  qrCode: QrCodeNfce;
  /** A pagina mostrou a nota: a tela fecha e o rascunho e montado. */
  onNota: (nota: NotaFiscalLida) => void;
  /** "Lançar sem os itens": o rascunho so com o que o QR Code da. */
  onSemItens: () => void;
  onFechar: () => void;
};

/**
 * Consulta da NFC-e no portal da SEFAZ-MG, numa WebView de tela cheia.
 *
 * O usuario passa pela verificacao (Turnstile) e toca em "Visualizar"; o app
 * so le a pagina que ele abriu. A WebView carrega apenas a URL montada a partir
 * do QR Code validado e nao navega para fora da SEFAZ e da Cloudflare. O HTML
 * fica so na memoria: nao vai para o banco nem para o console (pode trazer o
 * CPF do comprador).
 */
export default function ConsultaNfce({
  qrCode,
  onNota,
  onSemItens,
  onFechar,
}: ConsultaNfceProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const WebView = carregarWebView();
  /** A pagina reenvia o HTML a cada mudanca: a nota e entregue uma vez so. */
  const leu = useRef(false);
  /** So em desenvolvimento, para o "Compartilhar HTML". */
  const ultimoHtml = useRef<string | null>(null);
  const [situacao, setSituacao] = useState<Situacao>({ tipo: 'aguardando' });
  /** Trocada no "Recomeçar": a WebView nasce de novo na URL do QR Code. */
  const [tentativa, setTentativa] = useState(0);
  const [compartilhando, setCompartilhando] = useState(false);

  const fonte = useMemo(() => ({ uri: urlConsultaMg(qrCode.p) }), [qrCode.p]);

  // A captura de desenvolvimento nao fica no aparelho depois da consulta.
  useEffect(
    () => (): void => {
      if (__DEV__) {
        void FileSystem.deleteAsync(ARQUIVO_CAPTURA, { idempotent: true }).catch(() => undefined);
      }
    },
    [],
  );

  const recomecar = (): void => {
    setSituacao({ tipo: 'aguardando' });
    setTentativa((atual) => atual + 1);
  };

  const receberMensagem = useCallback(
    (evento: WebViewMessageEvent): void => {
      if (leu.current || !ehPaginaDaSefazMg(evento.nativeEvent.url)) {
        return;
      }

      const mensagem = lerMensagem(evento.nativeEvent.data);

      if (!mensagem || !ehPaginaDaSefazMg(mensagem.url)) {
        return;
      }

      if (__DEV__) {
        ultimoHtml.current = mensagem.html;
      }

      const pagina = interpretarPaginaNfceMg(mensagem.html, qrCode.chave.chave);

      switch (pagina.tipo) {
        case 'nota':
          leu.current = true;
          vibrarSucesso();
          onNota(pagina.nota);
          return;
        case 'nao_encontrada':
          setSituacao({ tipo: 'nao_encontrada', mensagem: pagina.mensagem });
          return;
        case 'outra_nota':
          setSituacao({ tipo: 'outra_nota' });
          return;
        case 'verificacao':
          // Um desafio da Cloudflare pode vir com erro HTTP e mesmo assim passar.
          setSituacao({ tipo: 'aguardando' });
          return;
        default:
          setSituacao((atual) => (atual.tipo === 'erro_http' ? atual : { tipo: 'aguardando' }));
      }
    },
    [onNota, qrCode.chave.chave],
  );

  const compartilharHtml = async (): Promise<void> => {
    const html = ultimoHtml.current;

    if (!html) {
      Alert.alert('Nada para compartilhar', 'A página ainda não chegou ao app.');
      return;
    }

    try {
      setCompartilhando(true);
      await FileSystem.writeAsStringAsync(ARQUIVO_CAPTURA, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(ARQUIVO_CAPTURA, {
          mimeType: 'text/html',
          dialogTitle: 'Página da nota',
        });
      }
    } catch (error: unknown) {
      console.error('Erro ao compartilhar a pagina da nota', error);
      Alert.alert('Erro', 'Não foi possível compartilhar a página.');
    } finally {
      setCompartilhando(false);
    }
  };

  const faixa = ((): {
    texto: string;
    icone: 'shield-checkmark-outline' | 'alert-circle-outline';
    perigo: boolean;
  } => {
    switch (situacao.tipo) {
      case 'nao_encontrada':
        return {
          texto: `A SEFAZ respondeu: ${situacao.mensagem}`,
          icone: 'alert-circle-outline',
          perigo: true,
        };
      case 'outra_nota':
        return {
          texto: 'Esta página é de outra nota, não a do QR Code lido.',
          icone: 'alert-circle-outline',
          perigo: true,
        };
      case 'erro_http':
        return {
          texto: `A SEFAZ respondeu com erro (${situacao.status}). Tente de novo em instantes.`,
          icone: 'alert-circle-outline',
          perigo: true,
        };
      default:
        return {
          texto: 'Passe pela verificação e toque em Visualizar. O app lê a nota em seguida.',
          icone: 'shield-checkmark-outline',
          perigo: false,
        };
    }
  })();

  const renderPagina = (): React.ReactNode => {
    if (!WebView) {
      return (
        <EmptyState
          icon="construct-outline"
          message="A consulta da nota aparece depois de gerar o app de novo"
          hint="Rode npm run android. Enquanto isso, dá para lançar com o que o QR Code traz."
          actionLabel="Lançar sem os itens"
          onAction={onSemItens}
        />
      );
    }

    return (
      <>
        <View style={[styles.faixa, faixa.perigo && styles.faixaPerigo]}>
          <Ionicons
            name={faixa.icone}
            size={iconSize.md}
            color={faixa.perigo ? colors.danger : colors.primary}
          />
          <Text style={styles.faixaTexto}>{faixa.texto}</Text>
          {situacao.tipo !== 'aguardando' ? (
            <Button label="Recomeçar" variant="ghost" size="sm" onPress={recomecar} />
          ) : null}
        </View>

        <View style={styles.pagina}>
          <WebView
            key={`consulta-${tentativa}`}
            source={fonte}
            // Tudo passa pelo filtro abaixo: com a lista padrao, o endereco fora
            // dela seria aberto em outro app.
            originWhitelist={['*']}
            onShouldStartLoadWithRequest={(pedido: PedidoDeNavegacao): boolean =>
              urlPermitidaNaConsulta(pedido.url)
            }
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
            injectedJavaScript={SCRIPT_LEITURA}
            injectedJavaScriptForMainFrameOnly
            onMessage={receberMensagem}
            // Cada pagina nova comeca sem o erro da anterior; o `onHttpError`
            // dela, se houver, vem depois.
            onLoadStart={(): void =>
              setSituacao((atual) => (atual.tipo === 'erro_http' ? { tipo: 'aguardando' } : atual))
            }
            onHttpError={(evento: ErroHttp): void =>
              setSituacao({ tipo: 'erro_http', status: evento.nativeEvent.statusCode })
            }
            startInLoadingState
            renderLoading={(): React.ReactElement => (
              <View style={[StyleSheet.absoluteFill, styles.sobrePagina]}>
                <LoadingState message="Abrindo a consulta da SEFAZ..." />
              </View>
            )}
            renderError={(_dominio, _codigo, descricao): React.ReactElement => (
              <View style={[StyleSheet.absoluteFill, styles.sobrePagina]}>
                <EmptyState
                  icon="cloud-offline-outline"
                  message="Não foi possível abrir a consulta"
                  hint={descricao || 'Confira a internet e tente de novo.'}
                  actionLabel="Tentar de novo"
                  onAction={recomecar}
                />
              </View>
            )}
            style={styles.webView}
          />
        </View>

        <View style={[sharedStyles.actionsRow, styles.rodape]}>
          <Button
            label="Lançar sem os itens"
            variant="secondary"
            icon="flash-outline"
            flex
            onPress={onSemItens}
          />
          {__DEV__ ? (
            <Button
              label="HTML"
              variant="ghost"
              icon="share-outline"
              loading={compartilhando}
              onPress={(): void => {
                void compartilharHtml();
              }}
            />
          ) : null}
        </View>
      </>
    );
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader
          title="Consulta da nota"
          subtitle={`NFC-e nº ${qrCode.chave.numero} · série ${qrCode.chave.serie}`}
          backIcon="close"
          onBack={onFechar}
        />
        {renderPagina()}
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  faixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  faixaPerigo: {
    backgroundColor: colors.dangerSoft,
  },
  faixaTexto: {
    flex: 1,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  pagina: {
    flex: 1,
    overflow: 'hidden',
  },
  webView: {
    flex: 1,
  },
  sobrePagina: {
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  rodape: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
}));
