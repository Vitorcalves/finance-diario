import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, sharedStyles, spacing } from '../../../theme';
import { toCurrency, toCurrencyPorUnidade, toPercent } from '../../../utils/format';
import type { ComparativoProduto } from '../types';

type ComparativoVariantesProps = {
  grupos: ComparativoProduto[];
  rotuloVariante: (varianteId: string) => string;
};

/**
 * Compara, dentro do orcamento atual, variantes de um mesmo produto pelo preco
 * por unidade primaria - o motivo de existir a tela: um leite de 500 ml a
 * R$ 5,00 (R$ 10,00/L) pode sair mais barato que um de 1 L a R$ 12,00 (R$ 12,00/L),
 * mesmo custando menos na embalagem.
 */
export default function ComparativoVariantes({
  grupos,
  rotuloVariante,
}: ComparativoVariantesProps): React.ReactNode {
  if (grupos.length === 0) {
    return null;
  }

  return (
    <>
      <Text style={sharedStyles.sectionTitle}>Mesmo produto, embalagens diferentes</Text>
      <Text style={sharedStyles.sectionHint}>
        Preco por kg/L/un de cada variante deste produto no orcamento.
      </Text>

      {grupos.map((grupo) => {
        const menorUnitario = grupo.comparavel
          ? Math.min(
              ...grupo.itens
                .filter((entrada) => entrada.unitario !== null)
                .map((entrada) => entrada.unitario!.valor),
            )
          : null;

        const itensOrdenados = [...grupo.itens].sort((a, b) => {
          if (a.unitario === null) return 1;
          if (b.unitario === null) return -1;
          return a.unitario.valor - b.unitario.valor;
        });

        return (
          <View key={grupo.produtoId} style={styles.card}>
            <Text style={styles.titulo}>{grupo.nomeProduto}</Text>

            {!grupo.comparavel && (
              <Text style={styles.aviso}>
                Sem comparacao por unidade: cadastre quantidade e unidade nas variantes para
                comparar o preco por medida.
              </Text>
            )}

            {itensOrdenados.map((entrada) => {
              const variacao =
                menorUnitario !== null && entrada.unitario !== null && menorUnitario > 0
                  ? ((entrada.unitario.valor - menorUnitario) / menorUnitario) * 100
                  : null;

              return (
                <View
                  key={entrada.item.localId}
                  style={[styles.linha, entrada.maisBarato && styles.linhaMelhor]}
                >
                  <View style={styles.linhaInfo}>
                    <Text style={styles.linhaVariante}>
                      {rotuloVariante(entrada.item.varianteId)}
                    </Text>
                    <Text style={styles.linhaDetalhe}>
                      {`${entrada.item.quantidade} x ${toCurrency(entrada.item.preco)}`}
                      {variacao !== null && variacao > 0
                        ? ` • ${toPercent(variacao)} mais caro por medida`
                        : ''}
                    </Text>
                  </View>

                  <View style={styles.linhaValores}>
                    {entrada.unitario ? (
                      <Text
                        style={[styles.linhaUnitario, entrada.maisBarato && sharedStyles.positive]}
                      >
                        {toCurrencyPorUnidade(entrada.unitario.valor, entrada.unitario.sigla)}
                      </Text>
                    ) : (
                      <Text style={styles.linhaSemMedida}>Sem medida</Text>
                    )}
                    {entrada.maisBarato && (
                      <View style={[sharedStyles.badge, sharedStyles.badgeSuccess]}>
                        <Text style={sharedStyles.badgeText}>Mais barato</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  aviso: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  linhaMelhor: {
    borderTopColor: colors.success,
  },
  linhaInfo: {
    flex: 1,
  },
  linhaVariante: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
  },
  linhaDetalhe: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  linhaValores: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  linhaUnitario: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  linhaSemMedida: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
});
