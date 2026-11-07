import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  EmptyState,
  KeyboardAvoidingScreen,
  LoadingState,
  PressableScale,
  ScreenHeader,
  Text,
  TextInput,
  useToast,
} from '../../components/ui';
import { type NotaLancamento, ValidacaoNotaError } from '../../models/notasLancamento';
import { fontSize, iconSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { vibrarAviso } from '../../utils/haptics';
import { interpretarNota } from '../../utils/interpretarNota';
import NovoLancamentoForm from '../Home/components/NovoLancamentoForm';
import type { RascunhoLancamento } from '../Home/types';
import NotaCard from './components/NotaCard';
import { useDitado } from './useDitado';
import { useNotasLancamento } from './useNotasLancamento';

/**
 * Bloco de notas de lancamentos: anota rapido, por texto ou voz, o que ainda
 * falta lancar ("almoço 35 ontem no cartão") e lanca depois. Ao lancar, o
 * texto vira um rascunho do formulario de lancamento para conferir.
 */
export default function NotasLancamentoView(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const navigation = useNavigation();
  const { loading, notas, catalogo, salvar, excluir, lancar } = useNotasLancamento();

  const [texto, setTexto] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [notaLancando, setNotaLancando] = useState<NotaLancamento | null>(null);
  const [rascunho, setRascunho] = useState<RascunhoLancamento | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  /** Trocada a cada nota lancada: o formulario so le o rascunho ao montar. */
  const [formKey, setFormKey] = useState(0);

  const acrescentarDitado = useCallback((falado: string): void => {
    setTexto((atual) => (atual.trim() ? `${atual.trimEnd()} ${falado}` : falado));
  }, []);

  const avisarDitado = useCallback(
    (mensagem: string): void => toast.mostrar(mensagem, { tipo: 'erro' }),
    [toast],
  );

  const ditado = useDitado(acrescentarDitado, avisarDitado);

  const rascunhos = useMemo(
    () => new Map(notas.map((nota) => [nota.id, interpretarNota(nota.texto, catalogo)])),
    [notas, catalogo],
  );

  const limparEditor = (): void => {
    setTexto('');
    setEditandoId(null);
  };

  const salvarNota = async (): Promise<void> => {
    if (salvando) {
      return;
    }

    if (ditado.ouvindo) {
      ditado.parar();
    }

    try {
      setSalvando(true);
      await salvar(texto, editandoId);
      toast.mostrar(editandoId ? 'Nota atualizada' : 'Nota guardada para lançar depois');
      limparEditor();
    } catch (error: unknown) {
      if (error instanceof ValidacaoNotaError) {
        vibrarAviso();
        toast.mostrar(error.message, { tipo: 'erro' });
        return;
      }

      console.error('Erro ao salvar a nota', error);
      Alert.alert('Erro', 'Não foi possível salvar a nota.');
    } finally {
      setSalvando(false);
    }
  };

  const editarNota = (nota: NotaLancamento): void => {
    setEditandoId(nota.id);
    setTexto(nota.texto);
  };

  const excluirNota = (nota: NotaLancamento): void => {
    if (editandoId === nota.id) {
      limparEditor();
    }

    excluir(nota).catch((error: unknown) => {
      console.error('Erro ao excluir a nota', error);
      Alert.alert('Erro', 'Não foi possível excluir a nota.');
    });
  };

  const abrirLancamento = (nota: NotaLancamento): void => {
    setNotaLancando(nota);
    setRascunho(rascunhos.get(nota.id) ?? interpretarNota(nota.texto, catalogo));
    setFormKey((atual) => atual + 1);
    setFormAberto(true);
  };

  const editor = (
    <View style={[sharedStyles.card, styles.editor]}>
      <Text style={sharedStyles.label}>{editandoId ? 'Editar nota' : 'Nova nota'}</Text>
      <View style={styles.campoLinha}>
        <TextInput
          style={[sharedStyles.input, sharedStyles.inputMultiline, styles.campo]}
          value={texto}
          onChangeText={setTexto}
          placeholder="Ex.: almoço 35 ontem no cartão"
          placeholderTextColor={colors.textSubtle}
          multiline
          editable={!salvando}
        />
        {ditado.disponivel ? (
          <PressableScale
            style={[styles.microfone, ditado.ouvindo && styles.microfoneAtivo]}
            onPress={ditado.ouvindo ? ditado.parar : ditado.iniciar}
            escala={0.9}
            vibrar
            accessibilityRole="button"
            accessibilityLabel={ditado.ouvindo ? 'Parar de ouvir' : 'Ditar a nota'}
          >
            <Ionicons
              name={ditado.ouvindo ? 'stop' : 'mic'}
              size={iconSize.md}
              color={ditado.ouvindo ? colors.onHero : colors.primary}
            />
          </PressableScale>
        ) : null}
      </View>

      {ditado.ouvindo ? (
        <Text style={styles.ouvindo}>
          {ditado.parcial ? `Ouvindo: ${ditado.parcial}` : 'Ouvindo... fale a nota.'}
        </Text>
      ) : null}

      {!ditado.disponivel ? (
        <Text style={sharedStyles.sectionHint}>
          O ditado aparece depois de gerar o app de novo (expo run:android).
        </Text>
      ) : null}

      <View style={sharedStyles.actionsRow}>
        {editandoId || texto.length > 0 ? (
          <Button
            label="Cancelar"
            variant="secondary"
            flex
            onPress={limparEditor}
            disabled={salvando}
          />
        ) : null}
        <Button
          label={editandoId ? 'Salvar edição' : 'Guardar nota'}
          icon="checkmark"
          flex
          loading={salvando}
          disabled={texto.trim().length === 0}
          onPress={(): void => {
            void salvarNota();
          }}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Notas para lançar"
        subtitle="Anote agora, lance quando tiver tempo"
        onBack={(): void => navigation.goBack()}
      />

      <KeyboardAvoidingScreen>
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={styles.conteudo}
          keyboardShouldPersistTaps="handled"
        >
          {editor}

          {loading ? (
            <LoadingState message="Carregando as notas..." />
          ) : notas.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              message="Nenhuma nota pendente"
              hint="Escreva ou dite o gasto com valor, dia e conta. Ex.: uber 23,90 hoje no pix."
            />
          ) : (
            <>
              <Text style={sharedStyles.sectionHint}>
                Toque em Lançar para conferir e gravar. Arraste para o lado: editar ou excluir.
              </Text>
              {notas.map((nota) => (
                <NotaCard
                  key={nota.id}
                  nota={nota}
                  rascunho={rascunhos.get(nota.id) ?? { tipo: 'saida' }}
                  catalogo={catalogo}
                  editando={editandoId === nota.id}
                  onLancar={(): void => abrirLancamento(nota)}
                  onEditar={(): void => editarNota(nota)}
                  onExcluir={(): void => excluirNota(nota)}
                />
              ))}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingScreen>

      <NovoLancamentoForm
        key={`nota-${formKey}`}
        visivel={formAberto}
        rascunho={rascunho}
        onFechar={(): void => setFormAberto(false)}
        onAddLancamento={async (lancamento): Promise<void> => {
          if (notaLancando) {
            await lancar(notaLancando, lancamento);
          }
        }}
        mensagemSucesso="Lançamento registrado; a nota saiu da lista"
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  conteudo: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  editor: {
    gap: spacing.sm,
  },
  campoLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  campo: {
    flex: 1,
  },
  microfone: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  microfoneAtivo: {
    backgroundColor: colors.danger,
  },
  ouvindo: {
    fontSize: fontSize.small,
    fontStyle: 'italic',
    color: colors.primary,
  },
}));
