import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  type AcaoMenu,
  EmptyState,
  LoadingState,
  MenuAcoes,
  ScreenHeader,
  Text,
} from '../../components/ui';
import { type ContaComSaldo, podeRemoverConta } from '../../models/contas';
import type { MenuStackParamList } from '../../routes/types';
import { makeStyles, spacing, useTheme } from '../../theme';
import { valorDaConta } from '../../utils/contas';
import { toCurrency } from '../../utils/format';
import ContaCard from './components/ContaCard';
import ContaFormModal from './components/ContaFormModal';
import ReservaDetalheModal from './components/ReservaDetalheModal';
import ResumoContas from './components/ResumoContas';
import TransferenciaReservaModal, {
  type DadosTransferenciaReserva,
  type ModoTransferenciaReserva,
} from './components/TransferenciaReservaModal';
import { useContas } from './useContas';

type NavegacaoContas = NativeStackNavigationProp<MenuStackParamList, 'Contas'>;

/**
 * Contas: caixas, reservas de investimento e cartoes de credito.
 *
 * Segue o formato da tela de Planos: resumo no topo e uma secao por tipo
 * (as inativas no fim). Cada cartao mostra o numero principal da conta e as
 * acoes do dia a dia; o resto fica no "...".
 */
export default function ContasView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const {
    contas,
    secoes,
    totais,
    quantidade,
    caixas,
    loading,
    salvar,
    remover,
    reativar,
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
  /**
   * Conta do menu "...". Fica guardada enquanto o menu fecha, para o painel
   * nao esvaziar durante a animacao (mesmo jeito da lista de produtos).
   */
  const [contaAcoes, setContaAcoes] = useState<ContaComSaldo | null>(null);
  const [menuVisivel, setMenuVisivel] = useState(false);
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

  const verFaturas = (conta: ContaComSaldo): void =>
    navigation.navigate('Faturas', { contaId: conta.id });

  const confirmarTransferencia = async (dados: DadosTransferenciaReserva): Promise<boolean> => {
    setSalvandoTransferencia(true);
    try {
      return await transferir(dados);
    } finally {
      setSalvandoTransferencia(false);
    }
  };

  /**
   * Acoes do "...". O que ja tem botao no cartao (aportar, resgatar, faturas
   * do cartao ativo) nao se repete aqui. Remover vira "Inativar" quando a
   * conta tem lancamentos, e o caixa padrao nunca sai.
   */
  const acoesDaConta = (conta: ContaComSaldo): AcaoMenu[] => {
    const acoes: AcaoMenu[] = [];

    if (conta.tipo === 'reserva') {
      acoes.push({
        rotulo: 'Ver extrato',
        icone: 'list-outline',
        onPress: (): void => void abrirDetalhe(conta),
      });
    }

    if (conta.tipo === 'cartao' && !conta.ativo) {
      acoes.push({
        rotulo: 'Ver faturas',
        icone: 'receipt-outline',
        onPress: (): void => verFaturas(conta),
      });
    }

    acoes.push({
      rotulo: 'Editar conta',
      icone: 'pencil-outline',
      onPress: (): void => abrirFormulario(conta),
    });

    if (!conta.ativo) {
      acoes.push({
        rotulo: 'Reativar conta',
        icone: 'refresh-outline',
        onPress: (): void => reativar(conta),
      });
    }

    if (podeRemoverConta(conta)) {
      if (!conta.possui_lancamentos) {
        acoes.push({
          rotulo: 'Excluir conta',
          icone: 'trash-outline',
          perigo: true,
          onPress: (): void => remover(conta),
        });
      } else if (conta.ativo) {
        acoes.push({
          rotulo: 'Inativar conta',
          icone: 'eye-off-outline',
          perigo: true,
          onPress: (): void => remover(conta),
        });
      }
    }

    return acoes;
  };

  const valorNoMenu = contaAcoes ? valorDaConta(contaAcoes) : null;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Contas"
        subtitle="Caixas, reservas e cartões"
        onAdd={(): void => abrirFormulario(null)}
      />

      {loading ? (
        <LoadingState message="Carregando contas..." />
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
          contentContainerStyle={sharedStyles.scrollContent}
        >
          <ResumoContas totais={totais} quantidade={quantidade} />

          {secoes.map((secao) => (
            <View key={secao.chave} style={styles.secao}>
              <Text style={sharedStyles.sectionTitle}>{secao.titulo}</Text>

              {secao.contas.map((conta) => {
                const reservaAtiva = Boolean(conta.ativo) && conta.tipo === 'reserva';
                const podeTransferir = reservaAtiva && caixas.length > 0;

                return (
                  <ContaCard
                    key={conta.id}
                    conta={conta}
                    onAbrirAcoes={(): void => {
                      setContaAcoes(conta);
                      setMenuVisivel(true);
                    }}
                    onAportar={
                      podeTransferir
                        ? (): void => setTransferencia({ modo: 'aporte', reserva: conta })
                        : undefined
                    }
                    onResgatar={
                      podeTransferir
                        ? (): void => setTransferencia({ modo: 'resgate', reserva: conta })
                        : undefined
                    }
                    onVerFaturas={
                      conta.ativo && conta.tipo === 'cartao'
                        ? (): void => verFaturas(conta)
                        : undefined
                    }
                  />
                );
              })}
            </View>
          ))}
        </ScrollView>
      )}

      <MenuAcoes
        visivel={menuVisivel}
        titulo={contaAcoes?.nome ?? ''}
        subtitulo={
          valorNoMenu ? `${valorNoMenu.rotulo}: ${toCurrency(valorNoMenu.valor)}` : undefined
        }
        acoes={contaAcoes ? acoesDaConta(contaAcoes) : []}
        onFechar={(): void => setMenuVisivel(false)}
      />

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

const useStyles = makeStyles(() => ({
  secao: {
    gap: spacing.sm,
  },
}));
