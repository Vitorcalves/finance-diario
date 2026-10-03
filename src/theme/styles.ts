import { StyleSheet } from 'react-native';
import type { Paleta } from './colors';
import { radius, spacing } from './spacing';
import { shadows } from './shadows';
import { fontSize, fontWeight, type Tipografia } from './typography';

/**
 * Estilos compartilhados por todas as telas, gerados para cada paleta.
 *
 * Padrao de uma tela:
 *   const { sharedStyles } = useTheme();
 *   <SafeAreaView style={sharedStyles.screen}>
 *     <ScreenHeader ... />
 *     <ScrollView contentContainerStyle={sharedStyles.scrollContent}> ... </ScrollView>
 *   </SafeAreaView>
 *
 * Estilos especificos de uma tela continuam no proprio arquivo, via
 * `makeStyles`, sempre usando os tokens (`colors`, `spacing`, `radius`...).
 */
// O tipo de retorno e o proprio StyleSheet: declara-lo a mao duplicaria cada chave.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const criarSharedStyles = (colors: Paleta, typography: Tipografia) =>
  StyleSheet.create({
    // Layout de tela
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollArea: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
      gap: spacing.md,
    },
    /** Listas: os cartoes ja possuem espacamento proprio, por isso sem `gap`. */
    listContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    /** Formularios: os grupos de campo ja possuem espacamento proprio. */
    formContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
    },

    // Cabecalho
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
    },
    headerContent: {
      flex: 1,
      gap: 2,
    },
    headerTitle: typography.title,
    headerSubtitle: {
      ...typography.small,
      color: colors.textMuted,
    },
    headerSlot: {
      minWidth: 32,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    headerAction: {
      width: 40,
      height: 40,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      ...shadows.card,
    },

    // Cartoes
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      gap: spacing.sm,
      ...shadows.card,
    },
    cardHighlight: {
      backgroundColor: colors.primarySoft,
      borderWidth: 1,
      borderColor: colors.success,
    },
    listCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    listCardInfo: {
      flex: 1,
      gap: 2,
    },
    listCardTitle: typography.cardTitle,
    listCardDetail: typography.caption,

    // Secoes
    sectionTitle: {
      ...typography.section,
      fontSize: fontSize.subtitle,
    },
    sectionHint: {
      ...typography.caption,
      color: colors.textSubtle,
    },

    // Formularios
    formGroup: {
      marginBottom: spacing.lg,
    },
    label: {
      ...typography.label,
      marginBottom: spacing.sm,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.input,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
    },
    inputSpaced: {
      marginBottom: spacing.md,
    },
    inputMultiline: {
      minHeight: 100,
      textAlignVertical: 'top',
    },

    // Bloco de formulario embutido (mini formularios de item/variante)
    subForm: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.xl,
      padding: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    subFormTitle: {
      ...typography.label,
      fontWeight: fontWeight.bold,
      marginBottom: spacing.md,
    },

    // Botoes
    actionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },

    // Botoes de icone das listas
    iconButtonRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },

    // Chips
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    chipScrollRow: {
      flexDirection: 'row',
      marginBottom: spacing.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surfaceMuted,
      // Borda leve: dentro de blocos com o mesmo fundo o chip nao sumir.
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipSpaced: {
      marginRight: spacing.sm,
    },
    chipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    chipText: {
      fontSize: fontSize.small,
      fontWeight: fontWeight.medium,
      color: colors.text,
    },
    chipTextActive: {
      color: colors.onPrimary,
      fontWeight: fontWeight.bold,
    },

    // Selos
    badge: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      backgroundColor: colors.primary,
    },
    badgeSuccess: {
      backgroundColor: colors.success,
    },
    badgeText: {
      fontSize: fontSize.micro,
      fontWeight: fontWeight.bold,
      color: colors.onPrimary,
    },

    // Estados
    /**
     * `flexGrow` (e nao `flex`) para funcionar tanto como filho direto da tela
     * quanto dentro do conteudo de um ScrollView, onde `flex: 1` colapsaria.
     */
    centerContent: {
      flexGrow: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xxxl,
      gap: spacing.md,
    },
    emptyText: {
      fontSize: fontSize.subtitle,
      fontWeight: fontWeight.medium,
      color: colors.textStrong,
      textAlign: 'center',
    },
    emptyHint: {
      fontSize: fontSize.small,
      color: colors.textMuted,
      textAlign: 'center',
    },
    inlineEmptyText: {
      fontSize: fontSize.small,
      color: colors.textSubtle,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },

    // Rodape fixo
    footer: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      gap: spacing.md,
      ...shadows.floating,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    totalLabel: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
      color: colors.textStrong,
    },
    totalValue: {
      fontSize: fontSize.section,
      fontWeight: fontWeight.heavy,
      color: colors.primary,
    },

    // Valores monetarios
    positive: {
      color: colors.success,
    },
    negative: {
      color: colors.danger,
    },
  });

export type SharedStyles = ReturnType<typeof criarSharedStyles>;
