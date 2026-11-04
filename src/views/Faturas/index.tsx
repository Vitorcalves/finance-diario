import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { MenuStackParamList } from '../../routes/types';
import { useTheme } from '../../theme';
import FaturaCard from './components/FaturaCard';
import PagarFaturaModal from './components/PagarFaturaModal';
import { useFaturas } from './useFaturas';

type FaturasViewProps = NativeStackScreenProps<MenuStackParamList, 'Faturas'>;

/**
 * Faturas de um cartao: cada ciclo de fechamento com status, vencimento e
 * total. O pagamento sai da conta pagante escolhida na hora e nao reaparece
 * como gasto — a compra ja contou quando aconteceu.
 */
export default function FaturasView({ route }: FaturasViewProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  // A tela sempre abre com conta: o unico caminho e o card do cartao em Contas.
  const contaId = route.params?.contaId ?? '';
  const { conta, faturas, contasPagantes, loading, pagar } = useFaturas(contaId);
  const [faturaPagando, setFaturaPagando] = useState<string | null>(null);

  const hoje = dayjs().format('YYYY-MM-DD');
  const faturaSelecionada = faturas.find((fatura) => fatura.id === faturaPagando) ?? null;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title={conta ? `Faturas — ${conta.nome}` : 'Faturas'} />

      {loading ? (
        <LoadingState />
      ) : faturas.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          message="Nenhuma fatura ainda: lançe uma compra neste cartão"
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {faturas.map((fatura) => (
            <FaturaCard
              key={fatura.id}
              fatura={fatura}
              hoje={hoje}
              onPagar={(): void => setFaturaPagando(fatura.id)}
            />
          ))}
        </ScrollView>
      )}

      <PagarFaturaModal
        visivel={faturaSelecionada !== null}
        fatura={faturaSelecionada}
        contasPagantes={contasPagantes}
        onPagar={pagar}
        onFechar={(): void => setFaturaPagando(null)}
      />
    </SafeAreaView>
  );
}
