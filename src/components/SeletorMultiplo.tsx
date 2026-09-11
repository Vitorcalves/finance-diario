import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, radius, shadows, sharedStyles, spacing } from '../theme';

export type OpcaoSeletorMultiplo = {
  id: string;
  nome: string;
};

type SeletorMultiploProps = {
  label: string;
  opcoes: OpcaoSeletorMultiplo[];
  selecionados: string[];
  onToggle: (id: string) => void;
  placeholderBusca?: string;
  textoTrigger?: string;
  textoVazio?: string;
  textoNenhumEncontrado?: string;
  add?: boolean;
  textoAdicionar?: string;
  formAdicionar?: (fechar: () => void) => React.ReactNode;
  /** Elemento ao lado do botao de abrir a lista (ex.: atalho de leitura por codigo de barras). */
  extra?: React.ReactNode;
};

export default function SeletorMultiplo({
  label,
  opcoes,
  selecionados,
  onToggle,
  placeholderBusca = 'Buscar',
  textoTrigger = 'Adicionar item',
  textoVazio = 'Nenhum item cadastrado',
  textoNenhumEncontrado = 'Nenhum item encontrado',
  add = false,
  textoAdicionar = 'Adicionar novo',
  formAdicionar,
  extra,
}: SeletorMultiploProps): React.ReactNode {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [mostrarFormAdicionar, setMostrarFormAdicionar] = useState(false);

  const opcoesFiltradas = opcoes.filter((opcao) =>
    opcao.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  const fecharFormAdicionar = (): void => setMostrarFormAdicionar(false);

  return (
    <View style={styles.container}>
      <Text style={sharedStyles.label}>{label}</Text>

      {selecionados.length > 0 && (
        <View style={sharedStyles.chipRow}>
          {selecionados.map((id) => {
            const nome = opcoes.find((opcao) => opcao.id === id)?.nome ?? '';
            return (
              <Pressable
                key={id}
                style={[sharedStyles.chip, styles.chipSelecionado]}
                onPress={(): void => onToggle(id)}
              >
                <Text style={styles.chipSelecionadoText}>{nome}</Text>
                <Ionicons name="close" size={14} color={colors.primary} />
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={styles.triggerRow}>
        <Pressable
          style={[styles.comboTrigger, styles.comboTriggerFlex]}
          onPress={(): void => setAberto((atual) => !atual)}
        >
          <Text style={styles.comboTriggerText}>{textoTrigger}</Text>
          <Ionicons
            name={aberto ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.primaryDark}
          />
        </Pressable>

        {extra}
      </View>

      {aberto && (
        <View style={styles.comboDropdown}>
          <TextInput
            style={styles.comboBuscaInput}
            placeholder={placeholderBusca}
            value={busca}
            onChangeText={setBusca}
            placeholderTextColor={colors.placeholder}
          />
          <ScrollView style={styles.comboLista} nestedScrollEnabled>
            {opcoesFiltradas.map((opcao) => {
              const selecionada = selecionados.includes(opcao.id);
              return (
                <Pressable
                  key={opcao.id}
                  style={styles.comboItem}
                  onPress={(): void => onToggle(opcao.id)}
                >
                  <Text style={[styles.comboItemText, selecionada && styles.comboItemTextAtivo]}>
                    {selecionada ? '✓ ' : ''}
                    {opcao.nome}
                  </Text>
                </Pressable>
              );
            })}
            {opcoesFiltradas.length === 0 && (
              <Text style={sharedStyles.inlineEmptyText}>{textoNenhumEncontrado}</Text>
            )}
            {add && (
              <Pressable
                style={styles.comboItemAdicionar}
                onPress={(): void => setMostrarFormAdicionar(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.comboItemAdicionarText}>{textoAdicionar}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      {opcoes.length === 0 && <Text style={sharedStyles.inlineEmptyText}>{textoVazio}</Text>}

      {add && mostrarFormAdicionar && (
        <View style={styles.formFlutuanteOverlay}>
          <View style={styles.formFlutuante}>
            <View style={styles.formFlutuanteHeader}>
              <Text style={styles.formFlutuanteTitulo}>{textoAdicionar}</Text>
              <Pressable onPress={fecharFormAdicionar}>
                <Ionicons name="close" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>
            {formAdicionar?.(fecharFormAdicionar)}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
    position: 'relative',
  },
  chipSelecionado: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primarySoft,
    paddingVertical: spacing.xs + 2,
  },
  chipSelecionadoText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  comboTrigger: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceMuted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comboTriggerFlex: {
    flex: 1,
  },
  comboTriggerText: {
    fontSize: fontSize.body,
    color: colors.primaryDark,
  },
  comboDropdown: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  comboBuscaInput: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.small,
    color: colors.primaryDark,
  },
  comboLista: {
    maxHeight: 170,
  },
  comboItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  comboItemText: {
    fontSize: fontSize.body,
    color: colors.primaryDark,
  },
  comboItemTextAtivo: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  comboItemAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  comboItemAdicionarText: {
    fontSize: fontSize.body,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  formFlutuanteOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },
  formFlutuante: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.floating,
  },
  formFlutuanteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  formFlutuanteTitulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
});
