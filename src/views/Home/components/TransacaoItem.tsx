import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { LayoutAnimation, Pressable, View } from 'react-native';
import CategoriaIcone from '../../../components/CategoriaIcone';
import type { CategoriaLancamento } from '../../../models/categoriasLancamento';
import { type ItemTransacao, totalItemTransacao } from '../../../models/itensTransacao';
import type { Transacoes } from '../../../models/transacoesModel';
import { Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { formatarQuantidade, toCurrency } from '../../../utils/format';
import { vibrarSelecao } from '../../../utils/haptics';
import { ehFuturo } from '../useHome';

type TransacaoItemProps = {
  transacao: Transacoes;
  itens: ItemTransacao[];
  empresa: string;
  /** Categoria do lancamento; sem ela o avatar mostra empresa ou direcao. */
  categoria?: CategoriaLancamento;
};

/**
 * Uma linha da lista de lancamentos: avatar, descricao, empresa e valor.
 * Quando a compra tem itens, tocar na linha mostra a lista deles.
 */
export default function TransacaoItem({
  transacao,
  itens,
  empresa,
  categoria,
}: TransacaoItemProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const [aberto, setAberto] = useState(false);

  /** Parcela ou assinatura que ainda vai vencer: ja lancada, mas fora do caixa de hoje. */
  const previsto = ehFuturo(transacao.data);
  const entrada = transacao.valor > 0;
  const temItens = itens.length > 0;

  const alternarItens = (): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    vibrarSelecao();
    setAberto((atual) => !atual);
  };

  const icone = transacao.plano_id
    ? 'repeat'
    : entrada
      ? 'arrow-down'
      : empresa
        ? null
        : 'arrow-up';

  return (
    <Pressable
      onPress={temItens ? alternarItens : undefined}
      disabled={!temItens}
      style={styles.container}
      accessibilityRole={temItens ? 'button' : undefined}
      accessibilityState={temItens ? { expanded: aberto } : undefined}
    >
      <View style={styles.linha}>
        {categoria ? (
          <CategoriaIcone icone={categoria.icone} cor={categoria.cor} />
        ) : (
          <View style={[styles.avatar, entrada && styles.avatarEntrada]}>
            {icone ? (
              <Ionicons
                name={icone}
                size={iconSize.sm}
                color={entrada ? colors.success : colors.primary}
              />
            ) : (
              <Text style={styles.avatarLetra}>{empresa.charAt(0).toUpperCase()}</Text>
            )}
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.titulo} numberOfLines={1}>
            {transacao.descricao}
          </Text>
          <View style={styles.metaLinha}>
            {previsto && (
              <View style={styles.selo}>
                <Text style={styles.seloTexto}>A vencer</Text>
              </View>
            )}
            <Text style={styles.meta} numberOfLines={1}>
              {[
                categoria?.nome,
                empresa,
                temItens ? `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>

        <View style={styles.valorColuna}>
          <Text style={[styles.valor, entrada ? styles.valorEntrada : null]}>
            {toCurrency(transacao.valor)}
          </Text>
          {temItens && (
            <Ionicons
              name={aberto ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.textSubtle}
            />
          )}
        </View>
      </View>

      {aberto && (
        <View style={styles.itensLista}>
          {itens.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemDescricao} numberOfLines={1}>
                {`${formatarQuantidade(item.quantidade)}× ${item.descricao}`}
              </Text>
              <Text style={styles.itemValor}>{toCurrency(totalItemTransacao(item))}</Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEntrada: {
    backgroundColor: colors.successSoft,
  },
  avatarLetra: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  metaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    flexShrink: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  selo: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
  },
  seloTexto: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.info,
  },
  valorColuna: {
    alignItems: 'flex-end',
    gap: 2,
  },
  valor: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  valorEntrada: {
    color: colors.success,
  },
  itensLista: {
    marginLeft: 40 + spacing.md,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    gap: spacing.xs,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemDescricao: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  itemValor: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
}));
