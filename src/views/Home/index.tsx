import { useState } from 'react';
import { Alert, RefreshControl, SectionList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import dayjs from 'dayjs';
import {
  Aparecer,
  EmptyState,
  Fab,
  LoadingState,
  ScreenHeader,
  SwipeableRow,
  Text,
  useToast,
} from '../../components/ui';
import type { Transacoes } from '../../models/transacoesModel';
import type { RootTabParamList } from '../../routes/types';
import { makeStyles, radius, spacing, useTheme } from '../../theme';
import AtalhosRapidos from './components/AtalhosRapidos';
import CabecalhoDia from './components/CabecalhoDia';
import NovoLancamentoForm from './components/NovoLancamentoForm';
import ResumoTotais from './components/ResumoTotais';
import TransacaoItem from './components/TransacaoItem';
import { type SecaoDia, useHome } from './useHome';

type HomeNavigation = BottomTabNavigationProp<RootTabParamList, 'Home'>;

/** Ex.: "Quarta, 30 de setembro". */
const dataPorExtenso = (): string => {
  const texto = dayjs().locale('pt-br').format('dddd, D [de] MMMM');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** Tela inicial: saldo, atalhos, novo lancamento e os lancamentos dia a dia. */
export default function HomeView(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<HomeNavigation>();
  const toast = useToast();
  const [formAberto, setFormAberto] = useState(false);
  const {
    loading,
    atualizando,
    atualizar,
    secoes,
    resumo,
    itensPorTransacao,
    nomeEmpresa,
    adicionarLancamento,
    excluir,
    restaurar,
  } = useHome();

  /** Apaga na hora e oferece o "Desfazer", em vez de perguntar antes. */
  const excluirLancamento = (transacao: Transacoes): void => {
    void (async (): Promise<void> => {
      try {
        const excluida = await excluir(transacao.id);

        if (!excluida) {
          return;
        }

        toast.mostrar(`"${transacao.descricao}" excluído`, {
          tipo: 'info',
          acao: {
            rotulo: 'Desfazer',
            onPress: (): void => {
              restaurar(excluida)
                .then(() => toast.mostrar('Lançamento restaurado'))
                .catch((error: unknown) => {
                  console.error('Erro ao restaurar lancamento', error);
                  Alert.alert('Erro', 'Não foi possível restaurar o lançamento');
                });
            },
          },
        });
      } catch (error: unknown) {
        console.error('Erro ao remover lancamento', error);
        Alert.alert('Erro', 'Não foi possível excluir o lançamento');
      }
    })();
  };

  const renderItem = ({
    item,
    index,
    section,
  }: {
    item: Transacoes;
    index: number;
    section: SecaoDia;
  }): React.ReactElement => {
    const primeiro = index === 0;
    const ultimo = index === section.data.length - 1;

    return (
      <SwipeableRow
        style={[styles.linha, primeiro && styles.linhaPrimeira, ultimo && styles.linhaUltima]}
        acoes={[
          {
            rotulo: 'Excluir',
            icone: 'trash-outline',
            tipo: 'danger',
            onPress: (): void => excluirLancamento(item),
          },
        ]}
      >
        <TransacaoItem
          transacao={item}
          itens={itensPorTransacao.get(item.id) ?? []}
          empresa={nomeEmpresa(item.empresa_id)}
        />
        {!ultimo && <View style={styles.separador} />}
      </SwipeableRow>
    );
  };

  const cabecalhoLista = (
    <View style={styles.cabecalhoLista}>
      <ResumoTotais resumo={resumo} />

      <Aparecer atraso={80}>
        <AtalhosRapidos
          atalhos={[
            {
              rotulo: 'Orçamento',
              icone: 'cart-outline',
              onPress: (): void => navigation.navigate('Dashboard', { screen: 'Orcamento' }),
            },
            {
              rotulo: 'Assinaturas',
              icone: 'repeat-outline',
              onPress: (): void => navigation.navigate('Menu', { screen: 'Planos' }),
            },
            {
              rotulo: 'Preços',
              icone: 'pricetags-outline',
              onPress: (): void => navigation.navigate('Dashboard', { screen: 'HistoricoPrecos' }),
            },
          ]}
        />
      </Aparecer>

      {secoes.length > 0 && (
        <View style={styles.tituloLista}>
          <Text style={sharedStyles.sectionTitle}>Lançamentos</Text>
          <Text style={sharedStyles.sectionHint}>Arraste para o lado para excluir</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Finance Diário" subtitle={dataPorExtenso()} />

      {loading ? (
        <LoadingState message="Carregando seus dados..." />
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(item): string => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }): React.ReactElement => (
            <CabecalhoDia dia={section.dia} total={section.total} />
          )}
          ListHeaderComponent={cabecalhoLista}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              message="Nenhum lançamento ainda"
              hint="Toque no + para registrar o primeiro gasto ou entrada."
            />
          }
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.conteudo}
          refreshControl={
            <RefreshControl
              refreshing={atualizando}
              onRefresh={atualizar}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          }
        />
      )}

      <Fab onPress={(): void => setFormAberto(true)} accessibilityLabel="Novo lançamento" />

      <NovoLancamentoForm
        visivel={formAberto}
        onFechar={(): void => setFormAberto(false)}
        onAddLancamento={adicionarLancamento}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  conteudo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    // Espaco para o ultimo lancamento nao ficar atras do botao flutuante.
    paddingBottom: 96,
  },
  cabecalhoLista: {
    gap: spacing.lg,
  },
  tituloLista: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  linha: {
    backgroundColor: colors.surface,
  },
  linhaPrimeira: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  linhaUltima: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  separador: {
    height: 1,
    marginLeft: spacing.lg + 40 + spacing.md,
    backgroundColor: colors.divider,
  },
}));
