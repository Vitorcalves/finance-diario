import { type ReactElement, useMemo, useState } from 'react';
import {
  Alert,
  RefreshControl,
  SectionList,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import CategoriaIcone from '../../../components/CategoriaIcone';
import { OpcoesSheet, type OpcaoSheet, SwipeableRow, useToast } from '../../../components/ui';
import type { CategoriaLancamento } from '../../../models/categoriasLancamento';
import type { ItemTransacao } from '../../../models/itensTransacao';
import { NATUREZAS_DO_FLUXO } from '../../../models/naturezaTransacao';
import type { Tag } from '../../../models/tags';
import type { TransacaoExcluida, Transacoes } from '../../../models/transacoesModel';
import { makeStyles, radius, spacing, useTheme } from '../../../theme';
import type { GrupoDia } from '../../../utils/agruparPorDia';
import CabecalhoDia from './CabecalhoDia';
import TagsLancamentoSheet from './TagsLancamentoSheet';
import TransacaoItem from './TransacaoItem';

/** Valor da opcao "Sem categoria" no painel de escolha. */
const SEM_CATEGORIA = '__sem__';

type ListaLancamentosProps<T extends Transacoes> = {
  secoes: GrupoDia<T>[];
  itensPorTransacao: Map<string, ItemTransacao[]>;
  nomeEmpresa: (id?: string | null) => string;
  categorias: CategoriaLancamento[];
  categoriaPorId: (id?: string | null) => CategoriaLancamento | undefined;
  excluir: (id: string) => Promise<TransacaoExcluida | null>;
  restaurar: (excluida: TransacaoExcluida) => Promise<void>;
  definirCategoria: (transacaoId: string, categoriaId: string | null) => Promise<void>;
  /** Tags de evento, em ordem alfabetica. */
  tags: Tag[];
  /** Ids das tags de cada lancamento. */
  tagsPorTransacao: Map<string, string[]>;
  /** Troca as tags (no plano inteiro, se for parcela ou assinatura). */
  definirTags: (transacaoId: string, tagIds: string[]) => Promise<void>;
  /** Cria uma tag pelo painel; recusa com `ValidacaoTagError`. */
  criarTag: (nome: string) => Promise<Tag>;
  ListHeaderComponent?: ReactElement;
  ListEmptyComponent?: ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
  atualizando?: boolean;
  onAtualizar?: () => void;
};

/**
 * Lancamentos agrupados por dia. Arrastar a linha para o lado mostra
 * "Categoria" (trocar a categoria), "Tags" (marcar o evento, so em gasto e
 * receita) e "Excluir" (apaga e oferece "Desfazer"). Usada na Home e na busca
 * de lancamentos.
 */
export default function ListaLancamentos<T extends Transacoes>({
  secoes,
  itensPorTransacao,
  nomeEmpresa,
  categorias,
  categoriaPorId,
  excluir,
  restaurar,
  definirCategoria,
  tags,
  tagsPorTransacao,
  definirTags,
  criarTag,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
  atualizando,
  onAtualizar,
}: ListaLancamentosProps<T>): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  /** Lancamento cuja categoria esta sendo escolhida; continua preenchido durante a saida do painel. */
  const [emEdicao, setEmEdicao] = useState<T | null>(null);
  const [painelAberto, setPainelAberto] = useState(false);
  /** Lancamento cujas tags estao sendo marcadas; continua preenchido durante a saida do painel. */
  const [emEdicaoTags, setEmEdicaoTags] = useState<T | null>(null);
  const [painelTagsAberto, setPainelTagsAberto] = useState(false);
  /** Nova chave a cada abertura: o painel nasce com as tags do lancamento escolhido. */
  const [painelTagsKey, setPainelTagsKey] = useState(0);

  const tagsPorId = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  const tagsDe = (transacaoId: string): Tag[] =>
    (tagsPorTransacao.get(transacaoId) ?? []).flatMap((id) => {
      const tag = tagsPorId.get(id);
      return tag ? [tag] : [];
    });

  const abrirTags = (transacao: T): void => {
    setEmEdicaoTags(transacao);
    setPainelTagsKey((atual) => atual + 1);
    setPainelTagsAberto(true);
  };

  const salvarTags = (tagIds: string[]): void => {
    if (!emEdicaoTags) {
      return;
    }

    definirTags(emEdicaoTags.id, tagIds)
      .then(() =>
        toast.mostrar(
          tagIds.length === 0
            ? 'Tags removidas'
            : emEdicaoTags.plano_id
              ? 'Tags aplicadas a todas as parcelas'
              : 'Tags atualizadas',
        ),
      )
      .catch((error: unknown) => {
        console.error('Erro ao definir tags', error);
        Alert.alert('Erro', 'Não foi possível salvar as tags');
      });
  };

  /** Apaga na hora e oferece o "Desfazer", em vez de perguntar antes. */
  const excluirLancamento = (transacao: T): void => {
    void (async (): Promise<void> => {
      try {
        const excluida = await excluir(transacao.id);

        if (!excluida) {
          return;
        }

        toast.mostrar(`"${transacao.descricao}" excluído`, {
          tipo: 'info',
          acao: {
            rotulo: 'Desfazer',
            onPress: (): void => {
              restaurar(excluida)
                .then(() => toast.mostrar('Lançamento restaurado'))
                .catch((error: unknown) => {
                  console.error('Erro ao restaurar lancamento', error);
                  Alert.alert('Erro', 'Não foi possível restaurar o lançamento');
                });
            },
          },
        });
      } catch (error: unknown) {
        console.error('Erro ao remover lancamento', error);
        Alert.alert('Erro', 'Não foi possível excluir o lançamento');
      }
    })();
  };

  const escolherCategoria = (valor: string): void => {
    if (!emEdicao) {
      return;
    }

    const categoriaId = valor === SEM_CATEGORIA ? null : valor;
    const nome = categoriaPorId(categoriaId)?.nome ?? 'Sem categoria';

    definirCategoria(emEdicao.id, categoriaId)
      .then(() =>
        toast.mostrar(
          emEdicao.plano_id
            ? `"${nome}" aplicada a todas as parcelas`
            : `Categoria alterada para "${nome}"`,
        ),
      )
      .catch((error: unknown) => {
        console.error('Erro ao definir categoria', error);
        Alert.alert('Erro', 'Não foi possível alterar a categoria');
      });
  };

  const tipoEmEdicao = emEdicao && emEdicao.valor > 0 ? 'entrada' : 'saida';
  const opcoesCategoria: OpcaoSheet<string>[] = [
    ...categorias
      .filter((categoria) => categoria.tipo === tipoEmEdicao)
      .map((categoria) => ({
        valor: categoria.id,
        rotulo: categoria.nome,
        icone: <CategoriaIcone icone={categoria.icone} cor={categoria.cor} tamanho={36} />,
      })),
    {
      valor: SEM_CATEGORIA,
      rotulo: 'Sem categoria',
      icone: <CategoriaIcone tamanho={36} />,
    },
  ];

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: T;
    index: number;
    section: GrupoDia<T>;
  }): ReactElement => {
    const primeiro = index === 0;
    const ultimo = index === section.data.length - 1;

    return (
      <SwipeableRow
        style={[styles.linha, primeiro && styles.linhaPrimeira, ultimo && styles.linhaUltima]}
        acoes={[
          {
            rotulo: 'Categoria',
            icone: 'pricetag-outline',
            tipo: 'info',
            onPress: (): void => {
              setEmEdicao(item);
              setPainelAberto(true);
            },
          },
          // Transferencia e pagamento de fatura nao sao gasto de evento.
          ...(NATUREZAS_DO_FLUXO.includes(item.natureza)
            ? [
                {
                  rotulo: 'Tags',
                  icone: 'bookmark-outline' as const,
                  tipo: 'primary' as const,
                  onPress: (): void => abrirTags(item),
                },
              ]
            : []),
          {
            rotulo: 'Excluir',
            icone: 'trash-outline',
            tipo: 'danger',
            onPress: (): void => excluirLancamento(item),
          },
        ]}
      >
        <TransacaoItem
          transacao={item}
          itens={itensPorTransacao.get(item.id) ?? []}
          empresa={nomeEmpresa(item.empresa_id)}
          categoria={categoriaPorId(item.categoria_id)}
          tags={tagsDe(item.id)}
        />
        {!ultimo && <View style={styles.separador} />}
      </SwipeableRow>
    );
  };

  return (
    <>
      <SectionList
        sections={secoes}
        keyExtractor={(item): string => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }): ReactElement => (
          <CabecalhoDia dia={section.dia} total={section.total} />
        )}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={contentContainerStyle}
        refreshControl={
          onAtualizar ? (
            <RefreshControl
              refreshing={atualizando ?? false}
              onRefresh={onAtualizar}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }
      />

      <OpcoesSheet
        visivel={painelAberto}
        titulo="Categoria do lançamento"
        opcoes={opcoesCategoria}
        selecionado={emEdicao ? (emEdicao.categoria_id ?? SEM_CATEGORIA) : null}
        onSelecionar={escolherCategoria}
        onFechar={(): void => setPainelAberto(false)}
      />

      <TagsLancamentoSheet
        key={painelTagsKey}
        visivel={painelTagsAberto}
        descricao={emEdicaoTags?.descricao ?? ''}
        emPlano={Boolean(emEdicaoTags?.plano_id)}
        tags={tags}
        selecionadasIniciais={emEdicaoTags ? (tagsPorTransacao.get(emEdicaoTags.id) ?? []) : []}
        onSalvar={salvarTags}
        onCriarTag={criarTag}
        onFechar={(): void => setPainelTagsAberto(false)}
      />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    backgroundColor: colors.surface,
  },
  linhaPrimeira: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  linhaUltima: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  separador: {
    height: 1,
    marginLeft: spacing.lg + 40 + spacing.md,
    backgroundColor: colors.divider,
  },
}));
