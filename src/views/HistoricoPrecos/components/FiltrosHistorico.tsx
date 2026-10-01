import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { ChipSelector, IconButton, Text } from '../../../components/ui';
import type { Produto } from '../../../models/produtos';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import type { Agrupamento, Ordenacao } from '../types';

const OPCOES_AGRUPAMENTO: { valor: Agrupamento; rotulo: string }[] = [
  { valor: 'variante', rotulo: 'Variante' },
  { valor: 'produto', rotulo: 'Produto' },
];

const OPCOES_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: 'menorPreco', rotulo: 'Menor preço atual' },
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
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [scannerAberto, setScannerAberto] = useState(false);

  return (
    <View style={sharedStyles.card}>
      <SeletorMultiplo
        label="Produto"
        opcoes={produtos.map((produto) => ({ id: produto.id, nome: produto.nome }))}
        selecionados={produtoFiltro ? [produtoFiltro] : []}
        onToggle={onAlternarProduto}
        placeholderBusca="Buscar produto"
        textoTrigger={produtoFiltro ? 'Trocar produto' : 'Todos os produtos'}
        textoVazio="Nenhum produto cadastrado"
        textoNenhumEncontrado="Nenhum produto encontrado"
        extra={<IconButton icon="barcode-outline" onPress={(): void => setScannerAberto(true)} />}
      />

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

const useStyles = makeStyles((colors) => ({
  filtroAtivo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
}));
