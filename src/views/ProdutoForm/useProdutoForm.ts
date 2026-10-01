import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../components/ui';
import { emTransacao } from '../../models/database';
import { type Categoria, insertCategoria, listCategorias } from '../../models/categorias';
import {
  type CategoriaProduto,
  deleteCategoriaById as deleteCategoriaVinculo,
  insertCategoria as insertCategoriaVinculo,
  listCategorias as listCategoriaVinculos,
} from '../../models/categoriasProduto';
import { insertMarca, listMarcas, type Marca } from '../../models/marcas';
import { getProdutoById, insertProduto, updateProduto } from '../../models/produtos';
import {
  deleteProdutoVariantesById,
  insertProdutoVariantes,
  listProdutoVariantes,
  type ProdutoVariantes,
  updateProdutoVariantes,
} from '../../models/produtoVariantes';
import type { DadosVariante, VarianteFormItem } from './types';

export type UseProdutoForm = {
  carregando: boolean;
  editando: boolean;

  categorias: Categoria[];
  marcas: Marca[];

  nome: string;
  setNome: (nome: string) => void;
  preco: string;
  setPreco: (preco: string) => void;
  unidadeId: number | null;
  setUnidadeId: (id: number | null) => void;
  /** Compra eventual: fica fora da lista padrao e do seletor sem busca. */
  eventual: boolean;
  setEventual: (eventual: boolean) => void;

  categoriasSelecionadas: string[];
  alternarCategoria: (categoriaId: string) => void;
  /** Cria a categoria, ja vinculando ao produto em edicao. */
  criarCategoria: (nome: string) => Promise<boolean>;
  /** Cria a marca e devolve o id gerado, para selecionar na variante. */
  criarMarca: (nome: string) => Promise<number | null>;

  variantes: VarianteFormItem[];
  salvarVariante: (dados: DadosVariante, index: number | null) => void;
  removerVariante: (index: number) => void;

  nomeMarca: (id: number | null) => string;
  /** Persiste produto, categorias e variantes; `true` quando deu certo. */
  salvar: () => Promise<boolean>;
};

