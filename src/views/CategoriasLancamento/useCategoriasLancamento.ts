import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../components/ui';
import {
  type CategoriaLancamento,
  deleteCategoriaLancamento,
  insertCategoriaLancamento,
  listCategoriasLancamento,
  type TipoCategoriaLancamento,
  updateCategoriaLancamento,
} from '../../models/categoriasLancamento';

export type DadosCategoriaLancamento = {
  nome: string;
  icone: string;
  cor: string;
  tipo: TipoCategoriaLancamento;
};

export type UseCategoriasLancamento = {
  categorias: CategoriaLancamento[];
  loading: boolean;
  /** Cria ou atualiza; devolve `true` quando deu certo. */
  salvar: (
    dados: DadosCategoriaLancamento,
    editando: CategoriaLancamento | null,
  ) => Promise<boolean>;
  excluir: (categoria: CategoriaLancamento) => void;
};

/** Cadastro das categorias de lancamento (Mercado, Transporte...). */
export function useCategoriasLancamento(): UseCategoriasLancamento {
  const toast = useToast();
  const [categorias, setCategorias] = useState<CategoriaLancamento[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      setCategorias(await listCategoriasLancamento());
    } catch (error: unknown) {
      console.error('Erro ao carregar categorias de lancamento:', error);
      Alert.alert('Erro', 'Não foi possível carregar as categorias');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const salvar = useCallback(
    async (
      dados: DadosCategoriaLancamento,
      editando: CategoriaLancamento | null,
    ): Promise<boolean> => {
      const nome = dados.nome.trim();

      if (!nome) {
        Alert.alert('Erro', 'Nome da categoria é obrigatório');
        return false;
      }

      try {
        if (editando) {
          await updateCategoriaLancamento({ ...dados, nome, id: editando.id });
        } else {
          await insertCategoriaLancamento({
            ...dados,
            nome,
            id: uuidv4(),
            created_at: new Date().toISOString(),
          });
        }

        await carregar();
        toast.mostrar(editando ? 'Categoria atualizada' : 'Categoria criada');
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar categoria de lancamento:', error);
        Alert.alert('Erro', 'Não foi possível salvar a categoria');
        return false;
      }
    },
    [carregar, toast],
  );

  const excluir = useCallback(
    (categoria: CategoriaLancamento): void => {
      Alert.alert(
        'Excluir categoria',
        `Excluir "${categoria.nome}"? Os lançamentos dela ficam sem categoria.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: (): void => {
              void (async (): Promise<void> => {
                try {
                  await deleteCategoriaLancamento(categoria.id);
                  await carregar();
                  toast.mostrar(`"${categoria.nome}" excluída`);
                } catch (error: unknown) {
                  console.error('Erro ao excluir categoria de lancamento:', error);
                  Alert.alert('Erro', 'Não foi possível excluir a categoria');
                }
              })();
            },
          },
        ],
      );
    },
    [carregar, toast],
  );

  return { categorias, loading, salvar, excluir };
}
