import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { ChipSelector, PressableScale, Text } from '../../../components/ui';
import type { ProdutoComMovimento } from '../../../models/dashboard';
import { nomeComExclusao } from '../../../models/exclusaoLogica';
import { fontSize, iconSize, makeStyles, spacing, useTheme } from '../../../theme';
import { vibrarSelecao } from '../../../utils/haptics';
import type { UnidadeBase } from '../types';

type FiltrosAnaliseProps = {
  produtos: ProdutoComMovimento[];
  produtoId: string | null;
  onSelecionarProduto: (id: string) => void;
  variantes: { id: string; rotulo: string }[];
  varianteId: string | null;
  onSelecionarVariante: (id: string | null) => void;
  unidadeBase: UnidadeBase;
  porUnidade: boolean;
  onAlternarPorUnidade: () => void;
};

/** Valor do chip "Todas"; os ids reais sao UUIDs e nunca colidem com ele. */
const TODAS = '__todas__';

/**
 * Escolha do produto e, quando ele tem mais de uma, da variante analisada.
 * Com medida cadastrada, a caixa troca o preco do produto pelo preco por
 * unidade base (R$/kg), como no historico de precos.
 */
export default function FiltrosAnalise({
  produtos,
  produtoId,
  onSelecionarProduto,
  variantes,
  varianteId,
  onSelecionarVariante,
  unidadeBase,
  porUnidade,
  onAlternarPorUnidade,
}: FiltrosAnaliseProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Text style={sharedStyles.label}>Produto</Text>
      <ChipSelector
        scroll
        opcoes={produtos.map((produto) => ({
          valor: produto.id,
          rotulo: nomeComExclusao(produto),
        }))}
        selecionado={produtoId}
        onSelecionar={onSelecionarProduto}
      />

      {variantes.length > 1 && (
        <>
          <Text style={sharedStyles.label}>Variante</Text>
          <ChipSelector
            scroll
            opcoes={[
              { valor: TODAS, rotulo: 'Todas' },
              ...variantes.map((variante) => ({ valor: variante.id, rotulo: variante.rotulo })),
            ]}
            selecionado={varianteId ?? TODAS}
            onSelecionar={(valor): void => onSelecionarVariante(valor === TODAS ? null : valor)}
          />
        </>
      )}

      {unidadeBase.status === 'ok' && (
        <>
          <PressableScale
            escala={0.96}
            hitSlop={spacing.sm}
            style={styles.caixa}
            onPress={(): void => {
              vibrarSelecao();
              onAlternarPorUnidade();
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: porUnidade }}
          >
            <Ionicons
              name={porUnidade ? 'checkbox' : 'square-outline'}
              size={iconSize.sm}
              color={porUnidade ? colors.primary : colors.textSubtle}
            />
            <Text style={styles.caixaTexto}>{`Preço por ${unidadeBase.sigla}`}</Text>
          </PressableScale>

          {porUnidade && unidadeBase.semMedida > 0 && (
            <Text style={styles.aviso}>
              {`${unidadeBase.semMedida} registro(s) sem medida cadastrada ficaram de fora.`}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    gap: spacing.xs,
  },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  caixaTexto: {
    fontSize: fontSize.small,
    color: colors.text,
  },
  aviso: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
}));
