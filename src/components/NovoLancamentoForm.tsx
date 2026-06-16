import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View, ScrollView } from 'react-native';
import dayjs from 'dayjs';
import BrazilianDateInput from './BrazilianDateInput';
import { type Empresa, listEmpresas } from '../models/empresas';
import { type Produto, listProdutos } from '../models/produtos';
import { type Transacoes } from '../models/transacoesModel';
import Ionicons from '@expo/vector-icons/Ionicons';

const todayIso = (): string => dayjs().format('YYYY-MM-DD');

const parseMoney = (raw: string): number => {
  const normalized = raw.replace(',', '.').replace(/[^\d.-]/g, '');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
};

interface NovoLancamentoFormProps {
  onAddTransacao: (transacao: Transacoes) => Promise<void>;
}

export default function NovoLancamentoForm({
  onAddTransacao,
}: NovoLancamentoFormProps): React.ReactNode {
  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dateInput, setDateInput] = useState(todayIso());
  const [dateInputKey, setDateInputKey] = useState(0);
  const [empresaSelected, setEmpresaSelected] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [comboEmpresaAberto, setComboEmpresaAberto] = useState(false);
  const [empresaBusca, setEmpresaBusca] = useState('');
  const [produtoSelected, setProdutoSelected] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [comboProdutoAberto, setComboProdutoAberto] = useState(false);
  const [produtoBusca, setProdutoBusca] = useState('');

  const [tipoTransacao, setTipoTransacao] = useState<'saida' | 'entrada'>('saida');

  const closeModal = (): void => {
    setModalVisible(false);
  };

  const empresaSelecionadaNome =
    empresas.find((empresa) => empresa.id === empresaSelected)?.nome ?? '';

  const empresasFiltradas = empresas.filter((empresa) =>
    empresa.nome.toLowerCase().includes(empresaBusca.trim().toLowerCase()),
  );

  const produtoSelecionadoNome =
    produtos.find((produto) => produto.id === produtoSelected)?.nome ?? '';

  const produtosFiltrados = produtos.filter((produto) =>
    produto.nome.toLowerCase().includes(produtoBusca.trim().toLowerCase()),
  );

  const addTrasacao = async (): Promise<void> => {
    const amount = parseMoney(amountInput);
    const trimmedDescription = description.trim();
    const trimmedDate = dateInput.trim();

    if (!trimmedDescription || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
      return;
    }

    const valorFinal = tipoTransacao === 'saida' ? -amount : amount;
    try {
      const newTransacao: Transacoes = {
        id: '',
        descricao: trimmedDescription,
        valor: valorFinal,
        data: trimmedDate,
        empresa_id: empresaSelected,
        created_at: new Date().toISOString(),
      };
      await onAddTransacao(newTransacao);

      // Limpar form apos adicao
      setDescription('');
      setAmountInput('');
      setDateInput(todayIso());
      setDateInputKey((prev) => prev + 1);
      closeModal();
    } catch (error) {
      console.error('Erro ao adicionar transacao', error);
    }
  };

  const carregarEmpresas = async (): Promise<void> => {
    console.log('Carregando empresas...');
    try {
      const empresasData = await listEmpresas();
      console.log('Empresas carregadas:', empresasData);
      setEmpresas(empresasData);
    } catch (error) {
      console.error('Erro ao carregar empresas', error);
    }
  };

  const carregarProdutos = async (): Promise<void> => {
    try {
      const produtosData = await listProdutos();
      setProdutos(produtosData);
    } catch (error) {
      console.error('Erro ao carregar produtos', error);
    }
  };

  useEffect((): (() => void) => {
    let active = true;

    void (async (): Promise<void> => {
      if (!active) {
        return;
      }
      await Promise.all([carregarEmpresas(), carregarProdutos()]);
    })();

    return (): void => {
      active = false;
    };
  }, []);

  return (
    <>
      <Pressable style={styles.openButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.openButtonText}>Novo lancamento</Text>
      </Pressable>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={closeModal} />

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Novo lancamento</Text>

            <View style={styles.tipoRow}>
              <Pressable
                style={[
                  styles.tipoButton,
                  tipoTransacao === 'saida' && styles.tipoButtonActiveSaida,
                ]}
                onPress={() => setTipoTransacao('saida')}
              >
                <Text
                  style={[
                    styles.tipoButtonText,
                    tipoTransacao === 'saida' && styles.tipoButtonTextActive,
                  ]}
                >
                  Saida
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.tipoButton,
                  tipoTransacao === 'entrada' && styles.tipoButtonActiveEntrada,
                ]}
                onPress={() => setTipoTransacao('entrada')}
              >
                <Text
                  style={[
                    styles.tipoButtonText,
                    tipoTransacao === 'entrada' && styles.tipoButtonTextActive,
                  ]}
                >
                  Entrada
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Empresa</Text>
            <View style={styles.comboTrigger}>
              <TextInput
                style={styles.comboTriggerInput}
                placeholder={empresaSelecionadaNome || 'Buscar empresa'}
                value={empresaBusca}
                onFocus={(): void => setComboEmpresaAberto(true)}
                onChangeText={(value): void => {
                  setEmpresaBusca(value);
                  if (!comboEmpresaAberto) {
                    setComboEmpresaAberto(true);
                  }
                }}
                placeholderTextColor="#8ba29a"
              />
              <Ionicons
                name={comboEmpresaAberto ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#0b3d2e"
                onPress={(): void => setComboEmpresaAberto((aberto) => !aberto)}
              />
            </View>

            {comboEmpresaAberto && (
              <View style={styles.comboDropdown}>
                <ScrollView style={styles.comboLista} nestedScrollEnabled>
                  {empresasFiltradas.map((empresa) => (
                    <Pressable
                      key={empresa.id}
                      style={styles.comboItem}
                      onPress={(): void => {
                        setEmpresaSelected(empresa.id);
                        setEmpresaBusca(empresa.nome);
                        setComboEmpresaAberto(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.comboItemText,
                          empresaSelected === empresa.id && styles.comboItemTextAtivo,
                        ]}
                      >
                        {empresa.nome}
                      </Text>
                    </Pressable>
                  ))}
                  {empresasFiltradas.length === 0 && (
                    <Text style={styles.emptyCategoriasText}>Nenhuma empresa encontrada</Text>
                  )}
                </ScrollView>
              </View>
            )}

            {empresas.length === 0 && (
              <Text style={styles.emptyCategoriasText}>Nenhuma empresa cadastrada</Text>
            )}

            <Text style={styles.label}>Descricao</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex.: Mercado"
              placeholderTextColor="#7b8a8e"
              style={styles.input}
            />

            <Text style={styles.label}>Valor (R$)</Text>
            <TextInput
              value={amountInput}
              onChangeText={setAmountInput}
              keyboardType="decimal-pad"
              placeholder="Ex.: 43,90"
              placeholderTextColor="#7b8a8e"
              style={styles.input}
            />

            <Text style={styles.label}>Data (DD/MM/AAAA)</Text>
            <BrazilianDateInput
              key={dateInputKey}
              defaultValue={dateInput}
              onChangeValue={setDateInput}
              placeholder={dayjs().format('DD/MM/YYYY')}
              placeholderTextColor="#7b8a8e"
              style={styles.input}
            />

            <Text style={styles.label}>Produto</Text>
            <View style={styles.comboTrigger}>
              <TextInput
                style={styles.comboTriggerInput}
                placeholder={produtoSelecionadoNome || 'Buscar produto'}
                value={produtoBusca}
                onFocus={(): void => setComboProdutoAberto(true)}
                onChangeText={(value): void => {
                  setProdutoBusca(value);
                  if (!comboProdutoAberto) {
                    setComboProdutoAberto(true);
                  }
                }}
                placeholderTextColor="#8ba29a"
              />
              <Ionicons
                name={comboProdutoAberto ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#0b3d2e"
                onPress={(): void => setComboProdutoAberto((aberto) => !aberto)}
              />
            </View>

            {comboProdutoAberto && (
              <View style={styles.comboDropdown}>
                <ScrollView style={styles.comboLista} nestedScrollEnabled>
                  {produtosFiltrados.map((produto) => (
                    <Pressable
                      key={produto.id}
                      style={styles.comboItem}
                      onPress={(): void => {
                        setProdutoSelected(produto.id);
                        setProdutoBusca(produto.nome);
                        setComboProdutoAberto(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.comboItemText,
                          produtoSelected === produto.id && styles.comboItemTextAtivo,
                        ]}
                      >
                        {produto.nome}
                      </Text>
                    </Pressable>
                  ))}
                  {produtosFiltrados.length === 0 && (
                    <Text style={styles.emptyCategoriasText}>Nenhum produto encontrado</Text>
                  )}
                </ScrollView>
              </View>
            )}

            {produtos.length === 0 && (
              <Text style={styles.emptyCategoriasText}>Nenhum produto cadastrado</Text>
            )}

            <View style={styles.actionsRow}>
              <Pressable style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.button, tipoTransacao === 'entrada' && styles.buttonEntrada]}
                onPress={() => {
                  addTrasacao().catch((error) =>
                    console.error('Erro ao executar cadastro da transacao', error),
                  );
                }}
              >
                <Text style={styles.buttonText}>
                  {tipoTransacao === 'saida' ? 'Adicionar saida' : 'Adicionar entrada'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    borderRadius: 12,
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  openButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  label: {
    fontSize: 13,
    color: '#2d3e38',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6dfdb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#17211d',
    backgroundColor: '#f8fbfa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#123a2d',
  },
  tipoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipoButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d6dfdb',
    alignItems: 'center',
    backgroundColor: '#f8fbfa',
  },
  tipoButtonActiveSaida: {
    backgroundColor: '#c0352b',
    borderColor: '#c0352b',
  },
  tipoButtonActiveEntrada: {
    backgroundColor: '#0d8f50',
    borderColor: '#0d8f50',
  },
  tipoButtonText: {
    fontWeight: '700',
    fontSize: 14,
    color: '#334640',
  },
  tipoButtonTextActive: {
    color: '#ffffff',
  },
  button: {
    marginTop: 6,
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#0f7a5b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonEntrada: {
    backgroundColor: '#0d8f50',
    flex: 1,
    marginTop: 6,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d6dfdb',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f8fbfa',
  },
  actionsRow: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButtonText: {
    color: '#334640',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
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
  comboTriggerInput: {
    flex: 1,
    fontSize: 14,
    color: '#0b3d2e',
    padding: 0,
    margin: 0,
  },
  comboDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#deebe4',
    borderRadius: 8,
    backgroundColor: '#ffffff',
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
  emptyCategoriasText: {
    fontSize: 13,
    color: '#8ba29a',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
