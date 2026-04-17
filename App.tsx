import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AppRoutes from './src/routes/AppRoutes';
import { initializeDatabase } from './src/models/database';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initializeDatabase()
      .then(() => setReady(true))
      .catch((error) => console.error('Erro ao inicializar banco de dados', error));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0f7a5b" />
      </View>
    );
  }

  return <AppRoutes />;
}
