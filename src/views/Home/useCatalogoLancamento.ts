import { useCallback, useState } from 'react';
import {
  type CategoriaLancamento,
  listCategoriasLancamento,
  ultimaCategoriaPorEmpresa,
} from '../../models/categoriasLancamento';
import { type Conta, listContasPorTipo } from '../../models/contas';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../../models/produtoVariantes';
import { listTags, type Tag } from '../../models/tags';

export type CatalogoLancamento = {
  empresas: Empresa[];
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  categorias: CategoriaLancamento[];
  /** Contas caixa e cartao ativas: para onde (ou para qual fatura) o dinheiro vai. */
  contas: Conta[];
  /** Categoria usada por ultimo em cada empresa, para sugerir ao escolher a empresa. */
  categoriaPorEmpresa: Map<string, string>;
  /** Tags de evento, em ordem alfabetica. */
  tags: Tag[];
  /** Poe na lista uma tag criada agora no formulario, sem recarregar tudo. */
  incluirTag: (tag: Tag) => void;
  /** Recarrega os cadastros - chamado ao abrir o formulario. */
  carregar: () => void;
};

/** Cadastros auxiliares usados pelo formulario de lancamento. */
export function useCatalogoLancamento(): CatalogoLancamento {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLancamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [categoriaPorEmpresa, setCategoriaPorEmpresa] = useState<Map<string, string>>(new Map());
  const [tags, setTags] = useState<Tag[]>([]);

  const carregar = useCallback((): void => {
    void (async (): Promise<void> => {
      try {
        const [
          empresasDoBanco,
          produtosDoBanco,
          variantesDoBanco,
          marcasDoBanco,
          categoriasDoBanco,
          caixasDoBanco,
          cartoesDoBanco,
          categoriaPorEmpresaDoBanco,
          tagsDoBanco,
        ] = await Promise.all([
          listEmpresas(),
          listProdutos(),
          listProdutoVariantes(),
          listMarcas(),
          listCategoriasLancamento(),
          listContasPorTipo('caixa'),
          listContasPorTipo('cartao'),
          ultimaCategoriaPorEmpresa(),
          listTags(),
        ]);

        setEmpresas(empresasDoBanco);
        setProdutos(produtosDoBanco);
        setVariantes(variantesDoBanco);
        setMarcas(marcasDoBanco);
        setCategorias(categoriasDoBanco);
        setContas([...caixasDoBanco, ...cartoesDoBanco]);
        setCategoriaPorEmpresa(categoriaPorEmpresaDoBanco);
        setTags(tagsDoBanco);
      } catch (error: unknown) {
        console.error('Erro ao carregar dados do lancamento', error);
      }
    })();
  }, []);

  const incluirTag = useCallback((tag: Tag): void => {
    setTags((atuais) =>
      [...atuais.filter((atual) => atual.id !== tag.id), tag].sort((a, b) =>
        a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
      ),
    );
  }, []);

  return {
    empresas,
    produtos,
    variantes,
    marcas,
    categorias,
    contas,
    categoriaPorEmpresa,
    tags,
    incluirTag,
    carregar,
  };
}
