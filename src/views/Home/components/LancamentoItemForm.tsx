import React, { useMemo, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { Button, ChipSelector, IconButton } from '../../../components/ui';
import type { Marca } from '../../../models/marcas';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { colors, sharedStyles } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import { ehGranel, medidaGranel, rotuloQuantidade, rotuloVariante } from '../../../utils/variantes';
import type { ItemLancamento } from '../types';

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

  const varianteSelecionada = useMemo(
    () => variantes.find((variante) => variante.id === varianteId),
    [variantes, varianteId],
  );

  /** Item a granel: quantidade e o peso/volume comprado e o preco e por medida. */
  const granel = ehGranel(varianteSelecionada);
  const medida = varianteSelecionada && granel ? medidaGranel(varianteSelecionada) : '';

  /**
   * Troca de variante entre pacote e granel: limpa o peso para o usuario digitar
   * (o campo passa a ter casas decimais) ou volta para 1 pacote.
   */
  const ajustarQuantidade = (nova: ProdutoVariantes | undefined): void => {
    const novaGranel = ehGranel(nova);

    if (novaGranel !== granel) {
      setQuantidade(novaGranel ? '' : '1');
    }
  };

  const selecionarProduto = (id: string): void => {
    if (produtoId === id) {
      setProdutoId(null);
      setVarianteId(null);
      ajustarQuantidade(undefined);
      return;
    }

    const produto = produtos.find((item) => item.id === id);

    setProdutoId(id);
    setVarianteId(null);
    ajustarQuantidade(undefined);
    setDescricao(produto?.nome ?? '');
    setPreco(produto ? produto.preco.toFixed(2) : '');
  };

  const aplicarVariante = (variante: ProdutoVariantes): void => {
    const produto = produtos.find((item) => item.id === variante.produto_id);

    setProdutoId(variante.produto_id);
    setVarianteId(variante.id);
    ajustarQuantidade(variante);
    setDescricao(`${produto?.nome ?? ''} - ${rotuloVariante(variante, marcas)}`.trim());
    setPreco(variante.preco.toFixed(2));
  };

  const selecionarVariante = (id: string): void => {
    if (varianteId === id) {
      setVarianteId(null);
      ajustarQuantidade(undefined);
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
      Alert.alert(
        'Codigo nao encontrado',
        `Nenhuma variante cadastrada com o codigo ${codigoLimpo}`,
      );
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
      Alert.alert(
        'Erro',
        granel
          ? `Informe o peso comprado em ${medida} (ex.: 0,750)`
          : 'Quantidade do item deve ser maior que zero',
      );
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

      <SeletorMultiplo
        label="Produto"
        opcoes={produtos.map((produto) => ({ id: produto.id, nome: produto.nome }))}
        selecionados={produtoId ? [produtoId] : []}
        onToggle={selecionarProduto}
        placeholderBusca="Buscar produto"
        textoTrigger="Selecionar produto"
        textoVazio="Nenhum produto cadastrado"
        textoNenhumEncontrado="Nenhum produto encontrado"
        extra={<IconButton icon="barcode-outline" onPress={(): void => setScannerAberto(true)} />}
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

      <Text style={sharedStyles.label}>{granel ? `Quantidade (${medida})` : 'Quantidade'}</Text>
      <BrazilianIntegerInput
        value={quantidade}
        onChangeValue={setQuantidade}
        decimalScale={granel ? 3 : 0}
        placeholder={granel ? 'Ex.: 0,750' : 'Ex.: 2'}
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <Text style={sharedStyles.label}>
        {granel ? `Preco por ${medida} (R$)` : 'Preco unitario (R$)'}
      </Text>
      <BrazilianIntegerInput
        value={preco}
        onChangeValue={setPreco}
        decimalScale={2}
        fixedDecimalScale
        placeholder={granel ? 'Ex.: 8,90' : 'Ex.: 43,90'}
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      {granel && Number(quantidade) > 0 && Number(preco) > 0 && (
        <Text style={[sharedStyles.sectionHint, sharedStyles.inputSpaced]}>
          {`${rotuloQuantidade(Number(quantidade), varianteSelecionada)} x ${toCurrency(
            Number(preco),
          )} = ${toCurrency(Number(quantidade) * Number(preco))}`}
        </Text>
      )}

      <View style={sharedStyles.actionsRow}>
        <Button
          label={editando ? 'Salvar item' : 'Adicionar item'}
          variant="secondary"
          flex
          onPress={salvar}
        />
        {editando && <Button label="Cancelar" variant="secondary" flex onPress={onCancelar} />}
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
