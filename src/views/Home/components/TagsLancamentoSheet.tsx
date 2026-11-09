import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { BottomSheet, Button, PressableScale, Text, TextInput } from '../../../components/ui';
import { type Tag, ValidacaoTagError } from '../../../models/tags';
import { fontSize, fontWeight, iconSize, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { vibrarSelecao } from '../../../utils/haptics';

type TagsLancamentoSheetProps = {
  visivel: boolean;
  /** Descricao do lancamento, no subtitulo. */
  descricao: string;
  /** Parcela ou assinatura: as tags vao para o plano inteiro. */
  emPlano: boolean;
  tags: Tag[];
  /** Tags do lancamento ao abrir; troque a `key` do painel para outro lancamento. */
  selecionadasIniciais: string[];
  onSalvar: (tagIds: string[]) => void;
  /** Cria a tag; recusa com `ValidacaoTagError` (nome vazio ou repetido). */
  onCriarTag: (nome: string) => Promise<Tag>;
  onFechar: () => void;
};

/**
 * Marca o lancamento com tags de evento ("Viagem julho", "Reforma"). Varias
 * podem ser marcadas; uma tag nova pode ser criada aqui mesmo e ja vem marcada.
 */
export default function TagsLancamentoSheet({
  visivel,
  descricao,
  emPlano,
  tags,
  selecionadasIniciais,
  onSalvar,
  onCriarTag,
  onFechar,
}: TagsLancamentoSheetProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [selecionadas, setSelecionadas] = useState<string[]>(selecionadasIniciais);
  /** Criadas neste painel: aparecem antes de a tela recarregar a lista. */
  const [criadas, setCriadas] = useState<Tag[]>([]);
  const [nomeNova, setNomeNova] = useState('');
  const [criando, setCriando] = useState(false);

  const todas = [...tags, ...criadas.filter((tag) => !tags.some((atual) => atual.id === tag.id))];

  const alternar = (id: string): void => {
    vibrarSelecao();
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((atual) => atual !== id) : [...atuais, id],
    );
  };

  const criar = (): void => {
    if (criando) {
      return;
    }

    void (async (): Promise<void> => {
      setCriando(true);

      try {
        const tag = await onCriarTag(nomeNova);
        setCriadas((atuais) => [...atuais, tag]);
        setSelecionadas((atuais) => [...atuais, tag.id]);
        setNomeNova('');
      } catch (error: unknown) {
        if (error instanceof ValidacaoTagError) {
          Alert.alert('Confira a tag', error.message);
        } else {
          console.error('Erro ao criar tag', error);
          Alert.alert('Erro', 'Não foi possível criar a tag');
        }
      } finally {
        setCriando(false);
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo="Tags do lançamento"
      subtitulo={descricao}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button
            label="Salvar"
            icon="checkmark"
            flex
            onPress={(): void => {
              onSalvar(selecionadas);
              onFechar();
            }}
          />
        </View>
      }
    >
      {emPlano && (
        <Text style={styles.aviso}>Parcela ou assinatura: as tags valem para o plano inteiro.</Text>
      )}

      {todas.length === 0 ? (
        <Text style={styles.vazio}>
          Nenhuma tag ainda. Crie a primeira abaixo, como &quot;Viagem julho&quot; ou
          &quot;Reforma&quot;, para somar quanto custou o evento.
        </Text>
      ) : (
        <View style={styles.lista}>
          {todas.map((tag) => {
            const marcada = selecionadas.includes(tag.id);

            return (
              <PressableScale
                key={tag.id}
                style={[styles.item, marcada && styles.itemMarcado]}
                escala={0.98}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: marcada }}
                onPress={(): void => alternar(tag.id)}
              >
                <Ionicons
                  name={marcada ? 'checkbox' : 'square-outline'}
                  size={iconSize.md}
                  color={marcada ? colors.primary : colors.textSubtle}
                />
                <View style={styles.textos}>
                  <Text style={[styles.nome, marcada && styles.nomeMarcado]} numberOfLines={1}>
                    {tag.nome}
                  </Text>
                  {tag.descricao ? (
                    <Text style={styles.descricao} numberOfLines={1}>
                      {tag.descricao}
                    </Text>
                  ) : null}
                </View>
              </PressableScale>
            );
          })}
        </View>
      )}

      <Text style={sharedStyles.label}>Nova tag</Text>
      <View style={styles.novaLinha}>
        <TextInput
          style={[sharedStyles.input, styles.novaInput]}
          placeholder="Ex.: Viagem julho"
          value={nomeNova}
          onChangeText={setNomeNova}
          onSubmitEditing={criar}
          returnKeyType="done"
          placeholderTextColor={colors.placeholder}
        />
        <Button
          label="Criar"
          icon="add"
          variant="secondary"
          loading={criando}
          disabled={!nomeNova.trim()}
          onPress={criar}
        />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  aviso: {
    fontSize: fontSize.caption,
    color: colors.info,
    marginBottom: spacing.md,
  },
  vazio: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  lista: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  itemMarcado: {
    backgroundColor: colors.primarySoft,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nome: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  nomeMarcado: {
    fontWeight: fontWeight.bold,
  },
  descricao: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  novaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  novaInput: {
    flex: 1,
  },
}));
