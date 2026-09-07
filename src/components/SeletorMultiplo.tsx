import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

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
      <Text style={styles.label}>{label}</Text>

      {selecionados.length > 0 && (
        <View style={styles.chipRow}>
          {selecionados.map((id) => {
            const nome = opcoes.find((opcao) => opcao.id === id)?.nome ?? '';
            return (
              <Pressable key={id} style={styles.chip} onPress={(): void => onToggle(id)}>
                <Text style={styles.chipText}>{nome}</Text>
                <Ionicons name="close" size={14} color="#0f7a5b" />
              </Pressable>
            );
          })}
        </View>
      )}

      <Pressable style={styles.comboTrigger} onPress={(): void => setAberto((atual) => !atual)}>
        <Text style={styles.comboTriggerText}>{textoTrigger}</Text>
        <Ionicons name={aberto ? 'chevron-up' : 'chevron-down'} size={18} color="#0b3d2e" />
      </Pressable>

      {aberto && (
        <View style={styles.comboDropdown}>
          <TextInput
            style={styles.comboBuscaInput}
            placeholder={placeholderBusca}
            value={busca}
            onChangeText={setBusca}
            placeholderTextColor="#8ba29a"
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
              <Text style={styles.emptyText}>{textoNenhumEncontrado}</Text>
            )}
            {add && (
              <Pressable
                style={styles.comboItemAdicionar}
                onPress={(): void => setMostrarFormAdicionar(true)}
              >
                <Ionicons name="add-circle-outline" size={16} color="#0f7a5b" />
                <Text style={styles.comboItemAdicionarText}>{textoAdicionar}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      )}

      {opcoes.length === 0 && <Text style={styles.emptyText}>{textoVazio}</Text>}

      {add && mostrarFormAdicionar && (
        <View style={styles.formFlutuanteOverlay}>
          <View style={styles.formFlutuante}>
            <View style={styles.formFlutuanteHeader}>
              <Text style={styles.formFlutuanteTitulo}>{textoAdicionar}</Text>
              <Pressable onPress={fecharFormAdicionar}>
                <Ionicons name="close" size={22} color="#0b3d2e" />
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
    marginBottom: 24,
    position: 'relative',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0b3d2e',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e6f4ed',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#0f7a5b',
    fontWeight: '600',
  },
  comboTrigger: {
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f9fdfb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comboTriggerText: {
    fontSize: 14,
    color: '#0b3d2e',
  },
  comboDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  comboBuscaInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#deebe4',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0b3d2e',
  },
  comboLista: {
    maxHeight: 170,
  },
  comboItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  comboItemText: {
    fontSize: 14,
    color: '#0b3d2e',
  },
  comboItemTextAtivo: {
    color: '#0f7a5b',
    fontWeight: '700',
  },
  comboItemAdicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#deebe4',
  },
  comboItemAdicionarText: {
    fontSize: 14,
    color: '#0f7a5b',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 13,
    color: '#8ba29a',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#deebe4',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  formFlutuanteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  formFlutuanteTitulo: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0b3d2e',
  },
});
