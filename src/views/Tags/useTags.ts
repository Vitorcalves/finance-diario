import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useToast } from '../../components/ui';
import {
  deleteTag,
  listResumoTags,
  type ResumoTag,
  salvarTag,
  type Tag,
  ValidacaoTagError,
} from '../../models/tags';

export type DadosFormTag = {
  nome: string;
  descricao: string;
};

export type UseTags = {
  resumos: ResumoTag[];
  loading: boolean;
  /** Cria ou atualiza; devolve `true` quando deu certo. */
  salvar: (dados: DadosFormTag, editando: Tag | null) => Promise<boolean>;
  /** Pergunta antes; os lancamentos continuam, so perdem a tag. */
  excluir: (tag: ResumoTag) => void;
};

/** Tags de evento com o total gasto em cada uma. */
export function useTags(): UseTags {
  const toast = useToast();
  const [resumos, setResumos] = useState<ResumoTag[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      setResumos(await listResumoTags(dayjs().format('YYYY-MM-DD')));
    } catch (error: unknown) {
      console.error('Erro ao carregar tags:', error);
      Alert.alert('Erro', 'Não foi possível carregar as tags');
    } finally {
      setLoading(false);
    }
  }, []);

  // Ao voltar da busca, os totais ja mostram as tags marcadas por la.
  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const salvar = useCallback(
    async (dados: DadosFormTag, editando: Tag | null): Promise<boolean> => {
      try {
        await salvarTag({ id: editando?.id, nome: dados.nome, descricao: dados.descricao });
        await carregar();
        toast.mostrar(editando ? 'Tag atualizada' : 'Tag criada');
        return true;
      } catch (error: unknown) {
        if (error instanceof ValidacaoTagError) {
          Alert.alert('Confira a tag', error.message);
        } else {
          console.error('Erro ao salvar tag:', error);
          Alert.alert('Erro', 'Não foi possível salvar a tag');
        }

        return false;
      }
    },
    [carregar, toast],
  );

  const excluir = useCallback(
    (tag: ResumoTag): void => {
      const lancamentos =
        tag.quantidade === 0
          ? 'Nenhum lançamento usa esta tag.'
          : `${tag.quantidade} ${tag.quantidade === 1 ? 'lançamento continua' : 'lançamentos continuam'}, só sem a tag.`;

      Alert.alert('Excluir tag', `Excluir "${tag.nome}"? ${lancamentos}`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: (): void => {
            void (async (): Promise<void> => {
              try {
                await deleteTag(tag.id);
                await carregar();
                toast.mostrar(`"${tag.nome}" excluída`);
              } catch (error: unknown) {
                console.error('Erro ao excluir tag:', error);
                Alert.alert('Erro', 'Não foi possível excluir a tag');
              }
            })();
          },
        },
      ]);
    },
    [carregar, toast],
  );

  return { resumos, loading, salvar, excluir };
}
