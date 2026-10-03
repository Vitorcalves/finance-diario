import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import CategoriaIcone from '../../../components/CategoriaIcone';
import {
  BottomSheet,
  Button,
  PressableScale,
  SegmentedControl,
  Text,
  TextInput,
} from '../../../components/ui';
import type {
  CategoriaLancamento,
  TipoCategoriaLancamento,
} from '../../../models/categoriasLancamento';
import { CORES_CATEGORIA, iconSize, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { vibrarSelecao } from '../../../utils/haptics';
import type { DadosCategoriaLancamento } from '../useCategoriasLancamento';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Icones oferecidos ao criar uma categoria. */
const ICONES: IconName[] = [
  'cart-outline',
  'restaurant-outline',
  'fast-food-outline',
  'cafe-outline',
  'car-outline',
  'bus-outline',
  'bicycle-outline',
  'airplane-outline',
  'home-outline',
  'flash-outline',
  'water-outline',
  'wifi-outline',
  'phone-portrait-outline',
  'medkit-outline',
  'fitness-outline',
  'paw-outline',
  'school-outline',
  'book-outline',
  'game-controller-outline',
  'film-outline',
  'gift-outline',
  'shirt-outline',
  'bag-handle-outline',
  'construct-outline',
  'heart-outline',
  'repeat-outline',
  'cash-outline',
  'trending-up-outline',
  'briefcase-outline',
  'ellipsis-horizontal-circle-outline',
];

type CategoriaLancamentoFormProps = {
  visivel: boolean;
  /** Categoria em edicao; `null` cria uma nova. */
  categoria: CategoriaLancamento | null;
  onFechar: () => void;
  onSalvar: (
    dados: DadosCategoriaLancamento,
    editando: CategoriaLancamento | null,
  ) => Promise<boolean>;
};

/** Painel de cadastro: nome, tipo, cor e icone, com a previa da categoria no topo. */
export default function CategoriaLancamentoForm({
  visivel,
  categoria,
  onFechar,
  onSalvar,
}: CategoriaLancamentoFormProps): React.ReactNode {
  const { colors, sharedStyles, corCategoria } = useTheme();
  const styles = useStyles();
  const [nome, setNome] = useState(categoria?.nome ?? '');
  const [tipo, setTipo] = useState<TipoCategoriaLancamento>(categoria?.tipo ?? 'saida');
  const [cor, setCor] = useState(categoria?.cor ?? 'azul');
  const [icone, setIcone] = useState(categoria?.icone ?? 'pricetag-outline');
  const [salvando, setSalvando] = useState(false);

  const salvar = (): void => {
    void (async (): Promise<void> => {
      setSalvando(true);
      const salvou = await onSalvar({ nome, tipo, cor, icone }, categoria);
      setSalvando(false);

      if (salvou) {
        onFechar();
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo={categoria ? 'Editar categoria' : 'Nova categoria'}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button label="Salvar" icon="checkmark" loading={salvando} flex onPress={salvar} />
        </View>
      }
    >
      <View style={styles.previa}>
        <CategoriaIcone icone={icone} cor={cor} tamanho={56} />
        <Text style={sharedStyles.sectionTitle} numberOfLines={1}>
          {nome.trim() || 'Nova categoria'}
        </Text>
      </View>

      <Text style={sharedStyles.label}>Nome *</Text>
      <TextInput
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
        placeholder="Ex.: Pet"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={sharedStyles.label}>Tipo</Text>
      <View style={styles.bloco}>
        <SegmentedControl
          opcoes={[
            { valor: 'saida', rotulo: 'Saída', cor: colors.danger },
            { valor: 'entrada', rotulo: 'Entrada', cor: colors.success },
          ]}
          valor={tipo}
          onChange={setTipo}
        />
      </View>

      <Text style={sharedStyles.label}>Cor</Text>
      <View style={[styles.grade, styles.bloco]}>
        {CORES_CATEGORIA.map((chave) => {
          const ativa = chave === cor;

          return (
            <PressableScale
              key={chave}
              escala={0.88}
              accessibilityRole="button"
              accessibilityLabel={`Cor ${chave}`}
              accessibilityState={{ selected: ativa }}
              style={[
                styles.cor,
                { backgroundColor: corCategoria(chave) },
                ativa && styles.corAtiva,
              ]}
              onPress={(): void => {
                vibrarSelecao();
                setCor(chave);
              }}
            >
              {ativa && <Ionicons name="checkmark" size={iconSize.sm} color={colors.onHero} />}
            </PressableScale>
          );
        })}
      </View>

      <Text style={sharedStyles.label}>Ícone</Text>
      <View style={[styles.grade, styles.bloco]}>
        {ICONES.map((nomeIcone) => {
          const ativo = nomeIcone === icone;

          return (
            <PressableScale
              key={nomeIcone}
              escala={0.88}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              style={[styles.icone, ativo && { borderColor: corCategoria(cor) }]}
              onPress={(): void => {
                vibrarSelecao();
                setIcone(nomeIcone);
              }}
            >
              <Ionicons
                name={nomeIcone}
                size={iconSize.md}
                color={ativo ? corCategoria(cor) : colors.textMuted}
              />
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  previa: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  bloco: {
    marginBottom: spacing.lg,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cor: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  corAtiva: {
    borderWidth: 3,
    borderColor: colors.surface,
    // Anel externo para a cor escolhida se destacar das outras.
    outlineWidth: 2,
    outlineColor: colors.textStrong,
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
