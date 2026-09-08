import Ionicons from '@expo/vector-icons/Ionicons';
import React, {useMemo, useState} from 'react';
import {Alert, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import {Button, ChipSelector} from '../../../components/ui';
import type {Marca} from '../../../models/marcas';
import type {Produto} from '../../../models/produtos';
import type {ProdutoVariantes} from '../../../models/produtoVariantes';
import {colors, fontSize, fontWeight, iconSize, radius, sharedStyles, spacing} from '../../../theme';
import {toCurrency} from '../../../utils/format';
import {rotuloVariante} from '../../../utils/variantes';
import type {ItemLancamento} from '../types';

export type DadosItemLancamento = Omit<ItemLancamento, 'localId'>;

type LancamentoItemFormProps = {
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  /** Item sendo editado; `null` monta o formulario em branco. */
  itemInicial: ItemLancamento | null;
  onSalvar: (dados: DadosItemLancamento) => void;
  onCancelar: () => void;
};

/**
 * Mini formulario de item do lancamento.
 *
 * O estado e local e inicializado por `itemInicial`; a tela troca a `key` do
 * componente para alternar entre edicao e novo item.
 */
export default function LancamentoItemForm({
                                             produtos,
                                             variantes,
                                             marcas,
                                             itemInicial,
                                             onSalvar,
                                             onCancelar,
                                           }: LancamentoItemFormProps): React.ReactNode {
  const [produtoId, setProdutoId] = useState<string | null>(itemInicial?.produtoId ?? null);
  const [varianteId, setVarianteId] = useState<string | null>(itemInicial?.varianteId ?? null);
  const [descricao, setDescricao] = useState(itemInicial?.descricao ?? '');
  const [quantidade, setQuantidade] = useState(itemInicial ? String(itemInicial.quantidade) : '1');
  const [preco, setPreco] = useState(itemInicial ? itemInicial.precoUnitario.toFixed(2) : '');
  const [scannerAberto, setScannerAberto] = useState(false);

  const editando = itemInicial !== null;

  const variantesDoProduto = useMemo(
    () => (produtoId ? variantes.filter((variante) => variante.produto_id === produtoId) : []),
    [variantes, produtoId],
  );

  const selecionarProduto = (id: string): void => {
    if (produtoId === id) {
      setProdutoId(null);
      setVarianteId(null);
      return;
    }

    const produto = produtos.find((item) => item.id === id);

    setProdutoId(id);
    setVarianteId(null);
    setDescricao(produto?.nome ?? '');
    setPreco(produto ? produto.preco.toFixed(2) : '');
  };

  const aplicarVariante = (variante: ProdutoVariantes): void => {
    const produto = produtos.find((item) => item.id === variante.produto_id);

    setProdutoId(variante.produto_id);
    setVarianteId(variante.id);
    setDescricao(`${produto?.nome ?? ''} - ${rotuloVariante(variante, marcas)}`.trim());
    setPreco(variante.preco.toFixed(2));
  };

  const selecionarVariante = (id: string): void => {
    if (varianteId === id) {
      setVarianteId(null);
      return;
    }

    const variante = variantes.find((item) => item.id === id);

    if (!variante) {
      return;
    }

    aplicarVariante(variante);
  };

  /** Seleciona produto e variante a partir do codigo de barras lido pela camera. */
  const lerCodigoBarras = (codigo: string): void => {
    setScannerAberto(false);

    const codigoLimpo = codigo.trim();

    if (!codigoLimpo) {
      return;
    }

    const variante = variantes.find((item) => (item.codigo_barras ?? '').trim() === codigoLimpo);

    if (!variante) {
      Alert.alert('Codigo nao encontrado', `Nenhuma variante cadastrada com o codigo ${codigoLimpo}`);
      return;
    }

    aplicarVariante(variante);
  };

  const salvar = (): void => {
    const descricaoLimpa = descricao.trim();
    const quantidadeNumero = Number(quantidade);
    const precoNumero = Number(preco);

    if (!descricaoLimpa) {
      Alert.alert('Erro', 'Informe a descricao do item ou selecione um produto');
      return;
    }

    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      Alert.alert('Erro', 'Quantidade do item deve ser maior que zero');
      return;
    }

    if (!Number.isFinite(precoNumero) || precoNumero <= 0) {
      Alert.alert('Erro', 'Preco unitario do item deve ser maior que zero');
      return;
    }

    onSalvar({
      produtoId,
      varianteId,
      descricao: descricaoLimpa,
      quantidade: quantidadeNumero,
      precoUnitario: precoNumero,
    });
  };

  return (
    <View style={sharedStyles.subForm}>
      <Text style={sharedStyles.subFormTitle}>{editando ? 'Editar item' : 'Novo item'}</Text>

      <Pressable style={styles.scanButton} onPress={(): void => setScannerAberto(true)}>
        <Ionicons name="barcode-outline" size={iconSize.md} color={colors.primary}/>
        <Text style={styles.scanButtonText}>Ler codigo de barras</Text>
      </Pressable>

      <SeletorMultiplo
        label="Produto"
        opcoes={produtos.map((produto) => ({id: produto.id, nome: produto.nome}))}
        selecionados={produtoId ? [produtoId] : []}
        onToggle={selecionarProduto}
        placeholderBusca="Buscar produto"
        textoTrigger="Selecionar produto"
        textoVazio="Nenhum produto cadastrado"
        textoNenhumEncontrado="Nenhum produto encontrado"
      />

      {produtoId !== null && (
        <>
          <Text style={sharedStyles.label}>Variante</Text>
          {variantesDoProduto.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>
              Este produto ainda nao possui variantes cadastradas
            </Text>
          ) : (
            <ChipSelector
              scroll
              opcoes={variantesDoProduto.map((variante) => ({
                valor: variante.id,
                rotulo: `${rotuloVariante(variante, marcas)} • ${toCurrency(variante.preco)}`,
              }))}
              selecionado={varianteId}
              onSelecionar={selecionarVariante}
            />
          )}
        </>
      )}

      <Text style={sharedStyles.label}>Descricao do item</Text>
      <TextInput
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex.: Arroz 5kg"
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <Text style={sharedStyles.label}>Quantidade</Text>
      <BrazilianIntegerInput
        value={quantidade}
        onChangeValue={setQuantidade}
        decimalScale={0}
        placeholder="Ex.: 2"
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <Text style={sharedStyles.label}>Preco unitario (R$)</Text>
      <BrazilianIntegerInput
        value={preco}
        onChangeValue={setPreco}
        decimalScale={2}
        fixedDecimalScale
        placeholder="Ex.: 43,90"
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <View style={sharedStyles.actionsRow}>
        <Button
          label={editando ? 'Salvar item' : 'Adicionar item'}
          variant="secondary"
          flex
          onPress={salvar}
        />
        {editando && <Button label="Cancelar" variant="secondary" flex onPress={onCancelar}/>}
      </View>

      {scannerAberto && (
        <ScannerCodigoBarras
          onLer={lerCodigoBarras}
          onFechar={(): void => setScannerAberto(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  scanButtonText: {
    color: colors.textBody,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
});
