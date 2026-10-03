import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BottomSheet, Button, PressableScale, Text } from '../../../components/ui';
import type { Empresa } from '../../../models/empresas';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { MercadoNaLista, ResumoComparacao } from '../useListaCompras';

type MercadosListaProps = {
  mercados: MercadoNaLista[];
  comparacao: ResumoComparacao;
  totalItens: number;
  empresas: Empresa[];
  onEscolherAtual: (empresaId: string) => void;
  onAlternarMercado: (empresaId: string) => void;
};

/**
 * Os mercados da pesquisa de precos: total da lista em cada um, o mais barato
 * nos itens com preco em todos e onde o usuario esta agora (o mercado cujos
 * precos os campos da lista anotam).
 */
export default function MercadosLista({
  mercados,
  comparacao,
  totalItens,
  empresas,
  onEscolherAtual,
  onAlternarMercado,
}: MercadosListaProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [painelAberto, setPainelAberto] = useState(false);

  const comparados = new Set(mercados.map((mercado) => mercado.empresaId));
  const empresasEmOrdem = [...empresas].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
  );
  const temPrecos = mercados.some((mercado) => mercado.itensComPreco > 0);

  return (
    <View style={sharedStyles.card}>
      <View style={styles.cabecalho}>
        <View style={styles.titulos}>
          <Text style={sharedStyles.sectionTitle}>Mercados</Text>
          <Text style={sharedStyles.sectionHint}>
            {mercados.length === 0
              ? 'Escolha os mercados em que vai comparar os preços'
              : 'Toque no mercado em que você está para anotar os preços dele'}
          </Text>
        </View>
        {mercados.length > 0 && (
          <Pressable
            onPress={(): void => setPainelAberto(true)}
            hitSlop={spacing.sm}
            accessibilityRole="button"
          >
            <Text style={styles.link}>Editar</Text>
          </Pressable>
        )}
      </View>

      {mercados.length === 0 ? (
        <Button
          label="Escolher mercados"
          icon="storefront-outline"
          variant="secondary"
          onPress={(): void => setPainelAberto(true)}
        />
      ) : (
        <View style={styles.lista}>
          {mercados.map((mercado) => (
            <PressableScale
              key={mercado.empresaId}
              escala={0.98}
              style={[styles.mercado, mercado.atual && styles.mercadoAtual]}
              onPress={(): void => onEscolherAtual(mercado.empresaId)}
              accessibilityRole="radio"
              accessibilityState={{ selected: mercado.atual }}
              accessibilityLabel={`${mercado.nome}${mercado.atual ? ', você está aqui' : ''}`}
            >
              <Ionicons
                name={mercado.atual ? 'location' : 'location-outline'}
                size={iconSize.md}
                color={mercado.atual ? colors.primary : colors.textSubtle}
              />
              <View style={styles.info}>
                <View style={styles.nomeLinha}>
                  <Text style={styles.nome} numberOfLines={1}>
                    {mercado.nome}
                  </Text>
                  {mercado.maisBarato && (
                    <View style={[sharedStyles.badge, sharedStyles.badgeSuccess]}>
                      <Text style={sharedStyles.badgeText}>Mais barato</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.detalhe}>
                  {`${mercado.atual ? 'Você está aqui · ' : ''}${mercado.itensComPreco} de ${totalItens} com preço`}
                </Text>
              </View>
              <Text style={[styles.total, mercado.maisBarato && sharedStyles.positive]}>
                {mercado.itensComPreco > 0 ? toCurrency(mercado.total) : '—'}
              </Text>
            </PressableScale>
          ))}
        </View>
      )}

      {comparacao.vantagem && (
        <View style={[styles.aviso, styles.avisoBom]}>
          <Ionicons name="trending-down" size={iconSize.sm} color={colors.success} />
          <Text style={styles.avisoTexto}>
            {`${comparacao.vantagem.mercado} sai ${toCurrency(comparacao.vantagem.valor)} mais barato que ${comparacao.vantagem.sobre}, comparando ${comparacao.itensEmComum === 1 ? 'o item' : `os ${comparacao.itensEmComum} itens`} com preço em todos os mercados.`}
          </Text>
        </View>
      )}

      {comparacao.dividindo && (
        <View style={[styles.aviso, styles.avisoInfo]}>
          <Ionicons name="git-branch-outline" size={iconSize.sm} color={colors.info} />
          <Text style={styles.avisoTexto}>
            {`Comprando cada um onde é mais barato (${comparacao.dividindo.mercados} mercados), esses itens saem ${toCurrency(comparacao.dividindo.total)}: ${toCurrency(comparacao.dividindo.economia)} a menos.`}
          </Text>
        </View>
      )}

      {mercados.length > 1 && temPrecos && comparacao.itensEmComum === 0 && (
        <Text style={sharedStyles.inlineEmptyText}>
          Anote o preço do mesmo item em mais de um mercado para ver qual sai mais barato.
        </Text>
      )}

      <BottomSheet
        visivel={painelAberto}
        onFechar={(): void => setPainelAberto(false)}
        titulo="Mercados para comparar"
        subtitulo="Marque os mercados em que vai olhar os preços"
        rodape={
          <Button label="Pronto" icon="checkmark" onPress={(): void => setPainelAberto(false)} />
        }
      >
        {empresasEmOrdem.length === 0 ? (
          <Text style={sharedStyles.inlineEmptyText}>
            Nenhuma empresa cadastrada. Cadastre os mercados em Menu → Empresas.
          </Text>
        ) : (
          empresasEmOrdem.map((empresa) => {
            const marcado = comparados.has(empresa.id);

            return (
              <PressableScale
                key={empresa.id}
                escala={0.98}
                style={styles.opcao}
                onPress={(): void => onAlternarMercado(empresa.id)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: marcado }}
              >
                <Ionicons
                  name={marcado ? 'checkbox' : 'square-outline'}
                  size={iconSize.lg}
                  color={marcado ? colors.primary : colors.textSubtle}
                />
                <Text style={styles.opcaoTexto}>{empresa.nome}</Text>
              </PressableScale>
            );
          })
        )}
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titulos: {
    flex: 1,
  },
  link: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  lista: {
    gap: spacing.sm,
  },
  mercado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mercadoAtual: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nomeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  nome: {
    flexShrink: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  detalhe: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  total: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  avisoBom: {
    backgroundColor: colors.successSoft,
  },
  avisoInfo: {
    backgroundColor: colors.infoSoft,
  },
  avisoTexto: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.text,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  opcaoTexto: {
    flex: 1,
    fontSize: fontSize.input,
    color: colors.textStrong,
  },
}));
