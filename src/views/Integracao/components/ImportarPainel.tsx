import {View} from 'react-native';
import {Button, Text} from '../../../components/ui';
import {fontSize, fontWeight, makeStyles, radius, spacing, useTheme} from '../../../theme';
import type {PreviaImportacao} from '../types';
import CaixaJson from './CaixaJson';
import ResumoTabelas from './ResumoTabelas';

type ImportarPainelProps = {
  texto: string;
  onChangeTexto: (texto: string) => void;
  previa: PreviaImportacao | null;
  carregando: boolean;
  onValidar: () => void;
  onImportar: () => void;
  onLimpar: () => void;
  /** Abre o seletor de arquivos do sistema e joga o conteúdo em `onChangeTexto`. */
  onEscolherArquivo: () => void;
};

const formatarDataHora = (iso: string): string => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR');
};

/** Aba de importacao: cola ou escolhe um arquivo JSON, valida e sobrescreve o banco. */
export default function ImportarPainel({
                                         texto,
                                         onChangeTexto,
                                         previa,
                                         carregando,
                                         onValidar,
                                         onImportar,
                                         onLimpar,
                                         onEscolherArquivo,
                                       }: ImportarPainelProps): React.ReactNode {
  const {sharedStyles} = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.painel}>
      <View style={styles.aviso}>
        <Text style={styles.avisoTitulo}>Substitui todo o banco</Text>
        <Text style={styles.avisoTexto}>
          Os dados atuais são apagados e trocados pelos do JSON. Exporte um backup antes. Se algo
          falhar durante a carga, nada é gravado.
        </Text>
      </View>

      {/* Atalho: escolhe um .json do dispositivo e preenche a caixa abaixo. */}
      <Button
        label="Escolher arquivo .json"
        variant="secondary"
        onPress={onEscolherArquivo}
        disabled={carregando}
      />

      <CaixaJson
        valor={texto}
        onChangeText={onChangeTexto}
        placeholder="Cole aqui o JSON gerado na aba Exportar (ou escolha um arquivo acima)"
      />

      <View style={sharedStyles.actionsRow}>
        <Button
          label="Validar JSON"
          variant="secondary"
          flex
          onPress={onValidar}
          disabled={carregando || texto.trim().length === 0}
        />
        <Button
          label="Limpar"
          variant="secondary"
          flex
          onPress={onLimpar}
          disabled={carregando || texto.length === 0}
        />
      </View>

      {previa === null ? (
        <Text style={sharedStyles.sectionHint}>
          Valide o JSON para conferir o que será gravado antes de sobrescrever.
        </Text>
      ) : (
        <>
          <ResumoTabelas titulo="Registros que serão gravados" itens={previa.resumo}/>

          <View style={styles.metadados}>
            <Text style={styles.metadado}>
              Origem exportada em {formatarDataHora(previa.exportadoEm)}
            </Text>
            <Text style={styles.metadado}>Schema {previa.schemaVersion}</Text>
          </View>

          <Button
            label={carregando ? 'Sobrescrevendo...' : 'Sobrescrever banco'}
            variant="danger"
            onPress={onImportar}
            disabled={carregando}
          />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  painel: {
    gap: spacing.md,
  },
  aviso: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  avisoTitulo: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  avisoTexto: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
  metadados: {
    gap: 2,
  },
  metadado: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
}));