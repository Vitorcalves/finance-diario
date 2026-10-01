import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/ui';
import { v4 as uuidv4 } from 'uuid';
import {
  type Categoria,
  deleteCategoriaById,
  insertCategoria,
  listCategorias,
} from '../../models/categorias';

export type UseCategorias = {
  categorias: Categoria[];
  loading: boolean;
  /** Cria a categoria e devolve `true` quando deu certo. */
  salvar: (nome: string) => Promise<boolean>;
  deletar: (categoria: Categoria) => void;
};

/** Acesso ao cadastro de categorias. */
export function useCategorias(): UseCategorias {
  const toast = useToast();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const categoriasDoBanco = await listCategorias();
      setCategorias(categoriasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar categorias:', error);
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
    async (nome: string): Promise<boolean> => {
      const nomeLimpo = nome.trim();

      if (!nomeLimpo) {
        Alert.alert('Erro', 'Nome da categoria é obrigatório');
        return false;
      }

      try {
        await insertCategoria({
          id: uuidv4(),
          nome: nomeLimpo,
          created_at: new Date().toISOString(),
        });

        await carregar();
        toast.mostrar('Categoria adicionada');
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar categoria:', error);
        Alert.alert('Erro', 'Não foi possível salvar a categoria');
        return false;
      }
    },
    [carregar, toast],
  );

  const deletar = useCallback(
    (categoria: Categoria): void => {
      Alert.alert('Excluir categoria', `Deseja excluir "${categoria.nome}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: (): void => {
            void (async (): Promise<void> => {
              try {
                await deleteCategoriaById(categoria.id);
                await carregar();
                toast.mostrar('Categoria excluída');
              } catch (error: unknown) {
                console.error('Erro ao deletar categoria:', error);
                Alert.alert('Erro', 'Não foi possível excluir a categoria');
              }
            })();
          },
        },
      ]);
    },
    [carregar, toast],
  );

  return { categorias, loading, salvar, deletar };
}
