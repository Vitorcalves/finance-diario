import { useCallback, useState } from 'react';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../../models/produtoVariantes';

export type CatalogoLancamento = {
  empresas: Empresa[];
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  /** Recarrega os cadastros - chamado ao abrir o formulario. */
  carregar: () => void;
};

/** Cadastros auxiliares usados pelo formulario de lancamento. */
export function useCatalogoLancamento(): CatalogoLancamento {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);

  const carregar = useCallback((): void => {
    void (async (): Promise<void> => {
      try {
        const [empresasDoBanco, produtosDoBanco, variantesDoBanco, marcasDoBanco] =
          await Promise.all([listEmpresas(), listProdutos(), listProdutoVariantes(), listMarcas()]);

        setEmpresas(empresasDoBanco);
        setProdutos(produtosDoBanco);
        setVariantes(variantesDoBanco);
        setMarcas(marcasDoBanco);
      } catch (error: unknown) {
        console.error('Erro ao carregar dados do lancamento', error);
      }
    })();
  }, []);

  return { empresas, produtos, variantes, marcas, carregar };
}
