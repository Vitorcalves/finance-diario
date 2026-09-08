import {StyleSheet} from 'react-native';
import {colors} from './colors';
import {radius, spacing} from './spacing';
import {shadows} from './shadows';
import {fontSize, fontWeight, typography} from './typography';

/**
 * Estilos compartilhados por todas as telas.
 *
 * Padrao de uma tela:
 *   <SafeAreaView style={sharedStyles.screen}>
 *     <ScreenHeader ... />
 *     <ScrollView contentContainerStyle={sharedStyles.scrollContent}> ... </ScrollView>
 *   </SafeAreaView>
 *
 * Estilos especificos de uma tela continuam no proprio arquivo, mas sempre
 * usando os tokens (`colors`, `spacing`, `radius`, `typography`).
 */
export const sharedStyles = StyleSheet.create({
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
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    padding: spacing.xs,
  },

  // Cartoes
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardHighlight: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.success,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
    borderColor: colors.borderStrong,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.input,
    color: colors.textBody,
    backgroundColor: colors.surface,
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
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
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
  buttonBase: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  buttonDanger: {
    backgroundColor: colors.dangerSurface,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  buttonFlex: {
    flex: 1,
  },
  buttonTextPrimary: {
    color: colors.textInverse,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  buttonTextSecondary: {
    color: colors.textBody,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  buttonTextDanger: {
    color: colors.danger,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },

  // Botoes de icone das listas
  iconButton: {
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  iconButtonPrimary: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
  },
  iconButtonInfo: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.infoBorder,
  },
  iconButtonDanger: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.dangerBorder,
  },
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xxl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
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
    color: colors.text,
  },
  chipTextActive: {
    color: colors.textInverse,
    fontWeight: fontWeight.bold,
  },

  // Selos
  badge: {
    borderRadius: radius.lg,
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
    color: colors.textInverse,
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
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: fontSize.small,
    color: colors.textSubtle,
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
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primaryDeep,
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
