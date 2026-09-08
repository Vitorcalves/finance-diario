import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import {
  deleteEmpresaById,
  type Empresa,
  insertEmpresa,
  listEmpresas,
  updateEmpresa,
} from '../../models/empresas';

export type DadosEmpresa = {
  nome: string;
  cnpj: string;
  observacao: string;
};

export type UseEmpresas = {
  empresas: Empresa[];
  loading: boolean;
  /** Cria ou atualiza a empresa e devolve `true` quando deu certo. */
  salvar: (dados: DadosEmpresa, empresaEditando: Empresa | null) => Promise<boolean>;
  deletar: (empresa: Empresa) => void;
};

/** Acesso ao cadastro de empresas. */
export function useEmpresas(): UseEmpresas {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const empresasDoBanco = await listEmpresas();
      setEmpresas(empresasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar empresas:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar as empresas');
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
    async (dados: DadosEmpresa, empresaEditando: Empresa | null): Promise<boolean> => {
      const nome = dados.nome.trim();
      const cnpj = dados.cnpj.trim() || undefined;
      const observacao = dados.observacao.trim() || undefined;

      if (!nome) {
        Alert.alert('Erro', 'Nome da empresa e obrigatorio');
        return false;
      }

      try {
        if (empresaEditando) {
          await updateEmpresa({ ...empresaEditando, nome, cnpj, observacao });
        } else {
          await insertEmpresa({
            id: uuidv4(),
            nome,
            cnpj,
            observacao,
            created_at: new Date().toISOString(),
          });
        }

        await carregar();
        Alert.alert('Sucesso', empresaEditando ? 'Empresa atualizada!' : 'Empresa adicionada!');
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar empresa:', error);
        Alert.alert('Erro', 'Nao foi possivel salvar a empresa');
        return false;
      }
    },
    [carregar],
  );

  const deletar = useCallback(
    (empresa: Empresa): void => {
      Alert.alert('Confirmar exclusao', `Deseja deletar "${empresa.nome}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Deletar',
          style: 'destructive',
          onPress: (): void => {
            void (async (): Promise<void> => {
              try {
                await deleteEmpresaById(empresa.id);
                await carregar();
                Alert.alert('Sucesso', 'Empresa deletada!');
              } catch (error: unknown) {
                console.error('Erro ao deletar empresa:', error);
                Alert.alert('Erro', 'Nao foi possivel deletar a empresa');
              }
            })();
          },
        },
      ]);
    },
    [carregar],
  );

  return { empresas, loading, salvar, deletar };
}
