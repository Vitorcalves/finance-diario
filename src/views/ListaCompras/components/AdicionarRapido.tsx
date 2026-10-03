import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { PressableScale, Text, TextInput } from '../../../components/ui';
import type { Produto } from '../../../models/produtos';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { correspondeBusca, normalizarTexto } from '../../../utils/busca';

/** Quantos produtos aparecem enquanto se digita. */
const MAXIMO_SUGERIDOS = 6;

type AdicionarRapidoProps = {
  produtos: Produto[];
  /** Ids ja na lista: aparecem marcados e nao sao adicionados de novo. */
  naLista: Set<string>;
  onAdicionar: (texto: string, produtoId?: string) => void;
  /** Abre a camera para por no carrinho pelo codigo de barras. */
  onLerCodigo: () => void;
};

/**
 * Campo para montar a lista no ritmo de quem dita: digita, escolhe o produto
 * que aparece embaixo (ou confirma no teclado para um item livre) e ja pode
 * digitar o proximo.
 */
export default function AdicionarRapido({
  produtos,
  naLista,
  onAdicionar,
  onLerCodigo,
}: AdicionarRapidoProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const [texto, setTexto] = useState('');

  const encontrados = useMemo(() => {
    const termo = normalizarTexto(texto);

    if (termo.length < 2) {
      return [];
    }

    // Quem comeca com o que foi digitado aparece antes de quem so contem o trecho.
    const comeca: Produto[] = [];
    const contem: Produto[] = [];

    for (const produto of produtos) {
      if (!correspondeBusca(produto.nome, termo)) {
        continue;
      }

      if (normalizarTexto(produto.nome).startsWith(termo)) {
        comeca.push(produto);
      } else {
        contem.push(produto);
      }
    }

    return [...comeca, ...contem].slice(0, MAXIMO_SUGERIDOS);
  }, [texto, produtos]);

  const adicionar = (produto?: Produto): void => {
    if (!produto && !texto.trim()) {
      return;
    }

    onAdicionar(produto?.nome ?? texto, produto?.id);
    setTexto('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.campo}>
        <Ionicons name="add-circle-outline" size={iconSize.md} color={colors.primary} />
        <TextInput
          style={styles.input}
          placeholder="Adicionar item (ex.: arroz, papel toalha)"
          value={texto}
          onChangeText={setTexto}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={(): void => adicionar(encontrados[0])}
          autoCorrect={false}
        />
        {texto.length > 0 ? (
          <Pressable
            onPress={(): void => setTexto('')}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Limpar"
          >
            <Ionicons name="close-circle" size={iconSize.sm} color={colors.textSubtle} />
          </Pressable>
        ) : (
          <Pressable
            onPress={onLerCodigo}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Ler código de barras"
          >
            <Ionicons name="barcode-outline" size={iconSize.md} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {texto.trim().length > 0 && (
        <View style={styles.resultados}>
          {encontrados.map((produto) => {
            const jaNaLista = naLista.has(produto.id);

            return (
              <PressableScale
                key={produto.id}
                escala={0.98}
                style={styles.resultado}
                onPress={(): void => adicionar(produto)}
                accessibilityRole="button"
                accessibilityLabel={`Adicionar ${produto.nome}`}
              >
                <Ionicons
                  name={jaNaLista ? 'checkmark-circle' : 'cube-outline'}
                  size={iconSize.sm}
                  color={jaNaLista ? colors.success : colors.textMuted}
                />
                <Text style={styles.resultadoTexto} numberOfLines={1}>
                  {produto.nome}
                </Text>
                {jaNaLista && <Text style={styles.resultadoDica}>na lista</Text>}
              </PressableScale>
            );
          })}

          <PressableScale
            escala={0.98}
            style={styles.resultado}
            onPress={(): void => adicionar()}
            accessibilityRole="button"
          >
            <Ionicons name="create-outline" size={iconSize.sm} color={colors.textMuted} />
            <Text style={styles.resultadoTexto} numberOfLines={1}>
              {`Adicionar "${texto.trim()}" como item avulso`}
            </Text>
          </PressableScale>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    gap: spacing.xs,
  },
  campo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.input,
  },
  resultados: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  resultadoTexto: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  resultadoDica: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
}));
