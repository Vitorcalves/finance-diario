import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/ui';
import {
  deleteMarcaById,
  insertMarca,
  listMarcas,
  type Marca,
  updateMarca,
} from '../../models/marcas';
import { NomeRepetidoError } from '../../models/nomeRepetido';

export type UseMarcas = {
  marcas: Marca[];
  loading: boolean;
  /** Cria ou atualiza a marca e devolve `true` quando deu certo. */
  salvar: (nome: string, marcaEditando: Marca | null) => Promise<boolean>;
  deletar: (marca: Marca) => void;
};

/** Acesso ao cadastro de marcas. */
export function useMarcas(): UseMarcas {
  const toast = useToast();
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const marcasDoBanco = await listMarcas();
      setMarcas(marcasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar marcas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as marcas');
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
    async (nome: string, marcaEditando: Marca | null): Promise<boolean> => {
      const nomeLimpo = nome.trim();

      if (!nomeLimpo) {
        Alert.alert('Erro', 'Nome da marca é obrigatório');
        return false;
      }

      try {
        if (marcaEditando) {
          await updateMarca({ ...marcaEditando, nome: nomeLimpo });
        } else {
          await insertMarca({ nome: nomeLimpo, created_at: new Date().toISOString() });
        }

        await carregar();
        toast.mostrar(marcaEditando ? 'Marca atualizada' : 'Marca adicionada');
        return true;
      } catch (error: unknown) {
        if (error instanceof NomeRepetidoError) {
          Alert.alert('Nome repetido', error.message);
        } else {
          console.error('Erro ao salvar marca:', error);
          Alert.alert('Erro', 'Não foi possível salvar a marca');
        }

        return false;
      }
    },
    [carregar, toast],
  );

  const deletar = useCallback(
    (marca: Marca): void => {
      Alert.alert(
        'Excluir marca',
        `Deseja excluir "${marca.nome}"? Ela sai do cadastro e do seletor de marca. As variantes que já a usam continuam com ela.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: (): void => {
              void (async (): Promise<void> => {
                try {
                  await deleteMarcaById(marca.id);
                  await carregar();
                  toast.mostrar('Marca excluída');
                } catch (error: unknown) {
                  console.error('Erro ao deletar marca:', error);
                  Alert.alert('Erro', 'Não foi possível excluir a marca');
                }
              })();
            },
          },
        ],
      );
    },
    [carregar, toast],
  );

  return { marcas, loading, salvar, deletar };
}
