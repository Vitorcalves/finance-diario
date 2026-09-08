import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  loading: boolean;
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
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaVinculos, setCategoriaVinculos] = useState<CategoriaProduto[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);

  const unidades = Unidades.listar();

  const carregar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
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

  const categoriasDoProduto = useCallback(
    (produtoId: string): string[] =>
      categoriaVinculos
        .filter((vinculo) => vinculo.produto_id === produtoId)
        .map(
          (vinculo) => categorias.find((categoria) => categoria.id === vinculo.categoria_id)?.nome,
        )
        .filter((nome): nome is string => Boolean(nome)),
    [categoriaVinculos, categorias],
  );

  const variantesDoProduto = useCallback(
    (produtoId: string): ProdutoVariantes[] =>
      variantes.filter((variante) => variante.produto_id === produtoId),
    [variantes],
  );

  const nomeUnidade = useCallback(
    (id: number | null): string => unidades.find((unidade) => unidade.id === id)?.descricao ?? '',
    [unidades],
  );

  const nomeMarca = useCallback(
    (id: number | null): string => marcas.find((marca) => marca.id === id)?.nome ?? '',
    [marcas],
  );

  const deletar = useCallback(
    (produto: Produto): void => {
      Alert.alert('Confirmar exclusão', `Deseja deletar "${produto.nome}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: (): void => {
            void (async (): Promise<void> => {
              try {
                await deleteProdutoById(produto.id);
                await carregar();
                Alert.alert('Sucesso', 'Produto deletado!');
              } catch (error: unknown) {
                console.error('Erro ao deletar produto:', error);
                Alert.alert('Erro', 'Não foi possível deletar o produto');
              }
            })();
          },
        },
      ]);
    },
    [carregar],
  );

  return {
    produtos,
    variantes,
    marcas,
    loading,
    categoriasDoProduto,
    variantesDoProduto,
    nomeUnidade,
    nomeMarca,
    deletar,
  };
}
