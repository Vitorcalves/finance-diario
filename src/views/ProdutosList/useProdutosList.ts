import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/ui';
import { type Categoria, listCategorias } from '../../models/categorias';
import {
  type CategoriaProduto,
  listCategorias as listCategoriaVinculos,
} from '../../models/categoriasProduto';
import { listMarcas, type Marca } from '../../models/marcas';
import { deleteProdutoById, listProdutos, type Produto } from '../../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../../models/produtoVariantes';
import { Unidades } from '../../utils/unidades';

export type UseProdutosList = {
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  /** So na primeira carga; voltar da edicao atualiza a lista sem piscar. */
  loading: boolean;
  atualizando: boolean;
  atualizar: () => void;
  /** Nomes das categorias vinculadas ao produto. */
  categoriasDoProduto: (produtoId: string) => string[];
  /** Variantes cadastradas para o produto. */
  variantesDoProduto: (produtoId: string) => ProdutoVariantes[];
  nomeUnidade: (id: number | null) => string;
  nomeMarca: (id: number | null) => string;
  deletar: (produto: Produto) => void;
};

/** Carrega produtos e os cadastros necessarios para montar cada cartao. */
export function useProdutosList(): UseProdutosList {
  const toast = useToast();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaVinculos, setCategoriaVinculos] = useState<CategoriaProduto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const [produtosDoBanco, variantesDoBanco, vinculosDoBanco, categoriasDoBanco, marcasDoBanco] =
        await Promise.all([
          listProdutos(),
          listProdutoVariantes(),
          listCategoriaVinculos(),
          listCategorias(),
          listMarcas(),
        ]);

      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setCategoriaVinculos(vinculosDoBanco);
      setCategorias(categoriasDoBanco);
      setMarcas(marcasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar produtos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const atualizar = useCallback((): void => {
    setAtualizando(true);
    void carregar().finally(() => setAtualizando(false));
  }, [carregar]);

  const nomesCategorias = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria.nome])),
    [categorias],
  );

  const categoriasDoProduto = useCallback(
    (produtoId: string): string[] =>
      categoriaVinculos
        .filter((vinculo) => vinculo.produto_id === produtoId)
        .map((vinculo) => nomesCategorias.get(vinculo.categoria_id))
        .filter((nome): nome is string => Boolean(nome)),
    [categoriaVinculos, nomesCategorias],
  );

  const variantesDoProduto = useCallback(
    (produtoId: string): ProdutoVariantes[] =>
      variantes.filter((variante) => variante.produto_id === produtoId),
    [variantes],
  );

  const nomeUnidade = useCallback((id: number | null): string => Unidades.descricaoPorId(id), []);

  const nomeMarca = useCallback(
    (id: number | null): string => marcas.find((marca) => marca.id === id)?.nome ?? '',
    [marcas],
  );

  const deletar = useCallback(
    (produto: Produto): void => {
      Alert.alert('Excluir produto', `Deseja excluir "${produto.nome}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: (): void => {
            void (async (): Promise<void> => {
              try {
                await deleteProdutoById(produto.id);
                await carregar();
                toast.mostrar(`"${produto.nome}" excluído`);
              } catch (error: unknown) {
                console.error('Erro ao deletar produto:', error);
                Alert.alert('Erro', 'Não foi possível excluir o produto');
              }
            })();
          },
        },
      ]);
    },
    [carregar, toast],
  );

  return {
    produtos,
    variantes,
    marcas,
    loading,
    atualizando,
    atualizar,
    categoriasDoProduto,
    variantesDoProduto,
    nomeUnidade,
    nomeMarca,
    deletar,
  };
}
