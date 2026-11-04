import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../components/ui';
import {
  type ContaComSaldo,
  contarTransacoesDaConta,
  deleteContaById,
  inativarConta,
  insertConta,
  listContasComSaldo,
  normalizarDadosConta,
  updateConta,
  ValidacaoContaError,
} from '../../models/contas';

/** Campos do formulario de conta, ainda como texto digitado. */
export type DadosContaForm = {
  nome: string;
  tipo: 'caixa' | 'reserva' | 'cartao';
  cor: string;
  diaFechamento: string;
  diaVencimento: string;
  metaValor: string;
  saldoInicial: string;
};

export type UseContas = {
  contas: ContaComSaldo[];
  loading: boolean;
  /** Cria ou atualiza a conta e devolve `true` quando deu certo. */
  salvar: (dados: DadosContaForm, contaEditando: ContaComSaldo | null) => Promise<boolean>;
  /** Com transacoes apenas inativa; sem nenhuma, exclui de verdade. */
  remover: (conta: ContaComSaldo) => void;
};

const paraInteiro = (texto: string): number | null => {
  const valor = Number.parseInt(texto, 10);
  return Number.isNaN(valor) ? null : valor;
};

/** Acesso ao cadastro de contas (caixa, reservas e cartoes). */
export function useContas(): UseContas {
  const toast = useToast();
  const [contas, setContas] = useState<ContaComSaldo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const contasDoBanco = await listContasComSaldo();
      setContas(contasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar contas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as contas');
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
    async (dados: DadosContaForm, contaEditando: ContaComSaldo | null): Promise<boolean> => {
      try {
        const normalizada = normalizarDadosConta({
          nome: dados.nome,
          tipo: dados.tipo,
          cor: dados.cor,
          diaFechamento: paraInteiro(dados.diaFechamento),
          diaVencimento: paraInteiro(dados.diaVencimento),
          metaValor: dados.metaValor ? Number(dados.metaValor) : null,
          saldoInicial: dados.saldoInicial ? Number(dados.saldoInicial) : 0,
        });

        if (contaEditando) {
          await updateConta({
            ...contaEditando,
            ...normalizada,
          });
        } else {
          await insertConta({
            id: uuidv4(),
            ...normalizada,
            ativo: 1,
            ordem: contas.length,
            created_at: new Date().toISOString(),
          });
        }

        await carregar();
        toast.mostrar(contaEditando ? 'Conta atualizada' : 'Conta adicionada');
        return true;
      } catch (error: unknown) {
        if (error instanceof ValidacaoContaError) {
          Alert.alert('Confira a conta', error.message);
        } else {
          console.error('Erro ao salvar conta:', error);
          Alert.alert('Erro', 'Não foi possível salvar a conta');
        }
        return false;
      }
    },
    [carregar, contas.length, toast],
  );

  const remover = useCallback(
    (conta: ContaComSaldo): void => {
      void (async (): Promise<void> => {
        const usada = (await contarTransacoesDaConta(conta.id)) > 0;

        if (usada) {
          // O historico depende dela: so some dos seletores.
          Alert.alert(
            'Inativar conta',
            `"${conta.nome}" tem lançamentos e não pode ser excluída. Inativar remove a conta dos seletores, mas mantém o histórico.`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Inativar',
                style: 'destructive',
                onPress: (): void => {
                  void (async (): Promise<void> => {
                    try {
                      await inativarConta(conta.id);
                      await carregar();
                      toast.mostrar('Conta inativada');
                    } catch (error: unknown) {
                      console.error('Erro ao inativar conta:', error);
                      Alert.alert('Erro', 'Não foi possível inativar a conta');
                    }
                  })();
                },
              },
            ],
          );
          return;
        }

        Alert.alert('Excluir conta', `Deseja excluir "${conta.nome}"?`, [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: (): void => {
              void (async (): Promise<void> => {
                try {
                  await deleteContaById(conta.id);
                  await carregar();
                  toast.mostrar('Conta excluída');
                } catch (error: unknown) {
                  console.error('Erro ao excluir conta:', error);
                  Alert.alert('Erro', 'Não foi possível excluir a conta');
                }
              })();
            },
          },
        ]);
      })();
    },
    [carregar, toast],
  );

  return { contas, loading, salvar, remover };
}
