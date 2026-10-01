import { useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { Button, ChipSelector, IconButton, Text } from '../../../components/ui';
import type { HistoricoPreco } from '../../../models/historicoPreco';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { fontSize, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { formatarData, toCurrency } from '../../../utils/format';
import { ehGranel, medidaGranel, rotuloQuantidade } from '../../../utils/variantes';
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
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
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

  const varianteSelecionada = useMemo(
    () => variantes.find((variante) => variante.id === varianteId),
    [variantes, varianteId],
  );

  /** Item a granel: quantidade e o peso/volume e o preco pesquisado e por medida. */
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
    setProdutoId((atual) => (atual === id ? null : id));
    setVarianteId(null);
    ajustarQuantidade(undefined);
    setPreco('');
  };

  const aplicarVariante = (variante: ProdutoVariantes): void => {
    setProdutoId(variante.produto_id);
    setVarianteId(variante.id);
    ajustarQuantidade(variante);

    // Sugere o ultimo preco visto neste mercado; se nao houver, o preco atual da variante.
    const referencia = ultimoPreco(variante.id, empresaSelecionada);
    const sugestao = referencia?.preco ?? precoBaseDaVariante(variante.id);

    setPreco(sugestao !== null ? sugestao.toFixed(2) : '');
  };

  const selecionarVariante = (id: string): void => {
    if (varianteId === id) {
      setVarianteId(null);
      ajustarQuantidade(undefined);
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
        'Código não encontrado',
        `Nenhuma variante cadastrada com o código ${codigoLimpo}`,
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
      Alert.alert(
        'Erro',
        granel ? `Informe o peso em ${medida} (ex.: 0,750)` : 'Quantidade deve ser maior que zero',
      );
      return;
    }

    if (!Number.isFinite(precoNumero) || precoNumero <= 0) {
      Alert.alert('Erro', 'Preço deve ser maior que zero');
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
        opcoes={produtos
          // Orcamento e pesquisa de mercado; compra eventual nao entra aqui.
          .filter((produto) => produto.eventual !== 1 || produto.id === produtoId)
          .map((produto) => ({ id: produto.id, nome: produto.nome }))}
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
              Este produto ainda não possui variantes cadastradas
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
              ? `Último preço em ${nomeEmpresa(empresaSelecionada)}: ${toCurrency(
                  referenciaMercado.preco,
                )} em ${formatarData(referenciaMercado.data)}`
              : empresaSelecionada
                ? 'Sem preço registrado neste mercado ainda'
                : 'Selecione o mercado para ver o preço de referência'}
          </Text>
          <Text style={styles.referenciaTexto}>
            {referenciaMenor
              ? `Menor preço já visto: ${toCurrency(referenciaMenor.preco)} em ${nomeEmpresa(
                  referenciaMenor.empresa_id,
                )}`
              : 'Nenhum preço no histórico para esta variante'}
          </Text>
        </View>
      )}

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
        {granel ? `Preço pesquisado por ${medida} (R$)` : 'Preço pesquisado (R$)'}
      </Text>
      <BrazilianIntegerInput
        value={preco}
        onChangeValue={setPreco}
        decimalScale={2}
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
        {editando && <Button label="Cancelar" variant="secondary" flex onPress={onCancelar} />}
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

const useStyles = makeStyles((colors) => ({
  referenciaBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  referenciaTexto: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
