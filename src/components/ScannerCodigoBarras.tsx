import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader, Text } from './ui';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../theme';
import { vibrarSucesso } from '../utils/haptics';

type ScannerCodigoBarrasProps = {
  onLer: (codigo: string) => void;
  onFechar: () => void;
};

/** Modal de leitura de codigo de barras da variante. */
export default function ScannerCodigoBarras({
  onLer,
  onFechar,
}: ScannerCodigoBarrasProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
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
          hint="A imagem é usada só para encontrar o código de barras; nada é gravado."
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
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.frame} />
          <Text style={styles.dica}>Aponte para o código de barras</Text>
        </View>
      </CameraView>
    );
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader title="Escanear código de barras" backIcon="close" onBack={onFechar} />
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
  dica: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.onHero,
  },
}));
