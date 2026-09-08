import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import AppRoutes from './src/routes/AppRoutes';
import { colors } from './src/theme';
import { initializeDatabase, getConnection } from './src/models/database';
import * as SQLite from 'expo-sqlite';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';

export default function App(): React.ReactNode {
  const [ready, setReady] = useState(false);
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useDrizzleStudio(db);

  useEffect(() => {
    initializeDatabase()
      .then(() => getConnection())
      .then((connection) => {
        setDb(connection);
        setReady(true);
      })
      .catch((error) => console.error('Erro ao inicializar banco de dados', error));
  }, []);

  if (!ready) {
    return (
      <View style={styles.safeArea}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AppRoutes />;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
