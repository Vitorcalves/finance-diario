import { type BarcodeType, CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader, Text } from './ui';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../theme';
import { vibrarSucesso } from '../utils/haptics';

/** `barras`: codigo de barras do produto; `qr`: QR Code do cupom fiscal (NFC-e). */
export type ModoScanner = 'barras' | 'qr';

/** O que muda na tela entre um modo e outro. */
const MODOS: Record<
  ModoScanner,
  { tipos: BarcodeType[]; titulo: string; dica: string; alvo: string }
> = {
  barras: {
    tipos: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
    titulo: 'Escanear código de barras',
    dica: 'Aponte para o código de barras',
    alvo: 'o código de barras',
  },
  qr: {
    tipos: ['qr'],
    titulo: 'Ler QR Code do cupom',
    dica: 'Aponte para o QR Code do cupom',
    alvo: 'o QR Code',
  },
};

type ScannerCodigoBarrasProps = {
  onLer: (codigo: string) => void;
  onFechar: () => void;
  /** Padrao: `barras`. */
  modo?: ModoScanner;
};

/** Modal de leitura de codigo de barras da variante ou do QR Code do cupom. */
export default function ScannerCodigoBarras({
  onLer,
  onFechar,
  modo = 'barras',
}: ScannerCodigoBarrasProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const config = MODOS[modo];
  const [permission, requestPermission] = useCameraPermissions();
  /**
   * A camera dispara a leitura a cada quadro enquanto o codigo esta na frente
   * dela: sem a trava, o mesmo codigo chegava varias vezes (e empilhava alertas
   * de "codigo nao encontrado") antes de o modal fechar.
   */
  const jaLeu = useRef(false);
  const [leituraFeita, setLeituraFeita] = useState(false);

  // Pede a permissao uma vez, so se o sistema ainda deixa perguntar.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const handleBarcodeScanned = (resultado: { data: string }): void => {
    const codigo = resultado.data.trim();

    if (!codigo || jaLeu.current) {
      return;
    }

    jaLeu.current = true;
    setLeituraFeita(true);
    vibrarSucesso();
    onLer(codigo);
  };

  const renderConteudo = (): React.ReactNode => {
    if (!permission) {
      return <LoadingState message="Verificando a permissão da câmera..." />;
    }

    if (!permission.granted) {
      return permission.canAskAgain ? (
        <EmptyState
          icon="camera-outline"
          message="Precisamos da câmera para ler o código"
          hint={`A imagem é usada só para encontrar ${config.alvo}; nada é gravado.`}
          actionLabel="Permitir câmera"
          onAction={(): void => {
            void requestPermission();
          }}
        />
      ) : (
        <EmptyState
          icon="camera-outline"
          message="Acesso à câmera bloqueado"
          hint="Libere a câmera para o Finance Diário nos ajustes do aparelho."
          actionLabel="Abrir ajustes"
          onAction={(): void => {
            void Linking.openSettings();
          }}
        />
      );
    }

    return (
      <CameraView
        style={styles.camera}
        // Depois da primeira leitura a camera para de procurar codigos.
        onBarcodeScanned={leituraFeita ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes: config.tipos }}
      >
        <View style={styles.overlay}>
          {/* O QR Code e quadrado; o codigo de barras, largo. */}
          <View style={[styles.frame, modo === 'qr' && styles.frameQuadrado]} />
          <Text style={styles.dica}>{config.dica}</Text>
        </View>
      </CameraView>
    );
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader title={config.titulo} backIcon="close" onBack={onFechar} />
        {renderConteudo()}
      </SafeAreaView>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.overlayStrong,
  },
  frame: {
    width: 260,
    height: 180,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    borderRadius: radius.xl,
  },
  frameQuadrado: {
    width: 240,
    height: 240,
  },
  dica: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.onHero,
  },
}));
