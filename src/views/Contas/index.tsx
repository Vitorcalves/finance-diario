import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { ContaComSaldo } from '../../models/contas';
import type { MenuStackParamList } from '../../routes/types';
import { useTheme } from '../../theme';
import ContaCard from './components/ContaCard';
import ContaFormModal from './components/ContaFormModal';
import ReservaDetalheModal from './components/ReservaDetalheModal';
import TransferenciaReservaModal, {
  type DadosTransferenciaReserva,
  type ModoTransferenciaReserva,
} from './components/TransferenciaReservaModal';
import { useContas } from './useContas';

type NavegacaoContas = NativeStackNavigationProp<MenuStackParamList, 'Contas'>;

/**
 * Cadastro de contas: caixas, reservas de investimento e cartoes de credito.
 * Compras no cartao sao vistas nas faturas dele; aportes e resgates sao
 * transferencias entre contas, nao gasto nem receita.
 */
export default function ContasView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const {
    contas,
    caixas,
    loading,
    salvar,
    remover,
    transferir,
    detalhe,
    abrirDetalhe,
    fecharDetalhe,
  } = useContas();
  const navigation = useNavigation<NavegacaoContas>();
  const [showForm, setShowForm] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce limpo. */
  const [formKey, setFormKey] = useState(0);
  const [contaEditando, setContaEditando] = useState<ContaComSaldo | null>(null);
  /** Reserva e modo do modal de aporte/resgate; `null` com o painel fechado. */
  const [transferencia, setTransferencia] = useState<{
    modo: ModoTransferenciaReserva;
    reserva: ContaComSaldo;
  } | null>(null);
  const [salvandoTransferencia, setSalvandoTransferencia] = useState(false);

  const abrirFormulario = (conta: ContaComSaldo | null): void => {
    setContaEditando(conta);
    setFormKey((atual) => atual + 1);
    setShowForm(true);
  };

  const confirmarTransferencia = async (dados: DadosTransferenciaReserva): Promise<boolean> => {
    setSalvandoTransferencia(true);
    try {
      return await transferir(dados);
    } finally {
      setSalvandoTransferencia(false);
    }
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Contas"
        subtitle="Caixas, reservas e cartões"
        onAdd={(): void => abrirFormulario(null)}
      />

      {loading ? (
        <LoadingState />
      ) : contas.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          message="Nenhuma conta cadastrada"
          actionLabel="Adicionar conta"
          onAction={(): void => abrirFormulario(null)}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {contas.map((conta) => (
            <ContaCard
              key={conta.id}
              conta={conta}
              onEditar={(): void => abrirFormulario(conta)}
              onRemover={(): void => remover(conta)}
              onVerFaturas={
                conta.tipo === 'cartao'
                  ? (): void => navigation.navigate('Faturas', { contaId: conta.id })
                  : undefined
              }
              onVerDetalhe={
                conta.tipo === 'reserva' ? (): void => void abrirDetalhe(conta) : undefined
              }
              onAportar={
                conta.tipo === 'reserva' && caixas.length > 0
                  ? (): void => setTransferencia({ modo: 'aporte', reserva: conta })
                  : undefined
              }
              onResgatar={
                conta.tipo === 'reserva' && caixas.length > 0
                  ? (): void => setTransferencia({ modo: 'resgate', reserva: conta })
                  : undefined
              }
            />
          ))}
        </ScrollView>
      )}

      <ContaFormModal
        key={formKey}
        visivel={showForm}
        conta={contaEditando}
        onFechar={(): void => setShowForm(false)}
        onSalvar={salvar}
      />

      <TransferenciaReservaModal
        visivel={transferencia !== null}
        modo={transferencia?.modo ?? 'aporte'}
        reserva={transferencia?.reserva ?? null}
        caixas={caixas}
        salvando={salvandoTransferencia}
        onFechar={(): void => setTransferencia(null)}
        onConfirmar={confirmarTransferencia}
      />

      <ReservaDetalheModal detalhe={detalhe} onFechar={fecharDetalhe} />
    </SafeAreaView>
  );
}
