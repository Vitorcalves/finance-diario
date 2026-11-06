import { useState } from 'react';
import { View } from 'react-native';
import { Button, Text } from '../../../components/ui';
import { fontSize, makeStyles, spacing, useTheme } from '../../../theme';
import type { ResultadoExportacao } from '../types';
import CaixaJson from './CaixaJson';
import ResumoTabelas from './ResumoTabelas';

/**
 * Acima deste tamanho a caixa de texto comeca colapsada: montar centenas de
 * milhares de caracteres em um TextInput trava a tela sem necessidade quando o
 * usuario so quer compartilhar o arquivo.
 */
const LIMITE_EXIBICAO_DIRETA = 150000;

type ExportarPainelProps = {
  exportacao: ResultadoExportacao | null;
  carregando: boolean;
  /** Enquanto o sistema grava/compartilha o arquivo, travamos os dois botoes de entrega. */
  salvandoArquivo: boolean;
  onGerar: () => void;
  onCompartilhar: () => void;
  onSalvarArquivo: () => void;
  /** Enquanto a copia e gravada na pasta de backups do app. */
  criandoBackup: boolean;
  onCriarBackup: () => void;
};

const formatarDataHora = (iso: string): string => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR');
};

/**
 * Aba de exportacao: gera o JSON do banco e o entrega para copiar, salvar ou
 * compartilhar, ou grava um backup na pasta do proprio app.
 */
export default function ExportarPainel({
  exportacao,
  carregando,
  salvandoArquivo,
  onGerar,
  onCompartilhar,
  onSalvarArquivo,
  criandoBackup,
  onCriarBackup,
}: ExportarPainelProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const [mostrarJson, setMostrarJson] = useState(false);

  const grande = (exportacao?.json.length ?? 0) > LIMITE_EXIBICAO_DIRETA;
  const jsonVisivel = exportacao !== null && (!grande || mostrarJson);
  const ocupado = carregando || salvandoArquivo;

  return (
    <View style={styles.painel}>
      <Text style={sharedStyles.sectionHint}>
        Lê todas as tabelas do banco e monta um JSON único. Salve como arquivo para guardar um
        backup, compartilhe como texto para enviar pelo chat, ou selecione o texto para copiar.
        “Criar backup no app” guarda uma cópia aqui mesmo, que pode ser restaurada em Importar.
      </Text>

      <Button
        label={carregando ? 'Gerando...' : 'Gerar JSON do banco'}
        onPress={onGerar}
        disabled={carregando}
      />

      <Button
        label={criandoBackup ? 'Criando backup...' : 'Criar backup no app'}
        variant="secondary"
        onPress={onCriarBackup}
        disabled={criandoBackup}
      />

      {exportacao === null ? null : (
        <>
          <ResumoTabelas titulo="Registros exportados" itens={exportacao.resumo} />

          <View style={styles.metadados}>
            <Text style={styles.metadado}>Gerado em {formatarDataHora(exportacao.geradoEm)}</Text>
            <Text style={styles.metadado}>
              {exportacao.json.length.toLocaleString('pt-BR')} caracteres
            </Text>
          </View>

          <View style={sharedStyles.actionsRow}>
            <Button
              label={salvandoArquivo ? 'Salvando...' : 'Salvar arquivo .json'}
              variant="secondary"
              flex
              onPress={onSalvarArquivo}
              disabled={ocupado}
            />
            <Button
              label="Compartilhar como texto"
              variant="secondary"
              flex
              onPress={onCompartilhar}
              disabled={ocupado}
            />
          </View>

          {jsonVisivel ? (
            <CaixaJson valor={exportacao.json} />
          ) : (
            <Button
              label="Mostrar JSON na tela"
              variant="secondary"
              onPress={(): void => setMostrarJson(true)}
            />
          )}

          {grande && !mostrarJson ? (
            <Text style={sharedStyles.sectionHint}>
              O JSON é grande; exibi-lo na tela pode deixar o app lento. Prefira salvar como arquivo
              ou compartilhar.
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  painel: { gap: spacing.md },
  metadados: { gap: 2 },
  metadado: { fontSize: fontSize.caption, color: colors.textSubtle },
}));
