import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { Button } from '../../../components/ui';
import { colors, radius, shadows, sharedStyles, spacing } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import { useCatalogoLancamento } from '../useCatalogoLancamento';
import type { ItemLancamento, NovoLancamento, TipoLancamento } from '../types';
import LancamentoItemCard from './LancamentoItemCard';
import LancamentoItemForm, { type DadosItemLancamento } from './LancamentoItemForm';
import LancamentoTipoSelector from './LancamentoTipoSelector';
import ParcelamentoSelector from './ParcelamentoSelector';

const todayIso = (): string => dayjs().format('YYYY-MM-DD');

type NovoLancamentoFormProps = {
  onAddLancamento: (lancamento: NovoLancamento) => Promise<void>;
};

/**
 * Botao + modal de novo lancamento.
 *
 * Guarda apenas o cabecalho do lancamento e a lista de itens; a edicao de um
 * item fica em `LancamentoItemForm`.
 */
export default function NovoLancamentoForm({
  onAddLancamento,
}: NovoLancamentoFormProps): React.ReactNode {
  const catalogo = useCatalogoLancamento();

  const [modalVisible, setModalVisible] = useState(false);

  const [tipo, setTipo] = useState<TipoLancamento>('saida');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState(todayIso());
  const [dataInputKey, setDataInputKey] = useState(0);
  const [valorManual, setValorManual] = useState('');

  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState(2);
  const [primeiraParcela, setPrimeiraParcela] = useState(todayIso());
  const [parcelaDataKey, setParcelaDataKey] = useState(0);

  const [itens, setItens] = useState<ItemLancamento[]>([]);
  const [itemEditIndex, setItemEditIndex] = useState<number | null>(null);
  /** Trocada a cada edicao/salvamento para remontar o mini formulario limpo. */
  const [itemFormKey, setItemFormKey] = useState(0);

  const totalItens = useMemo(
    () => itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0),
    [itens],
  );

  const totalLancamento = itens.length > 0 ? totalItens : Number(valorManual) || 0;

  /** Entrada parcelada nao faz sentido aqui: o parcelamento e do que se compra. */
  const permiteParcelar = tipo === 'saida';

  const alternarParcelamento = (ativo: boolean): void => {
    setParcelado(ativo);

    if (ativo) {
      // Por padrao a 1a parcela vence no dia da compra; o usuario ajusta se quiser.
      setPrimeiraParcela(data);
      setParcelaDataKey((atual) => atual + 1);
    }
  };

  const abrirModal = (): void => {
    catalogo.carregar();
    setModalVisible(true);
  };

  const fecharModal = (): void => setModalVisible(false);

  const reiniciarItemForm = (index: number | null): void => {
    setItemEditIndex(index);
    setItemFormKey((atual) => atual + 1);
  };

  const limparFormulario = (): void => {
    setTipo('saida');
    setEmpresaId(null);
    setDescricao('');
    setData(todayIso());
    setDataInputKey((atual) => atual + 1);
    setValorManual('');
    setParcelado(false);
    setParcelas(2);
    setPrimeiraParcela(todayIso());
    setParcelaDataKey((atual) => atual + 1);
    setItens([]);
    reiniciarItemForm(null);
  };

  const salvarItem = (dados: DadosItemLancamento): void => {
    setItens((prev) => {
      if (itemEditIndex === null) {
        return [...prev, { ...dados, localId: uuidv4() }];
      }

      const copia = [...prev];
      copia[itemEditIndex] = { ...dados, localId: prev[itemEditIndex].localId };
      return copia;
    });

    reiniciarItemForm(null);
  };

  const removerItem = (index: number): void => {
    setItens((prev) => prev.filter((_, posicao) => posicao !== index));

    if (itemEditIndex === index) {
      reiniciarItemForm(null);
    }
  };

  const salvarLancamento = async (): Promise<void> => {
    const descricaoFinal = descricao.trim() || itens[0]?.descricao || '';
    const dataFinal = data.trim();

    if (!descricaoFinal) {
      Alert.alert('Erro', 'Descricao do lancamento e obrigatoria');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
      Alert.alert('Erro', 'Informe uma data valida');
      return;
    }

    if (totalLancamento <= 0) {
      Alert.alert('Erro', 'Adicione ao menos um item ou informe o valor do lancamento');
      return;
    }

    const parcelandoAgora = permiteParcelar && parcelado;

    if (parcelandoAgora && parcelas < 2) {
      Alert.alert('Erro', 'Uma compra parcelada precisa de ao menos 2 parcelas');
      return;
    }

    if (parcelandoAgora && !/^\d{4}-\d{2}-\d{2}$/.test(primeiraParcela)) {
      Alert.alert('Erro', 'Informe uma data valida para a 1a parcela');
      return;
    }

    try {
      await onAddLancamento({
        tipo,
        descricao: descricaoFinal,
        data: dataFinal,
        empresaId,
        valor: tipo === 'saida' ? -totalLancamento : totalLancamento,
        itens,
        parcelamento: parcelandoAgora ? { parcelas, primeiraParcela } : null,
      });

      limparFormulario();
      fecharModal();
    } catch (error: unknown) {
      console.error('Erro ao adicionar lancamento', error);
      Alert.alert('Erro', 'Nao foi possivel salvar o lancamento');
    }
  };

  return (
    <>
      <Button label="Novo lancamento" onPress={abrirModal} />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={fecharModal}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={fecharModal} />

          <View style={styles.card}>
            <Text style={sharedStyles.sectionTitle}>Novo lancamento</Text>

            <ScrollView style={styles.cardScroll} nestedScrollEnabled>
              <LancamentoTipoSelector tipo={tipo} onChange={setTipo} />

              <SeletorMultiplo
                label="Empresa"
                opcoes={catalogo.empresas.map((empresa) => ({
                  id: empresa.id,
                  nome: empresa.nome,
                }))}
                selecionados={empresaId ? [empresaId] : []}
                onToggle={(id): void => setEmpresaId((atual) => (atual === id ? null : id))}
                placeholderBusca="Buscar empresa"
                textoTrigger="Selecionar empresa"
                textoVazio="Nenhuma empresa cadastrada"
                textoNenhumEncontrado="Nenhuma empresa encontrada"
              />

              <Text style={sharedStyles.label}>Descricao</Text>
              <TextInput
                value={descricao}
                onChangeText={setDescricao}
                placeholder="Ex.: Mercado"
                placeholderTextColor={colors.placeholder}
                style={[sharedStyles.input, sharedStyles.inputSpaced]}
              />

              <Text style={sharedStyles.label}>Data (DD/MM/AAAA)</Text>
              <BrazilianDateInput
                key={`data-${dataInputKey}`}
                defaultValue={data}
                onChangeValue={setData}
                placeholder={dayjs().format('DD/MM/YYYY')}
                placeholderTextColor={colors.placeholder}
                style={[sharedStyles.input, sharedStyles.inputSpaced]}
              />

              <Text style={sharedStyles.label}>Itens</Text>

              {itens.length === 0 ? (
                <Text style={sharedStyles.inlineEmptyText}>
                  Nenhum item adicionado. Use o valor abaixo para um lancamento sem produtos.
                </Text>
              ) : (
                itens.map((item, index) => (
                  <LancamentoItemCard
                    key={item.localId}
                    item={item}
                    variante={catalogo.variantes.find(
                      (variante) => variante.id === item.varianteId,
                    )}
                    onEditar={(): void => reiniciarItemForm(index)}
                    onRemover={(): void => removerItem(index)}
                  />
                ))
              )}

              <LancamentoItemForm
                key={`item-${itemFormKey}`}
                produtos={catalogo.produtos}
                variantes={catalogo.variantes}
                marcas={catalogo.marcas}
                itemInicial={itemEditIndex !== null ? itens[itemEditIndex] : null}
                onSalvar={salvarItem}
                onCancelar={(): void => reiniciarItemForm(null)}
              />

              {itens.length === 0 && (
                <>
                  <Text style={sharedStyles.label}>Valor (R$)</Text>
                  <BrazilianIntegerInput
                    value={valorManual}
                    onChangeValue={setValorManual}
                    decimalScale={2}
                    placeholder="Ex.: 43,90"
                    placeholderTextColor={colors.placeholder}
                    style={[sharedStyles.input, sharedStyles.inputSpaced]}
                  />
                </>
              )}
              {permiteParcelar && (
                <ParcelamentoSelector
                  ativo={parcelado}
                  onAlternar={alternarParcelamento}
                  parcelas={parcelas}
                  onChangeParcelas={setParcelas}
                  primeiraParcela={primeiraParcela}
                  onChangePrimeiraParcela={setPrimeiraParcela}
                  dataInputKey={parcelaDataKey}
                  total={totalLancamento}
                />
              )}
            </ScrollView>

            <View style={styles.totalRow}>
              <Text style={sharedStyles.totalLabel}>Total</Text>
              <Text
                style={[
                  sharedStyles.totalValue,
                  tipo === 'saida' ? sharedStyles.negative : sharedStyles.positive,
                ]}
              >
                {toCurrency(tipo === 'saida' ? -totalLancamento : totalLancamento)}
              </Text>
            </View>

            <View style={sharedStyles.actionsRow}>
              <Button label="Cancelar" variant="secondary" flex onPress={fecharModal} />
              <Button
                label={
                  permiteParcelar && parcelado
                    ? `Parcelar em ${parcelas}x`
                    : tipo === 'saida'
                      ? 'Adicionar saida'
                      : 'Adicionar entrada'
                }
                flex
                style={tipo === 'entrada' ? styles.buttonEntrada : undefined}
                onPress={(): void => {
                  void salvarLancamento();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    maxHeight: '90%',
    ...shadows.floating,
  },
  cardScroll: {
    flexGrow: 0,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
  },
  buttonEntrada: {
    backgroundColor: colors.success,
  },
});