/** Estado e persistencia do formulario de produto. */
export function useProdutoForm(produtoId?: string): UseProdutoForm {
  const editando = Boolean(produtoId);
  const toast = useToast();

  const [carregando, setCarregando] = useState(editando);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [unidadeId, setUnidadeId] = useState<number | null>(null);
  const [eventual, setEventual] = useState(false);

  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([]);
  const [vinculosOriginais, setVinculosOriginais] = useState<CategoriaProduto[]>([]);

  const [variantes, setVariantes] = useState<VarianteFormItem[]>([]);
  const [variantesOriginais, setVariantesOriginais] = useState<ProdutoVariantes[]>([]);

  useEffect(() => {
    let ativo = true;

    void (async (): Promise<void> => {
      try {
        const [categoriasDoBanco, marcasDoBanco] = await Promise.all([
          listCategorias(),
          listMarcas(),
        ]);

        if (!ativo) {
          return;
        }

        setCategorias(categoriasDoBanco);
        setMarcas(marcasDoBanco);

        if (!produtoId) {
          return;
        }

        const [produto, todasVariantes, todosVinculos] = await Promise.all([
          getProdutoById(produtoId),
          listProdutoVariantes(),
          listCategoriaVinculos(),
        ]);

        if (!ativo || !produto) {
          return;
        }

        setNome(produto.nome);
        setPreco(produto.preco.toFixed(2));
        setUnidadeId(produto.unidade_id);
        setEventual(produto.eventual === 1);

        const vinculosDoProduto = todosVinculos.filter(
          (vinculo) => vinculo.produto_id === produtoId,
        );
        setVinculosOriginais(vinculosDoProduto);
        setCategoriasSelecionadas(vinculosDoProduto.map((vinculo) => vinculo.categoria_id));

        const variantesDoProduto = todasVariantes.filter(
          (variante) => variante.produto_id === produtoId,
        );
        setVariantesOriginais(variantesDoProduto);
        setVariantes(
          variantesDoProduto.map((variante) => ({
            localId: variante.id,
            id: variante.id,
            marcaId: variante.marca_id,
            unidadeId: variante.unidade_id,
            quantidade: variante.quantidade !== null ? String(variante.quantidade) : '',
            codigoBarras: variante.codigo_barras ?? '',
            preco: variante.preco.toFixed(2),
          })),
        );
      } catch (error: unknown) {
        console.error('Erro ao carregar dados do produto:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados do produto');
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    })();

    return (): void => {
      ativo = false;
    };
  }, [produtoId]);

  const alternarCategoria = useCallback((categoriaId: string): void => {
    setCategoriasSelecionadas((prev) =>
      prev.includes(categoriaId) ? prev.filter((id) => id !== categoriaId) : [...prev, categoriaId],
    );
  }, []);

  const criarCategoria = useCallback(async (nomeCategoria: string): Promise<boolean> => {
    const nomeLimpo = nomeCategoria.trim();

    if (!nomeLimpo) {
      Alert.alert('Erro', 'Nome da categoria é obrigatório');
      return false;
    }

    try {
      const nova: Categoria = {
        id: uuidv4(),
        nome: nomeLimpo,
        created_at: new Date().toISOString(),
      };

      await insertCategoria(nova);
      setCategorias(await listCategorias());
      setCategoriasSelecionadas((prev) => [...prev, nova.id]);
      return true;
    } catch (error: unknown) {
      console.error('Erro ao criar categoria:', error);
      Alert.alert('Erro', 'Não foi possível criar a categoria');
      return false;
    }
  }, []);

  const criarMarca = useCallback(async (nomeMarcaNova: string): Promise<number | null> => {
    const nomeLimpo = nomeMarcaNova.trim();

    if (!nomeLimpo) {
      Alert.alert('Erro', 'Nome da marca é obrigatório');
      return null;
    }

    try {
      await insertMarca({ nome: nomeLimpo, created_at: new Date().toISOString() });
      const marcasAtualizadas = await listMarcas();
      setMarcas(marcasAtualizadas);

      return marcasAtualizadas.find((marca) => marca.nome === nomeLimpo)?.id ?? null;
    } catch (error: unknown) {
      console.error('Erro ao criar marca:', error);
      Alert.alert('Erro', 'Não foi possível criar a marca');
      return null;
    }
  }, []);

  const salvarVariante = useCallback((dados: DadosVariante, index: number | null): void => {
    setVariantes((prev) => {
      if (index === null) {
        return [...prev, { ...dados, localId: uuidv4(), id: null }];
      }

      const copia = [...prev];
      copia[index] = { ...dados, localId: prev[index].localId, id: prev[index].id };
      return copia;
    });
  }, []);

  const removerVariante = useCallback((index: number): void => {
    setVariantes((prev) => prev.filter((_, posicao) => posicao !== index));
  }, []);

  const nomeMarca = useCallback(
    (id: number | null): string => marcas.find((marca) => marca.id === id)?.nome ?? '',
    [marcas],
  );

  const salvar = useCallback(async (): Promise<boolean> => {
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      Alert.alert('Erro', 'Nome do produto é obrigatório');
      return false;
    }

    const precoParsado = Number(preco);

    if (precoParsado <= 0) {
      Alert.alert('Erro', 'Preço deve ser maior que zero');
      return false;
    }

    try {
      const agora = new Date().toISOString();
      const idDoProduto = produtoId ?? uuidv4();
      const dadosProduto = {
        id: idDoProduto,
        nome: nomeLimpo,
        preco: precoParsado,
        unidade_id: unidadeId,
        eventual: eventual ? 1 : 0,
        created_at: agora,
      };

      // Produto, categorias e variantes juntos: uma falha no meio nao deixa o
      // produto salvo pela metade.
      await emTransacao(async () => {
        await (produtoId ? updateProduto(dadosProduto) : insertProduto(dadosProduto));

        // Categorias: remove os vinculos desmarcados e cria os novos.
        const idsExistentes = vinculosOriginais.map((vinculo) => vinculo.categoria_id);
        const paraRemover = vinculosOriginais.filter(
          (vinculo) => !categoriasSelecionadas.includes(vinculo.categoria_id),
        );
        const paraAdicionar = categoriasSelecionadas.filter((id) => !idsExistentes.includes(id));

        await Promise.all(paraRemover.map((vinculo) => deleteCategoriaVinculo(vinculo.id)));
        await Promise.all(
          paraAdicionar.map((categoriaId) =>
            insertCategoriaVinculo({
              id: uuidv4(),
              categoria_id: categoriaId,
              produto_id: idDoProduto,
              created_at: agora,
            }),
          ),
        );

        // Variantes: apaga as removidas da lista e grava as demais.
        const idsAtuais = variantes
          .filter((variante) => variante.id !== null)
          .map((variante) => variante.id as string);

        await Promise.all(
          variantesOriginais
            .filter((variante) => !idsAtuais.includes(variante.id))
            .map((variante) => deleteProdutoVariantesById(variante.id)),
        );

        await Promise.all(
          variantes.map((variante) => {
            const dados: ProdutoVariantes = {
              id: variante.id ?? uuidv4(),
              produto_id: idDoProduto,
              marca_id: variante.marcaId,
              unidade_id: variante.unidadeId,
              quantidade: variante.quantidade ? Number(variante.quantidade) : null,
              codigo_barras: variante.codigoBarras || null,
              preco: Number(variante.preco),
              created_at: agora,
            };

            return variante.id ? updateProdutoVariantes(dados) : insertProdutoVariantes(dados);
          }),
        );
      });

      toast.mostrar(produtoId ? 'Produto atualizado' : 'Produto adicionado');
      return true;
    } catch (error: unknown) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Não foi possível salvar o produto');
      return false;
    }
  }, [
    nome,
    preco,
    unidadeId,
    eventual,
    produtoId,
    categoriasSelecionadas,
    vinculosOriginais,
    variantes,
    variantesOriginais,
    toast,
  ]);

  return {
    carregando,
    editando,
    categorias,
    marcas,
    nome,
    setNome,
    preco,
    setPreco,
    unidadeId,
    setUnidadeId,
    eventual,
    setEventual,
    categoriasSelecionadas,
    alternarCategoria,
    criarCategoria,
    criarMarca,
    variantes,
    salvarVariante,
    removerVariante,
    nomeMarca,
    salvar,
  };
}
