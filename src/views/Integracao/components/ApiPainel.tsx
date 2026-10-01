import { View } from 'react-native';
import { Button, Text, TextInput } from '../../../components/ui';
import type { ApiConfig } from '../../../models/settingsModel';
import { fontSize, makeStyles, spacing, useTheme } from '../../../theme';
import type { ResultadoEnvioApi } from '../types';
import ResumoTabelas from './ResumoTabelas';

type ApiPainelProps = {
  config: ApiConfig;
  onChangeConfig: (config: ApiConfig) => void;
  resultado: ResultadoEnvioApi | null;
  carregando: boolean;
  onEnviar: () => void;
};

const formatarDataHora = (iso: string): string => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR');
};

/** Aba API: configura o endereco e envia o banco inteiro para a API de persistencia. */
export default function ApiPainel({
  config,
  onChangeConfig,
  resultado,
  carregando,
  onEnviar,
}: ApiPainelProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.painel}>
      <Text style={sharedStyles.sectionHint}>
        Envia uma cópia de todo o banco para a API. O app só manda dados; nada é alterado aqui.
      </Text>

      <View>
        <Text style={sharedStyles.label}>Endereço da API</Text>
        <TextInput
          style={sharedStyles.input}
          value={config.url}
          onChangeText={(url): void => onChangeConfig({ ...config, url })}
          placeholder="http://192.168.0.10:8010"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      </View>

      <View>
        <Text style={sharedStyles.label}>Chave (X-API-Key)</Text>
        <TextInput
          style={sharedStyles.input}
          value={config.token}
          onChangeText={(token): void => onChangeConfig({ ...config, token })}
          placeholder="Deixe vazio se a API não exigir"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
      </View>

      <Button
        label={carregando ? 'Enviando...' : 'Enviar banco para a API'}
        onPress={onEnviar}
        disabled={carregando || config.url.trim().length === 0}
      />

      {resultado === null ? null : (
        <>
          <ResumoTabelas titulo="Registros recebidos pela API" itens={resultado.resumo} />

          <View style={styles.metadados}>
            <Text style={styles.metadado}>
              Envio #{resultado.id} recebido em {formatarDataHora(resultado.recebidoEm)}
            </Text>
            <Text style={styles.metadado}>{resultado.totalRegistros} registro(s) enviados</Text>
          </View>

          {resultado.ignorados.length > 0 ? (
            <Text style={sharedStyles.sectionHint}>
              A API guardou o JSON completo, mas ainda nao espelha: {resultado.ignorados.join(', ')}
              . Atualize a API para incluir na analise.
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  painel: {
    gap: spacing.md,
  },
  metadados: {
    gap: 2,
  },
  metadado: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
}));
