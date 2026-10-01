import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, ScreenHeader } from '../../components/ui';
import { useTheme } from '../../theme';

/** Placeholder para funcionalidades futuras; ainda nao esta em nenhuma rota. */
export default function MoreView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Mais funcionalidades" />

      <EmptyState
        icon="construct-outline"
        message="Em construcao"
        hint="Esta tela e um placeholder para futuras features como categorias, relatorios e metas."
      />
    </SafeAreaView>
  );
}
