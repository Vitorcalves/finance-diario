import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../components/ui';
import {
  type ContaComSaldo,
  contarTransacoesDaConta,
  deleteContaById,
  inativarConta,
  insertConta,
  listContasComSaldo,
  listMovimentosDaConta,
  normalizarDadosConta,
  totalAportadoNoMes,
  updateConta,
  ValidacaoContaError,
} from '../../models/contas';
import { registrarLancamento } from '../../models/lancamentos';
import { Locais } from '../../utils/local';
import type { DetalheReserva } from './components/ReservaDetalheModal';
import type { DadosTransferenciaReserva } from './components/TransferenciaReservaModal';

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
  /** Caixas ativas, parceiras dos aportes/resgates. */
  caixas: ContaComSaldo[];
  loading: boolean;
  /** Cria ou atualiza a conta e devolve `true` quando deu certo. */
  salvar: (dados: DadosContaForm, contaEditando: ContaComSaldo | null) => Promise<boolean>;
  /** Com transacoes apenas inativa; sem nenhuma, exclui de verdade. */
  remover: (conta: ContaComSaldo) => void;
  /** Grava o aporte/resgate como transferencia entre as duas contas. */
  transferir: (dados: DadosTransferenciaReserva) => Promise<boolean>;
  /** Detalhe carregado da reserva (saldo, meta, extrato); `null` com painel fechado. */
  detalhe: DetalheReserva | null;
  /** Carrega saldo, movimentos e aportes do mes da reserva. */
  abrirDetalhe: (reserva: ContaComSaldo) => Promise<void>;
  fecharDetalhe: () => void;
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
  const [detalhe, setDetalhe] = useState<DetalheReserva | null>(null);

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

  const transferir = useCallback(
    async (dados: DadosTransferenciaReserva): Promise<boolean> => {
      const aporte = dados.modo === 'aporte';
      const reserva = contas.find((conta) => conta.id === dados.reservaId);
      const rotulo = reserva?.nome ?? 'reserva';

      if (!(dados.valor > 0)) {
        Alert.alert('Confira o valor', 'Informe um valor maior que zero.');
        return false;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) {
        Alert.alert('Confira a data', 'Informe uma data válida.');
        return false;
      }

      try {
        await registrarLancamento(
          {
            descricao: dados.descricao || (aporte ? `Aporte — ${rotulo}` : `Resgate — ${rotulo}`),
            data: dados.data,
            empresaId: null,
            categoriaId: null,
            // Uma linha so: sai da origem com sinal invertido e entra no destino.
            valor: -Math.abs(dados.valor),
            itens: [],
            contaId: aporte ? dados.caixaId : dados.reservaId,
            contaDestinoId: aporte ? dados.reservaId : dados.caixaId,
          },
          Locais.padrao,
        );

        await carregar();
        toast.mostrar(aporte ? 'Aporte registrado' : 'Resgate registrado');
        return true;
      } catch (error: unknown) {
        console.error('Erro ao registrar transferência:', error);
        Alert.alert('Erro', 'Não foi possível registrar a transferência');
        return false;
      }
    },
    [carregar, contas, toast],
  );

  const abrirDetalhe = useCallback(async (reserva: ContaComSaldo): Promise<void> => {
    try {
      const mesAtual = dayjs().format('YYYY-MM');
      const [movimentos, aportadoNoMes] = await Promise.all([
        listMovimentosDaConta(reserva.id),
        totalAportadoNoMes(reserva.id, mesAtual),
      ]);

      setDetalhe({ reserva, movimentos, aportadoNoMes, mesAtual });
    } catch (error: unknown) {
      console.error('Erro ao carregar o detalhe da reserva:', error);
      Alert.alert('Erro', 'Não foi possível carregar o detalhe da reserva');
    }
  }, []);

  const fecharDetalhe = useCallback((): void => setDetalhe(null), []);

  return {
    contas,
    caixas: contas.filter((conta) => conta.tipo === 'caixa' && conta.ativo),
    loading,
    salvar,
    remover,
    transferir,
    detalhe,
    abrirDetalhe,
    fecharDetalhe,
  };
}
