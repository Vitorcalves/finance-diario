import { type ReactElement, useState } from 'react';
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
import type { TransacaoExcluida, Transacoes } from '../../../models/transacoesModel';
import { makeStyles, radius, spacing, useTheme } from '../../../theme';
import type { GrupoDia } from '../../../utils/agruparPorDia';
import CabecalhoDia from './CabecalhoDia';
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
  ListHeaderComponent?: ReactElement;
  ListEmptyComponent?: ReactElement;
  contentContainerStyle?: StyleProp<ViewStyle>;
  atualizando?: boolean;
  onAtualizar?: () => void;
};

/**
 * Lancamentos agrupados por dia. Arrastar a linha para o lado mostra
 * "Categoria" (trocar a categoria) e "Excluir" (apaga e oferece "Desfazer").
 * Usada na Home e na busca de lancamentos.
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
