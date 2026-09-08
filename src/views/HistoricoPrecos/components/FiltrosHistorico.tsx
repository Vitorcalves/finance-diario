import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { ChipSelector } from '../../../components/ui';
import type { Produto } from '../../../models/produtos';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  sharedStyles,
  spacing,
} from '../../../theme';
import type { Agrupamento, Ordenacao } from '../types';

const OPCOES_AGRUPAMENTO: { valor: Agrupamento; rotulo: string }[] = [
  { valor: 'variante', rotulo: 'Variante' },
  { valor: 'produto', rotulo: 'Produto' },
];

const OPCOES_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: 'menorPreco', rotulo: 'Menor preco atual' },
  { valor: 'recente', rotulo: 'Mais recente' },
  { valor: 'nome', rotulo: 'Nome' },
];

type FiltrosHistoricoProps = {
  produtos: Produto[];
  produtoFiltro: string | null;
  onAlternarProduto: (id: string) => void;
  /** Variante isolada pela leitura do codigo de barras. */
  varianteFiltro: string | null;
  codigoFiltro: string | null;
  onLerCodigo: (codigo: string) => void;
  onLimparCodigo: () => void;
  rotuloVariante: (varianteId: string) => string;
  agrupamento: Agrupamento;
  onTrocarAgrupamento: (valor: Agrupamento) => void;
  ordenacao: Ordenacao;
  onTrocarOrdenacao: (valor: Ordenacao) => void;
};

/** Cartao de filtros: codigo de barras, produto, agrupamento e ordenacao. */
export default function FiltrosHistorico({
  produtos,
  produtoFiltro,
  onAlternarProduto,
  varianteFiltro,
  codigoFiltro,
  onLerCodigo,
  onLimparCodigo,
  rotuloVariante,
  agrupamento,
  onTrocarAgrupamento,
  ordenacao,
  onTrocarOrdenacao,
}: FiltrosHistoricoProps): React.ReactNode {
  const [scannerAberto, setScannerAberto] = useState(false);

  return (
    <View style={sharedStyles.card}>
      <Pressable style={styles.scanButton} onPress={(): void => setScannerAberto(true)}>
        <Ionicons name="barcode-outline" size={iconSize.md} color={colors.primary} />
        <Text style={styles.scanButtonText}>Ler codigo de barras</Text>
      </Pressable>

      {codigoFiltro !== null && (
        <View style={styles.filtroAtivo}>
          <View style={styles.filtroAtivoTexto}>
            <Text style={styles.filtroAtivoCodigo}>{codigoFiltro}</Text>
            <Text style={styles.filtroAtivoDescricao}>
              {varianteFiltro !== null
                ? rotuloVariante(varianteFiltro)
                : 'Filtrando pelo produto da variante lida'}
            </Text>
          </View>
          <Pressable onPress={onLimparCodigo} hitSlop={spacing.sm}>
            <Ionicons name="close-circle" size={iconSize.md} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      <SeletorMultiplo
        label="Produto"
        opcoes={produtos.map((produto) => ({ id: produto.id, nome: produto.nome }))}
        selecionados={produtoFiltro ? [produtoFiltro] : []}
        onToggle={onAlternarProduto}
        placeholderBusca="Buscar produto"
        textoTrigger={produtoFiltro ? 'Trocar produto' : 'Todos os produtos'}
        textoVazio="Nenhum produto cadastrado"
        textoNenhumEncontrado="Nenhum produto encontrado"
      />

      <Text style={sharedStyles.label}>Comparar por</Text>
      <ChipSelector
        opcoes={OPCOES_AGRUPAMENTO}
        selecionado={agrupamento}
        onSelecionar={onTrocarAgrupamento}
      />

      <Text style={sharedStyles.label}>Ordenar por</Text>
      <ChipSelector
        opcoes={OPCOES_ORDENACAO}
        selecionado={ordenacao}
        onSelecionar={onTrocarOrdenacao}
      />

      {scannerAberto && (
        <ScannerCodigoBarras
          onLer={(codigo): void => {
            setScannerAberto(false);
            onLerCodigo(codigo);
          }}
          onFechar={(): void => setScannerAberto(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scanButtonText: {
    color: colors.textBody,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  filtroAtivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  filtroAtivoTexto: {
    flex: 1,
  },
  filtroAtivoCodigo: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  filtroAtivoDescricao: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
});
