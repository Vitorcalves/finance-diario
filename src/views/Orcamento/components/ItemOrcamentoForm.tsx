import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { Button, ChipSelector, IconButton } from '../../../components/ui';
import type { HistoricoPreco } from '../../../models/historicoPreco';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { colors, fontSize, radius, sharedStyles, spacing } from '../../../theme';
import { formatarData, toCurrency } from '../../../utils/format';
import type { DadosItemOrcamento, ItemOrcamento } from '../types';

type ItemOrcamentoFormProps = {
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  /** Item em edicao; `null` monta o formulario em branco. */
  itemInicial: ItemOrcamento | null;
  empresaSelecionada: string | null;
  ultimoPreco: (varianteId: string, empresaId: string | null) => HistoricoPreco | null;
  menorPrecoRegistrado: (varianteId: string) => HistoricoPreco | null;
  precoBaseDaVariante: (varianteId: string) => number | null;
  nomeEmpresa: (id: string | null) => string;
  rotuloVariante: (varianteId: string) => string;
  /** Devolve `true` quando o item foi aceito, o que limpa o formulario. */
  onSalvar: (dados: DadosItemOrcamento) => boolean;
  onCancelar: () => void;
};

/**
 * Mini formulario de item do orcamento.
 *
 * O estado e local e inicializado por `itemInicial`; a tela troca a `key` do
 * componente para alternar entre edicao e novo item.
 */
export default function ItemOrcamentoForm({
  produtos,
  variantes,
  itemInicial,
  empresaSelecionada,
  ultimoPreco,
  menorPrecoRegistrado,
  precoBaseDaVariante,
  nomeEmpresa,
  rotuloVariante,
  onSalvar,
  onCancelar,
}: ItemOrcamentoFormProps): React.ReactNode {
  const [produtoId, setProdutoId] = useState<string | null>(itemInicial?.produtoId ?? null);
  const [varianteId, setVarianteId] = useState<string | null>(itemInicial?.varianteId ?? null);
  const [quantidade, setQuantidade] = useState(itemInicial ? String(itemInicial.quantidade) : '1');
  const [preco, setPreco] = useState(itemInicial ? itemInicial.preco.toFixed(2) : '');
  const [scannerAberto, setScannerAberto] = useState(false);

  const editando = itemInicial !== null;

  const variantesDoProduto = useMemo(
    () => (produtoId ? variantes.filter((variante) => variante.produto_id === produtoId) : []),
    [variantes, produtoId],
  );

  const selecionarProduto = (id: string): void => {
    setProdutoId((atual) => (atual === id ? null : id));
    setVarianteId(null);
    setPreco('');
  };

  const aplicarVariante = (variante: ProdutoVariantes): void => {
    setProdutoId(variante.produto_id);
    setVarianteId(variante.id);

    // Sugere o ultimo preco visto neste mercado; se nao houver, o preco atual da variante.
    const referencia = ultimoPreco(variante.id, empresaSelecionada);
    const sugestao = referencia?.preco ?? precoBaseDaVariante(variante.id);

    setPreco(sugestao !== null ? sugestao.toFixed(2) : '');
  };

  const selecionarVariante = (id: string): void => {
    if (varianteId === id) {
      setVarianteId(null);
      setPreco('');
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
    if (!produtoId) {
      Alert.alert('Erro', 'Selecione o produto');
      return;
    }

    if (!varianteId) {
      Alert.alert('Erro', 'Selecione a variante para comparar o mesmo item entre mercados');
      return;
    }

    const quantidadeNumero = Number(quantidade);
    const precoNumero = Number(preco);

    if (!Number.isFinite(quantidadeNumero) || quantidadeNumero <= 0) {
      Alert.alert('Erro', 'Quantidade deve ser maior que zero');
      return;
    }

    if (!Number.isFinite(precoNumero) || precoNumero <= 0) {
      Alert.alert('Erro', 'Preco deve ser maior que zero');
      return;
    }

    onSalvar({ produtoId, varianteId, quantidade: quantidadeNumero, preco: precoNumero });
  };

  const referenciaMercado = varianteId ? ultimoPreco(varianteId, empresaSelecionada) : null;
  const referenciaMenor = varianteId ? menorPrecoRegistrado(varianteId) : null;

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
                rotulo: rotuloVariante(variante.id),
              }))}
              selecionado={varianteId}
              onSelecionar={selecionarVariante}
            />
          )}
        </>
      )}

      {varianteId !== null && (
        <View style={styles.referenciaBox}>
          <Text style={styles.referenciaTexto}>
            {referenciaMercado
              ? `Ultimo preco em ${nomeEmpresa(empresaSelecionada)}: ${toCurrency(
                  referenciaMercado.preco,
                )} em ${formatarData(referenciaMercado.data)}`
              : empresaSelecionada
                ? 'Sem preco registrado neste mercado ainda'
                : 'Selecione o mercado para ver o preco de referencia'}
          </Text>
          <Text style={styles.referenciaTexto}>
            {referenciaMenor
              ? `Menor preco ja visto: ${toCurrency(referenciaMenor.preco)} em ${nomeEmpresa(
                  referenciaMenor.empresa_id,
                )}`
              : 'Nenhum preco no historico para esta variante'}
          </Text>
        </View>
      )}

      <Text style={sharedStyles.label}>Quantidade</Text>
      <BrazilianIntegerInput
        value={quantidade}
        onChangeValue={setQuantidade}
        decimalScale={0}
        placeholder="Ex.: 2"
        placeholderTextColor={colors.placeholder}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <Text style={sharedStyles.label}>Preco pesquisado (R$)</Text>
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

const styles = StyleSheet.create({
  referenciaBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  referenciaTexto: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
});
