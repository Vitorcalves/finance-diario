import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../../../components/ui';
import type { ConsultaIa } from '../../../models/sincronizacaoApi';
import { colors, fontSize, fontWeight, radius, sharedStyles, spacing } from '../../../theme';
import type { ResultadoConsultaIa } from '../types';

type IaPainelProps = {
  /** `false` quando o endereco da API ainda nao foi preenchido na aba API. */
  configurada: boolean;
  pergunta: string;
  onChangePergunta: (pergunta: string) => void;
  pensar: boolean;
  onChangePensar: (pensar: boolean) => void;
  resultado: ResultadoConsultaIa | null;
  carregando: boolean;
  onConsultar: () => void;
  onLimpar: () => void;
};

const formatarDataHora = (iso: string): string => {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? iso : data.toLocaleString('pt-BR');
};

const formatarSegundos = (segundos: number): string => `${segundos.toFixed(1).replace('.', ',')}s`;

/**
 * Renderiza o Markdown minimo que a API devolve: apenas `**negrito**`.
 * Qualquer outra marcacao aparece como texto puro.
 */
const TextoMarkdown = ({ texto }: { texto: string }): React.ReactNode => {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g);

  return (
    <Text style={styles.resposta} selectable>
      {partes.map((parte, indice) =>
        parte.startsWith('**') && parte.endsWith('**') ? (
          <Text key={indice} style={styles.respostaNegrito}>
            {parte.slice(2, -2)}
          </Text>
        ) : (
          <Text key={indice}>{parte}</Text>
        ),
      )}
    </Text>
  );
};

/** Bloco que comeca fechado; usado para o raciocinio e as consultas, que sao longos. */
const SecaoRecolhivel = ({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}): React.ReactNode => {
  const [aberta, setAberta] = useState(false);

  return (
    <View style={sharedStyles.card}>
      <Pressable
        onPress={(): void => setAberta((valor) => !valor)}
        style={styles.recolhivelCabecalho}
        accessibilityRole="button"
        accessibilityState={{ expanded: aberta }}
      >
        <Text style={sharedStyles.sectionTitle}>{titulo}</Text>
        <Text style={styles.recolhivelSeta}>{aberta ? 'Ocultar' : 'Mostrar'}</Text>
      </Pressable>

      {aberta ? children : null}
    </View>
  );
};

const LinhaConsulta = ({
  consulta,
  indice,
}: {
  consulta: ConsultaIa;
  indice: number;
}): React.ReactNode => (
  <View style={styles.consulta}>
    <View style={styles.consultaCabecalho}>
      <Text style={styles.consultaIndice}>#{indice + 1}</Text>
      <Text style={styles.metadado}>
        {consulta.erro === null
          ? `${consulta.linhas} linha(s) em ${formatarSegundos(consulta.segundos)}`
          : `falhou em ${formatarSegundos(consulta.segundos)}`}
      </Text>
    </View>

    <Text style={styles.sql} selectable>
      {consulta.sql}
    </Text>

    {consulta.erro === null ? null : <Text style={styles.consultaErro}>{consulta.erro}</Text>}
  </View>
);

