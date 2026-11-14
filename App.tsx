import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SQLite from 'expo-sqlite';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import AppRoutes from './src/routes/AppRoutes';
import { ToastProvider } from './src/components/ui';
import { type PreferenciaTema, ThemeProvider, useTheme } from './src/theme';
import { initializeDatabase, getConnection } from './src/models/database';
import { backupAntesDasMigrations } from './src/models/backupAutomatico';
import { getTemaPreferido, saveTemaPreferido } from './src/models/settingsModel';

// A tela de abertura (a logo no fundo do tema, configurada no `app.json`) fica
// ate o banco e a fonte carregarem; quem a esconde e o `App`. A chamada tem que
// ficar aqui, fora do componente: mais tarde o splash ja teria saido sozinho.
SplashScreen.preventAutoHideAsync().catch((error) =>
  console.error('Erro ao segurar a tela de abertura', error),
);

/** Barra de status unica do app: texto claro no modo escuro e escuro no claro. */
function StatusBarDoTema(): React.ReactNode {
  const { escuro } = useTheme();
  return <StatusBar style={escuro ? 'light' : 'dark'} />;
}

function Carregando(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();

  return (
    <View style={[sharedStyles.screen, sharedStyles.centerContent]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function App(): React.ReactNode {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);
  const [preferencia, setPreferencia] = useState<PreferenciaTema | null>(null);
  const [fontesCarregadas, erroFontes] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useDrizzleStudio(db);

  useEffect(() => {
    initializeDatabase({ antesDeMigrar: backupAntesDasMigrations })
      .then(() => Promise.all([getConnection(), getTemaPreferido()]))
      .then(([connection, tema]) => {
        setPreferencia(tema);
        setDb(connection);
      })
      .catch((error) => {
        console.error('Erro ao inicializar banco de dados', error);
        // Sem banco o app para no indicador: o splash sai para nao esconder a falha.
        SplashScreen.hide();
      });
  }, []);

  const alterarPreferencia = useCallback((nova: PreferenciaTema): void => {
    setPreferencia(nova);
    saveTemaPreferido(nova).catch((error) => console.error('Erro ao salvar o tema', error));
  }, []);

  // Sem a Inter (erro ao carregar) o app segue com a fonte do sistema.
  const pronto = db !== null && (fontesCarregadas || erroFontes !== null);

  // O efeito roda com as rotas ja montadas: o splash sai direto para o app.
  useEffect(() => {
    if (pronto) {
      SplashScreen.hide();
    }
  }, [pronto]);

  return (
    <SafeAreaProvider>
      <ThemeProvider
        preferencia={preferencia ?? 'sistema'}
        onAlterarPreferencia={alterarPreferencia}
        fontesCarregadas={fontesCarregadas}
      >
        <StatusBarDoTema />
        {pronto ? (
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        ) : (
          <Carregando />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
