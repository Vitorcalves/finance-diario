import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui';
import { colors, fontSize, sharedStyles, spacing } from '../../../theme';
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
  onGerar: () => void;
  onCompartilhar: () => void;
};

const formatarDataHora = (iso: string): string => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR');
};

/** Aba de exportacao: gera o JSON do banco e o entrega para copiar ou compartilhar. */
export default function ExportarPainel({
  exportacao,
  carregando,
  onGerar,
  onCompartilhar,
}: ExportarPainelProps): React.ReactNode {
  const [mostrarJson, setMostrarJson] = useState(false);

  const grande = (exportacao?.json.length ?? 0) > LIMITE_EXIBICAO_DIRETA;
  const jsonVisivel = exportacao !== null && (!grande || mostrarJson);

  return (
    <View style={styles.painel}>
      <Text style={sharedStyles.sectionHint}>
        Le todas as tabelas do banco e monta um JSON unico. Use Compartilhar para enviar o arquivo
        ou selecione o texto para copiar.
      </Text>

      <Button
        label={carregando ? 'Gerando...' : 'Gerar JSON do banco'}
        onPress={onGerar}
        disabled={carregando}
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

          <Button label="Compartilhar JSON" variant="secondary" onPress={onCompartilhar} />

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
              O JSON e grande; exibi-lo na tela pode deixar o app lento. Prefira Compartilhar.
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