/** Aba IA: manda uma pergunta em linguagem natural para o modelo da API e mostra a resposta. */
export default function IaPainel({
  configurada,
  pergunta,
  onChangePergunta,
  pensar,
  onChangePensar,
  resultado,
  carregando,
  onConsultar,
  onLimpar,
}: IaPainelProps): React.ReactNode {
  return (
    <View style={styles.painel}>
      <Text style={sharedStyles.sectionHint}>
        Pergunte sobre os dados que ja foram enviados para a API. O modelo consulta o espelho no
        servidor; nada e alterado aqui.
      </Text>

      {configurada ? null : (
        <Text style={styles.avisoConfig}>
          Informe o endereco da API na aba API antes de perguntar.
        </Text>
      )}

      <View>
        <Text style={sharedStyles.label}>Pergunta</Text>
        <TextInput
          style={[sharedStyles.input, sharedStyles.inputMultiline]}
          value={pergunta}
          onChangeText={onChangePergunta}
          placeholder="Ex.: Quanto ainda falta pagar do tenis de corrida?"
          placeholderTextColor={colors.textSubtle}
          multiline
          editable={!carregando}
        />
      </View>

      <View style={styles.opcao}>
        <View style={styles.opcaoTexto}>
          <Text style={styles.opcaoTitulo}>Raciocinar antes de responder</Text>
          <Text style={sharedStyles.sectionHint}>Mais lento, porem mais preciso.</Text>
        </View>
        <Switch value={pensar} onValueChange={onChangePensar} disabled={carregando} />
      </View>

      <View style={sharedStyles.actionsRow}>
        <Button
          label={carregando ? 'Consultando...' : 'Perguntar'}
          flex
          onPress={onConsultar}
          disabled={carregando || !configurada || pergunta.trim().length === 0}
        />
        <Button
          label="Limpar"
          variant="secondary"
          flex
          onPress={onLimpar}
          disabled={carregando || (pergunta.length === 0 && resultado === null)}
        />
      </View>

      {carregando ? (
        <Text style={sharedStyles.sectionHint}>
          O modelo pode levar alguns segundos, principalmente com raciocinio ligado.
        </Text>
      ) : null}

      {resultado === null ? null : (
        <>
          <View style={sharedStyles.card}>
            <Text style={styles.perguntaFeita}>{resultado.pergunta}</Text>
            <TextoMarkdown texto={resultado.resposta.resposta} />

            {resultado.resposta.cortado ? (
              <Text style={styles.avisoCortado}>
                A resposta foi cortada pelo limite de tokens ou passos; pode estar incompleta.
              </Text>
            ) : null}
          </View>

          <View style={styles.metadados}>
            <Text style={styles.metadado}>
              {resultado.resposta.modelo} em {formatarSegundos(resultado.resposta.segundos)} -{' '}
              {resultado.resposta.passos} passo(s) - {resultado.resposta.consultas.length}{' '}
              consulta(s)
            </Text>
            <Text style={styles.metadado}>
              {resultado.resposta.tokens_entrada.toLocaleString('pt-BR')} tokens de entrada -{' '}
              {resultado.resposta.tokens_saida.toLocaleString('pt-BR')} de saida
            </Text>
            <Text style={styles.metadado}>
              Recebido em {formatarDataHora(resultado.recebidoEm)}
            </Text>
          </View>

          {resultado.resposta.consultas.length > 0 ? (
            <SecaoRecolhivel titulo="Consultas executadas">
              {resultado.resposta.consultas.map((consulta, indice) => (
                <LinhaConsulta key={indice} consulta={consulta} indice={indice} />
              ))}
            </SecaoRecolhivel>
          ) : null}

          {resultado.resposta.raciocinio.trim().length > 0 ? (
            <SecaoRecolhivel titulo="Raciocinio do modelo">
              <Text style={styles.raciocinio} selectable>
                {resultado.resposta.raciocinio}
              </Text>
            </SecaoRecolhivel>
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
  avisoConfig: {
    fontSize: fontSize.small,
    color: colors.warning,
  },
  opcao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  opcaoTexto: {
    flex: 1,
    gap: 2,
  },
  opcaoTitulo: {
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  perguntaFeita: {
    fontSize: fontSize.small,
    color: colors.textSubtle,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  resposta: {
    fontSize: fontSize.body,
    lineHeight: 22,
    color: colors.textBody,
  },
  respostaNegrito: {
    fontWeight: fontWeight.bold,
    color: colors.primaryDeep,
  },
  avisoCortado: {
    marginTop: spacing.sm,
    fontSize: fontSize.small,
    color: colors.warning,
  },
  metadados: {
    gap: 2,
  },
  metadado: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  recolhivelCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  recolhivelSeta: {
    fontSize: fontSize.caption,
    color: colors.primary,
  },
  consulta: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  consultaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  consultaIndice: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.primaryDeep,
  },
  sql: {
    fontSize: fontSize.caption,
    fontFamily: 'monospace',
    color: colors.textBody,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  consultaErro: {
    fontSize: fontSize.caption,
    color: colors.danger,
  },
  raciocinio: {
    fontSize: fontSize.small,
    lineHeight: 20,
    color: colors.textMuted,
  },
});
