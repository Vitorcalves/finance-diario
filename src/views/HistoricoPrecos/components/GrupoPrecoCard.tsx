import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { formatarData, toCurrency, toCurrencyPorUnidade, toPercent } from '../../../utils/format';
import type { Agrupamento, BaseComparacao, GrupoPreco } from '../types';
import { Text } from '../../../components/ui';

type GrupoPrecoCardProps = {
  grupo: GrupoPreco;
  agrupamento: Agrupamento;
  expandido: boolean;
  onAlternar: () => void;
  /** Grupo com o menor preco atual entre todos. */
  melhor: boolean;
  baseComparacao: BaseComparacao;
  nomeEmpresa: (id: string | null) => string;
  rotuloVariante: (varianteId: string) => string;
};

/** Cartao de um grupo de precos, com metricas e o historico expansivel. */
export default function GrupoPrecoCard({
  grupo,
  agrupamento,
  expandido,
  onAlternar,
  melhor,
  baseComparacao,
  nomeEmpresa,
  rotuloVariante,
}: GrupoPrecoCardProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const normalizado = grupo.normalizado;

  /**
   * Agrupado por produto, o mesmo grupo junta embalagens de tamanhos
   * diferentes: o preco pago nao compara, o preco por unidade primaria sim.
   */
  const porUnidade = agrupamento === 'produto' && normalizado.status === 'ok';

  const metricas =
    porUnidade && normalizado.status === 'ok'
      ? {
          atual: toCurrencyPorUnidade(normalizado.atual, normalizado.sigla),
          menor: toCurrencyPorUnidade(normalizado.menor, normalizado.sigla),
          maior: toCurrencyPorUnidade(normalizado.maior, normalizado.sigla),
          media: toCurrencyPorUnidade(normalizado.media, normalizado.sigla),
          dataAtual: normalizado.registroAtual.data,
          empresaMenor: normalizado.registroMenor.empresa_id,
          valorAtual: normalizado.atual,
          valorMenor: normalizado.menor,
        }
      : {
          atual: toCurrency(grupo.atual),
          menor: toCurrency(grupo.menor),
          maior: toCurrency(grupo.maior),
          media: toCurrency(grupo.media),
          dataAtual: grupo.registroAtual.data,
          empresaMenor: grupo.registroMenor.empresa_id,
          valorAtual: grupo.atual,
          valorMenor: grupo.menor,
        };

  const variacao =
    metricas.valorMenor > 0
      ? ((metricas.valorAtual - metricas.valorMenor) / metricas.valorMenor) * 100
      : 0;

  const sufixo = porUnidade && normalizado.status === 'ok' ? ` (por ${normalizado.sigla})` : '';

  const rotuloMelhor =
    baseComparacao === 'unitario' && normalizado.status === 'ok'
      ? `Melhor por ${normalizado.sigla}`
      : 'Melhor preço';

  const renderAviso = (): React.ReactNode => {
    if (agrupamento !== 'produto') {
      return null;
    }

    if (normalizado.status === 'semMedida') {
      return (
        <Text style={styles.aviso}>
          Sem comparação por unidade: as variantes deste produto não têm quantidade e unidade
          cadastradas.
        </Text>
      );
    }

    if (normalizado.status === 'unidadesIncompativeis') {
      return (
        <Text style={styles.aviso}>
          Sem comparação por unidade: este produto mistura variantes de medidas diferentes.
        </Text>
      );
    }

    if (normalizado.semMedida > 0) {
      return (
        <Text style={styles.aviso}>
          {normalizado.semMedida} registro(s) fora da comparação por não terem medida cadastrada.
        </Text>
      );
    }

    return null;
  };

  return (
    <View style={[sharedStyles.card, melhor && sharedStyles.cardHighlight]}>
      <Pressable style={styles.header} onPress={onAlternar}>
        <View style={styles.info}>
          <View style={styles.tituloRow}>
            <Text style={styles.titulo}>{grupo.titulo}</Text>
            {melhor && (
              <View style={[sharedStyles.badge, sharedStyles.badgeSuccess]}>
                <Text style={sharedStyles.badgeText}>{rotuloMelhor}</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitulo}>{grupo.subtitulo}</Text>
        </View>
        <Ionicons
          name={expandido ? 'chevron-up' : 'chevron-down'}
          size={iconSize.md}
          color={colors.textStrong}
        />
      </Pressable>

      <View style={styles.metricasRow}>
        <View style={styles.metrica}>
          <Text style={styles.metricaLabel}>Atual{sufixo}</Text>
          <Text style={styles.metricaValorDestaque}>{metricas.atual}</Text>
          <Text style={styles.metricaDetalhe}>{formatarData(metricas.dataAtual)}</Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaLabel}>Menor{sufixo}</Text>
          <Text style={styles.metricaValor}>{metricas.menor}</Text>
          <Text style={styles.metricaDetalhe} numberOfLines={1}>
            {nomeEmpresa(metricas.empresaMenor)}
          </Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaLabel}>Maior{sufixo}</Text>
          <Text style={styles.metricaValor}>{metricas.maior}</Text>
          <Text style={styles.metricaDetalhe}>Media {metricas.media}</Text>
        </View>
      </View>

      {/* Comparando por variante o preco pago ja e comparavel, mas so o preco
          por unidade permite escolher entre embalagens de tamanhos diferentes. */}
      {agrupamento === 'variante' && normalizado.status === 'ok' && (
        <Text style={styles.porUnidade}>
          {toCurrencyPorUnidade(normalizado.atual, normalizado.sigla)} no preco atual
          {normalizado.menor < normalizado.atual
            ? ` • menor já pago ${toCurrencyPorUnidade(normalizado.menor, normalizado.sigla)}`
            : ''}
        </Text>
      )}

      {renderAviso()}

      {grupo.registros.length > 1 && (
        <Text
          style={[
            styles.variacaoText,
            variacao > 0 ? sharedStyles.negative : sharedStyles.positive,
          ]}
        >
          {variacao > 0
            ? `${toPercent(variacao)} acima do menor preço já pago`
            : 'Está no menor preço já registrado'}
        </Text>
      )}

      {expandido && (
        <View style={styles.registrosLista}>
          {grupo.registros.map(({ registro, unitario }) => (
            <View key={registro.id} style={styles.registroRow}>
              <View style={styles.registroInfo}>
                <Text style={styles.registroData}>{formatarData(registro.data)}</Text>
                <Text style={styles.registroEmpresa} numberOfLines={1}>
                  {nomeEmpresa(registro.empresa_id)}
                  {agrupamento === 'produto' ? ` • ${rotuloVariante(registro.variante_id)}` : ''}
                </Text>
              </View>
              <View style={styles.registroValores}>
                <Text
                  style={[
                    styles.registroPreco,
                    registro.preco === grupo.menor && sharedStyles.positive,
                  ]}
                >
                  {toCurrency(registro.preco)}
                </Text>
                {unitario !== null && (
                  <Text style={styles.registroUnitario}>
                    {toCurrencyPorUnidade(unitario.valor, unitario.sigla)}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  info: {
    flex: 1,
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  subtitulo: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricasRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metrica: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  metricaLabel: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  metricaValor: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
    marginTop: 2,
  },
  metricaValorDestaque: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.heavy,
    color: colors.primary,
    marginTop: 2,
  },
  metricaDetalhe: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
    marginTop: 2,
  },
  porUnidade: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  aviso: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  variacaoText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  registrosLista: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  registroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  registroInfo: {
    flex: 1,
  },
  registroData: {
    fontSize: fontSize.small,
    color: colors.textStrong,
    fontWeight: fontWeight.medium,
  },
  registroEmpresa: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  registroValores: {
    alignItems: 'flex-end',
  },
  registroPreco: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  registroUnitario: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
    marginTop: 2,
  },
}));
