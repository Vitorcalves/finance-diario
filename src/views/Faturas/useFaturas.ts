import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useToast } from '../../components/ui';
import { type Conta, getContaById, listContasPorTipo } from '../../models/contas';
import { type FaturaComTotal, listFaturas, pagarFatura } from '../../models/faturas';

export type UseFaturas = {
  conta: Conta | null;
  faturas: FaturaComTotal[];
  contasPagantes: Conta[];
  loading: boolean;
  /** Paga a fatura e devolve `true` quando deu certo. */
  pagar: (faturaId: string, contaPaganteId: string, dataPagamento: string) => Promise<boolean>;
};

/** Faturas de um cartao: ciclos com status, total e pagamento. */
export function useFaturas(contaId: string): UseFaturas {
  const toast = useToast();
  const [conta, setConta] = useState<Conta | null>(null);
  const [faturas, setFaturas] = useState<FaturaComTotal[]>([]);
  const [contasPagantes, setContasPagantes] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      const [contaDoBanco, faturasDoBanco, caixasDoBanco] = await Promise.all([
        getContaById(contaId),
        listFaturas(contaId),
        listContasPorTipo('caixa'),
      ]);

      setConta(contaDoBanco);
      setFaturas(faturasDoBanco);
      setContasPagantes(caixasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar faturas:', error);
      Alert.alert('Erro', 'Não foi possível carregar as faturas');
    } finally {
      setLoading(false);
    }
  }, [contaId]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const pagar = useCallback(
    async (faturaId: string, contaPaganteId: string, dataPagamento: string): Promise<boolean> => {
      try {
        await pagarFatura(faturaId, contaPaganteId, dataPagamento);
        await carregar();
        toast.mostrar('Fatura paga');
        return true;
      } catch (error: unknown) {
        console.error('Erro ao pagar fatura:', error);
        Alert.alert(
          'Erro',
          error instanceof Error ? error.message : 'Não foi possível pagar a fatura',
        );
        return false;
      }
    },
    [carregar, toast],
  );

  return { conta, faturas, contasPagantes, loading, pagar };
}
