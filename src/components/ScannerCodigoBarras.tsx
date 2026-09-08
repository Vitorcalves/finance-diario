import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader } from './ui';
import { colors, radius, sharedStyles } from '../theme';

type ScannerCodigoBarrasProps = {
  onLer: (codigo: string) => void;
  onFechar: () => void;
};

/** Modal de leitura de codigo de barras da variante. */
export default function ScannerCodigoBarras({
  onLer,
  onFechar,
}: ScannerCodigoBarrasProps): React.ReactNode {
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (!permission?.granted) {
      void requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const handleBarcodeScanned = (resultado: { data: string }): void => {
    if (resultado.data.trim()) {
      onLer(resultado.data);
    }
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader title="Escanear Código de Barras" backIcon="close" onBack={onFechar} />

        {permission?.granted ? (
          <CameraView
            style={styles.camera}
            onBarcodeScanned={handleBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'itf14'],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.frame} />
            </View>
          </CameraView>
        ) : (
          <EmptyState icon="camera-outline" message="Permissão de câmera negada" />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlayStrong,
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    borderRadius: radius.xl,
  },
});
