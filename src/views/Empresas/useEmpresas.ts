import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/ui';
import { v4 as uuidv4 } from 'uuid';
import {
  type CategoriaLancamento,
  listCategoriasLancamento,
} from '../../models/categoriasLancamento';
import {
  deleteEmpresaById,
  type Empresa,
  insertEmpresa,
  listCategoriasPorEmpresa,
  listEmpresas,
  updateEmpresa,
} from '../../models/empresas';

export type DadosEmpresa = {
  nome: string;
  cnpj: string;
  observacao: string;
  /** Categorias de lancamento em que a empresa aparece no formulario de lancamento. */
  categoriaIds: string[];
};

export type UseEmpresas = {
  /** Em ordem alfabetica. */
  empresas: Empresa[];
  /** Categorias de lancamento, para vincular a empresa e filtrar a lista. */
  categorias: CategoriaLancamento[];
  /** Ids das categorias de cada empresa; empresa sem categoria fica fora do mapa. */
  categoriasPorEmpresa: Map<string, string[]>;
  loading: boolean;
  /** Cria ou atualiza a empresa e devolve `true` quando deu certo. */
  salvar: (dados: DadosEmpresa, empresaEditando: Empresa | null) => Promise<boolean>;
  deletar: (empresa: Empresa) => void;
};

/** Acesso ao cadastro de empresas. */
export function useEmpresas(): UseEmpresas {
  const toast = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLancamento[]>([]);
  const [categoriasPorEmpresa, setCategoriasPorEmpresa] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const [empresasDoBanco, categoriasDoBanco, categoriasPorEmpresaDoBanco] = await Promise.all([
        listEmpresas(),
        listCategoriasLancamento(),
        listCategoriasPorEmpresa(),
      ]);

      setEmpresas(empresasDoBanco);
      setCategorias(categoriasDoBanco);
      setCategoriasPorEmpresa(categoriasPorEmpresaDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar empresas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as empresas');
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
        Alert.alert('Erro', 'Nome da empresa é obrigatório');
        return false;
      }

      try {
        if (empresaEditando) {
          await updateEmpresa({ ...empresaEditando, nome, cnpj, observacao }, dados.categoriaIds);
        } else {
          await insertEmpresa(
            {
              id: uuidv4(),
              nome,
              cnpj,
              observacao,
              created_at: new Date().toISOString(),
            },
            dados.categoriaIds,
          );
        }

        await carregar();
        toast.mostrar(empresaEditando ? 'Empresa atualizada' : 'Empresa adicionada');
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar empresa:', error);
        Alert.alert('Erro', 'Não foi possível salvar a empresa');
        return false;
      }
    },
    [carregar, toast],
  );

  const deletar = useCallback(
    (empresa: Empresa): void => {
      Alert.alert('Excluir empresa', `Deseja excluir "${empresa.nome}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: (): void => {
            void (async (): Promise<void> => {
              try {
                await deleteEmpresaById(empresa.id);
                await carregar();
                toast.mostrar('Empresa excluída');
              } catch (error: unknown) {
                console.error('Erro ao deletar empresa:', error);
                Alert.alert('Erro', 'Não foi possível excluir a empresa');
              }
            })();
          },
        },
      ]);
    },
    [carregar, toast],
  );

  return { empresas, categorias, categoriasPorEmpresa, loading, salvar, deletar };
}
