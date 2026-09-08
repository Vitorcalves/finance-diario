import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  deleteMarcaById,
  insertMarca,
  listMarcas,
  type Marca,
  updateMarca,
} from '../../models/marcas';

export type UseMarcas = {
  marcas: Marca[];
  loading: boolean;
  /** Cria ou atualiza a marca e devolve `true` quando deu certo. */
  salvar: (nome: string, marcaEditando: Marca | null) => Promise<boolean>;
  deletar: (marca: Marca) => void;
};

/** Acesso ao cadastro de marcas. */
export function useMarcas(): UseMarcas {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const marcasDoBanco = await listMarcas();
      setMarcas(marcasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar marcas:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar as marcas');
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
        Alert.alert('Erro', 'Nome da marca e obrigatorio');
        return false;
      }

      try {
        if (marcaEditando) {
          await updateMarca({ ...marcaEditando, nome: nomeLimpo });
        } else {
          await insertMarca({ nome: nomeLimpo, created_at: new Date().toISOString() });
        }

        await carregar();
        Alert.alert('Sucesso', marcaEditando ? 'Marca atualizada!' : 'Marca adicionada!');
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar marca:', error);
        Alert.alert('Erro', 'Nao foi possivel salvar a marca');
        return false;
      }
    },
    [carregar],
  );

  const deletar = useCallback(
    (marca: Marca): void => {
      Alert.alert('Confirmar exclusao', `Deseja deletar "${marca.nome}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: (): void => {
            void (async (): Promise<void> => {
              try {
                await deleteMarcaById(marca.id);
                await carregar();
                Alert.alert('Sucesso', 'Marca deletada!');
              } catch (error: unknown) {
                console.error('Erro ao deletar marca:', error);
                Alert.alert('Erro', 'Nao foi possivel deletar a marca');
              }
            })();
          },
        },
      ]);
    },
    [carregar],
  );

  return { marcas, loading, salvar, deletar };
}
