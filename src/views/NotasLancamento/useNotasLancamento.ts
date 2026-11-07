import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useToast } from '../../components/ui';
import { emTransacao } from '../../models/database';
import { registrarLancamento } from '../../models/lancamentos';
import {
  deleteNotaLancamento,
  insertNotaLancamento,
  listNotasLancamento,
  type NotaLancamento,
  restaurarNotaLancamento,
  updateNotaLancamento,
} from '../../models/notasLancamento';
import { getLocalPadrao } from '../../models/settingsModel';
import { Locais } from '../../utils/local';
import type { NovoLancamento } from '../Home/types';
import { useCatalogoLancamento, type CatalogoLancamento } from '../Home/useCatalogoLancamento';

export type UseNotasLancamento = {
  loading: boolean;
  notas: NotaLancamento[];
  /** Contas, empresas e categorias usadas para interpretar as notas. */
  catalogo: CatalogoLancamento;
  /** Grava uma nota nova ou, com `id`, troca o texto de uma existente. */
  salvar: (texto: string, id?: string | null) => Promise<void>;
  /** Apaga e oferece "Desfazer" no aviso. */
  excluir: (nota: NotaLancamento) => Promise<void>;
  /** Grava o lancamento e tira a nota da lista, tudo ou nada. */
  lancar: (nota: NotaLancamento, lancamento: NovoLancamento) => Promise<void>;
};

export function useNotasLancamento(): UseNotasLancamento {
  const toast = useToast();
  const catalogo = useCatalogoLancamento();
  const { carregar: carregarCatalogo } = catalogo;
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<NotaLancamento[]>([]);
  const [localPadrao, setLocalPadrao] = useState<number>(Locais.padrao);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const [doBanco, local] = await Promise.all([listNotasLancamento(), getLocalPadrao()]);
      setNotas(doBanco);
      setLocalPadrao(local);
    } catch (error: unknown) {
      console.error('Erro ao carregar as notas de lancamento', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
      carregarCatalogo();
    }, [carregar, carregarCatalogo]),
  );

  const salvar = useCallback(
    async (texto: string, id?: string | null): Promise<void> => {
      if (id) {
        await updateNotaLancamento(id, texto);
      } else {
        await insertNotaLancamento(texto);
      }

      await carregar();
    },
    [carregar],
  );

  const excluir = useCallback(
    async (nota: NotaLancamento): Promise<void> => {
      await deleteNotaLancamento(nota.id);
      await carregar();

      toast.mostrar('Nota excluída', {
        acao: {
          rotulo: 'Desfazer',
          onPress: (): void => {
            void restaurarNotaLancamento(nota)
              .then(carregar)
              .catch((error: unknown) => console.error('Erro ao restaurar a nota', error));
          },
        },
      });
    },
    [carregar, toast],
  );

  const lancar = useCallback(
    async (nota: NotaLancamento, lancamento: NovoLancamento): Promise<void> => {
      await emTransacao(async () => {
        await registrarLancamento(lancamento, localPadrao);
        await deleteNotaLancamento(nota.id);
      });

      await carregar();
    },
    [carregar, localPadrao],
  );

  return { loading, notas, catalogo, salvar, excluir, lancar };
}
