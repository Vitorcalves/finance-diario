import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LoadingState, ScreenHeader, Text } from '../../components/ui';
import type { FiltrosIniciaisBusca, HomeStackParamList } from '../../routes/types';
import { fontSize, fontWeight, makeStyles, radius, shadows, spacing, useTheme } from '../../theme';
import { toCurrency } from '../../utils/format';
import ListaLancamentos from '../Home/components/ListaLancamentos';
import FiltrosBusca from './components/FiltrosBusca';
import { useBuscaLancamentos } from './useBuscaLancamentos';

type BuscaNavigation = NativeStackNavigationProp<HomeStackParamList, 'BuscaLancamentos'>;
type BuscaRoute = RouteProp<HomeStackParamList, 'BuscaLancamentos'>;

/** Todos os lancamentos, com busca por texto e filtros de periodo, tipo, categoria e empresa. */
export default function BuscaLancamentosView(): React.ReactNode {
  const route = useRoute<BuscaRoute>();

  // Chegar de novo com outros filtros (ex.: outra categoria no Mes) recomeca a busca.
  return <ConteudoBusca key={JSON.stringify(route.params ?? {})} iniciais={route.params} />;
}

function ConteudoBusca({ iniciais }: { iniciais?: FiltrosIniciaisBusca }): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<BuscaNavigation>();
  const busca = useBuscaLancamentos(iniciais);
  const { totais } = busca;

  const resumo = (
    <View style={styles.resumo}>
      <Text style={styles.resumoQuantidade}>
        {`${totais.quantidade} ${totais.quantidade === 1 ? 'lançamento' : 'lançamentos'}`}
      </Text>
      <View style={styles.resumoValores}>
        {totais.saidas > 0 && (
          <Text style={[styles.resumoValor, sharedStyles.negative]}>
            {`−${toCurrency(totais.saidas)}`}
          </Text>
        )}
        {totais.entradas > 0 && (
          <Text style={[styles.resumoValor, sharedStyles.positive]}>
            {`+${toCurrency(totais.entradas)}`}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Lançamentos" onBack={(): void => navigation.goBack()} />

      <FiltrosBusca
        termo={busca.termo}
        onTermo={busca.setTermo}
        periodo={busca.periodo}
        onPeriodo={busca.setPeriodo}
        personalizado={busca.personalizado}
        onPersonalizado={busca.setPersonalizado}
        tipo={busca.tipo}
        onTipo={busca.setTipo}
        categoriaId={busca.categoriaId}
        onCategoria={busca.setCategoriaId}
        empresaId={busca.empresaId}
        onEmpresa={busca.setEmpresaId}
        contaId={busca.contaId}
        onConta={busca.setContaId}
        categorias={busca.categorias}
        empresas={busca.empresas}
        contas={busca.contas}
        filtrosAtivos={busca.filtrosAtivos}
        onLimpar={busca.limparFiltros}
      />

      {busca.loading ? (
        <LoadingState message="Buscando lançamentos..." />
      ) : (
        <ListaLancamentos
          secoes={busca.secoes}
          itensPorTransacao={busca.itensPorTransacao}
          nomeEmpresa={busca.nomeEmpresa}
          categorias={busca.categorias}
          categoriaPorId={busca.categoriaPorId}
          excluir={busca.excluir}
          restaurar={busca.restaurar}
          definirCategoria={busca.definirCategoria}
          ListHeaderComponent={totais.quantidade > 0 ? resumo : undefined}
          ListEmptyComponent={
            <EmptyState
              icon="search"
              message="Nenhum lançamento encontrado"
              hint={
                busca.filtrosAtivos
                  ? 'Tente outro termo ou limpe os filtros.'
                  : 'Os lançamentos registrados aparecem aqui.'
              }
            />
          }
          contentContainerStyle={styles.conteudo}
        />
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  conteudo: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  resumoQuantidade: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  resumoValores: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resumoValor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
}));
