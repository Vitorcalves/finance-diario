import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { View } from 'react-native';
import { PressableScale, Text } from '../../../components/ui';
import { fontSize, fontWeight, iconSize, makeStyles, spacing, useTheme } from '../../../theme';
import { toCurrencyFino } from '../../../utils/format';
import { formatarFatia, formatarPontos, formatarVariacao } from '../grafico';
import type { ItemDaCesta } from '../types';

type ItensInflacaoProps = {
  /** Itens da cesta no periodo, do maior impacto ao menor. */
  itens: ItemDaCesta[];
  /** Abre a analise de precos do produto do item. */
  onAbrirProduto: (produtoId: string) => void;
};

/** Quantos itens aparecem antes do "Ver todos". */
const LIMITE = 8;

/** Abaixo disso a variacao arredonda para 0%: o preco nao mudou. */
const VARIACAO_MINIMA = 0.05;

/** Itens que mexeram na inflacao da cesta, com o preco de antes e de depois. */
export default function ItensInflacao({
  itens,
  onAbrirProduto,
}: ItensInflacaoProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [todos, setTodos] = useState(false);

  const mudaram = itens.filter((item) => Math.abs(item.variacao) >= VARIACAO_MINIMA);
  const semMudanca = itens.length - mudaram.length;
  const visiveis = todos ? mudaram : mudaram.slice(0, LIMITE);

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>O que mais pesou</Text>
      <Text style={sharedStyles.sectionHint}>
        Do maior impacto na cesta ao menor. Toque em um item para ver os preços dele.
      </Text>

      {mudaram.length === 0 && (
        <Text style={styles.vazio}>Nenhum item mudou de preço neste período.</Text>
      )}

      {visiveis.map((item) => {
        const subiu = item.variacao > 0;
        const produtoId = item.produtoId;

        return (
          <PressableScale
            key={item.itemId}
            style={styles.linha}
            escala={0.98}
            disabled={produtoId === null}
            onPress={(): void => {
              if (produtoId !== null) {
                onAbrirProduto(produtoId);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`${item.nome}, ${item.variante}: ${formatarVariacao(item.variacao)}`}
          >
            <Ionicons
              name={subiu ? 'arrow-up' : 'arrow-down'}
              size={iconSize.sm}
              color={subiu ? colors.danger : colors.success}
            />

            <View style={styles.info}>
              <Text style={styles.nome} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={styles.detalhe} numberOfLines={1}>
                {item.variante}
              </Text>
              <Text style={styles.detalhe}>
                {`${toCurrencyFino(item.precoInicial)} → ${toCurrencyFino(item.precoFinal)} · ${formatarFatia(item.participacao)} da cesta`}
              </Text>
            </View>

            <View style={styles.numeros}>
              <Text
                style={[styles.variacao, subiu ? sharedStyles.negative : sharedStyles.positive]}
              >
                {formatarVariacao(item.variacao)}
              </Text>
              <Text style={styles.impacto}>{formatarPontos(item.impacto)}</Text>
            </View>
          </PressableScale>
        );
      })}

      {mudaram.length > LIMITE && (
        <PressableScale
          style={styles.verTodos}
          escala={0.97}
          onPress={(): void => setTodos((atual) => !atual)}
          accessibilityRole="button"
        >
          <Text style={styles.verTodosTexto}>
            {todos ? 'Mostrar menos' : `Ver todos (${mudaram.length})`}
          </Text>
        </PressableScale>
      )}

      {semMudanca > 0 && (
        <Text style={styles.rodape}>
          {`${semMudanca} ${semMudanca === 1 ? 'item ficou' : 'itens ficaram'} com o mesmo preço no período.`}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  vazio: {
    fontSize: fontSize.small,
    color: colors.textSubtle,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nome: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  detalhe: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  numeros: {
    alignItems: 'flex-end',
    gap: 2,
  },
  variacao: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
  },
  impacto: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  verTodos: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  verTodosTexto: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  rodape: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
}));
