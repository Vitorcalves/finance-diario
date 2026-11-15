import React, { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { Button, ChipSelector, IconButton, Text, TextInput } from '../../../components/ui';
import type { Marca } from '../../../models/marcas';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import { quantidadeFracionada } from '../../../utils/rascunhoDaNotaFiscal';
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
  const { colors, sharedStyles } = useTheme();
  const [produtoId, setProdutoId] = useState<string | null>(itemInicial?.produtoId ?? null);
  const [varianteId, setVarianteId] = useState<string | null>(itemInicial?.varianteId ?? null);
  const [descricao, setDescricao] = useState(itemInicial?.descricao ?? '');
  const [quantidade, setQuantidade] = useState(itemInicial ? String(itemInicial.quantidade) : '1');
  /**
   * O campo mostra 2 casas; o preco do item da nota tem mais (o total da linha
   * dividido pelo peso). Sem edicao, o salvar devolve o preco original.
   */
  const precoInicial = itemInicial ? itemInicial.precoUnitario.toFixed(2) : '';
  const [preco, setPreco] = useState(precoInicial);
  const [scannerAberto, setScannerAberto] = useState(false);

  const editando = itemInicial !== null;

  /**
   * Item lido da nota fiscal: quantidade e preco sao os da nota. Escolher o
   * produto ou a variante so liga o item ao cadastro, sem trocar os dois.
   */
  const itemNota = itemInicial?.itemNota ?? null;
  const notaFracionada =
    itemNota !== null && quantidadeFracionada(itemNota.unidade, itemInicial?.quantidade ?? 1);

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
  /** Peso da nota (0,196 kg) tem casas decimais mesmo sem variante a granel. */
  const quantidadeDecimal = granel || notaFracionada;

  /**
   * Troca de variante entre pacote e granel: limpa o peso para o usuario digitar
   * (o campo passa a ter casas decimais) ou volta para 1 pacote. No item da
   * nota a quantidade e a da nota e nao muda.
   */
  const ajustarQuantidade = (nova: ProdutoVariantes | undefined): void => {
    if (itemNota) {
      return;
    }

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

    if (!itemNota) {
      setPreco(produto ? produto.preco.toFixed(2) : '');
    }
  };

  const aplicarVariante = (variante: ProdutoVariantes): void => {
    const produto = produtos.find((item) => item.id === variante.produto_id);

    setProdutoId(variante.produto_id);
    setVarianteId(variante.id);
    ajustarQuantidade(variante);
    setDescricao(`${produto?.nome ?? ''} - ${rotuloVariante(variante, marcas)}`.trim());

    // O preco da nota e o pago; o da variante e so o da ultima compra.
    if (!itemNota) {
      setPreco(variante.preco.toFixed(2));
    }
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
        'Código não encontrado',
        `Nenhuma variante cadastrada com o código ${codigoLimpo}`,
      );
      return;
    }

    aplicarVariante(variante);
  };

  /** Preco que vale: o original enquanto o campo nao for editado. */
  const precoEfetivo =
    itemInicial && preco === precoInicial ? itemInicial.precoUnitario : Number(preco);

  /** `0,196 kg` no item da nota sem variante a granel; senao, o rotulo de sempre. */
  const rotuloDaQuantidade = (valor: number): string =>
    !granel && notaFracionada && itemNota?.unidade
      ? `${rotuloQuantidade(valor, undefined)} ${itemNota.unidade.toLowerCase()}`
      : rotuloQuantidade(valor, varianteSelecionada);

  const salvar = (): void => {
    const descricaoLimpa = descricao.trim();
    const quantidadeNumero = Number(quantidade);
    const precoNumero = precoEfetivo;

    if (!descricaoLimpa) {
      Alert.alert('Erro', 'Informe a descrição do item ou selecione um produto');
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
      Alert.alert('Erro', 'Preço unitário do item deve ser maior que zero');
      return;
    }

    onSalvar({
      produtoId,
      varianteId,
      descricao: descricaoLimpa,
      quantidade: quantidadeNumero,
      precoUnitario: precoNumero,
      itemNota,
    });
  };

  return (
    <View style={sharedStyles.subForm}>
      <Text style={sharedStyles.subFormTitle}>{editando ? 'Editar item' : 'Novo item'}</Text>

      {itemNota ? (
        <Text style={[sharedStyles.sectionHint, sharedStyles.inputSpaced]}>
          {`Da nota: ${itemNota.descricao}${itemNota.codigo ? ` (código ${itemNota.codigo})` : ''}. ` +
            'Ligado a um produto, ele já vem ligado na próxima nota desta loja.'}
        </Text>
      ) : null}

      <SeletorMultiplo
        label="Produto"
        opcoes={produtos.map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          oculta: produto.eventual === 1,
        }))}
        selecionados={produtoId ? [produtoId] : []}
        onToggle={selecionarProduto}
        placeholderBusca="Buscar produto"
        textoTrigger="Selecionar produto"
        textoVazio="Nenhum produto cadastrado"
        textoNenhumEncontrado="Nenhum produto encontrado"
        extra={
          <IconButton
            icon="barcode-outline"
            onPress={(): void => setScannerAberto(true)}
            accessibilityLabel="Ler código de barras"
          />
        }
      />

      {produtoId !== null && (
        <>
          <Text style={sharedStyles.label}>Variante</Text>
          {variantesDoProduto.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>
              Este produto ainda não possui variantes cadastradas
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

      <Text style={sharedStyles.label}>Descrição do item</Text>
      <TextInput
        value={descricao}
        onChangeText={setDescricao}
        placeholder="Ex.: Arroz 5kg"
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <Text style={sharedStyles.label}>
        {granel
          ? `Quantidade (${medida})`
          : notaFracionada && itemNota?.unidade
            ? `Quantidade (${itemNota.unidade.toLowerCase()})`
            : 'Quantidade'}
      </Text>
      <BrazilianIntegerInput
        value={quantidade}
        onChangeValue={setQuantidade}
        decimalScale={quantidadeDecimal ? 3 : 0}
        placeholder={quantidadeDecimal ? 'Ex.: 0,750' : 'Ex.: 2'}
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <Text style={sharedStyles.label}>
        {granel
          ? `Preço por ${medida} (R$)`
          : notaFracionada && itemNota?.unidade
            ? `Preço por ${itemNota.unidade.toLowerCase()} (R$)`
            : 'Preço unitário (R$)'}
      </Text>
      <BrazilianIntegerInput
        value={preco}
        onChangeValue={setPreco}
        decimalScale={2}
        placeholder={granel ? 'Ex.: 8,90' : 'Ex.: 43,90'}
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      {quantidadeDecimal && Number(quantidade) > 0 && precoEfetivo > 0 && (
        <Text style={[sharedStyles.sectionHint, sharedStyles.inputSpaced]}>
          {`${rotuloDaQuantidade(Number(quantidade))} x ${toCurrency(
            precoEfetivo,
          )} = ${toCurrency(Number(quantidade) * precoEfetivo)}`}
        </Text>
      )}

      <View style={sharedStyles.actionsRow}>
        <Button label="Cancelar" variant="secondary" flex onPress={onCancelar} />
        <Button
          label={editando ? 'Salvar item' : 'Adicionar item'}
          icon={editando ? 'checkmark' : 'add'}
          flex
          onPress={salvar}
        />
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
