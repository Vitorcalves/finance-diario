import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import SeletorCategoria from '../../../components/SeletorCategoria';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import {
  BottomSheet,
  Button,
  ChipSelector,
  SegmentedControl,
  Text,
  TextInput,
  useToast,
} from '../../../components/ui';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { faturaDaCompra } from '../../../utils/cartao';
import { formatarData, toCurrency } from '../../../utils/format';
import { vibrarAviso } from '../../../utils/haptics';
import { useCatalogoLancamento } from '../useCatalogoLancamento';
import type { ItemLancamento, NovoLancamento, RascunhoLancamento, TipoLancamento } from '../types';
import LancamentoItemCard from './LancamentoItemCard';
import LancamentoItemForm, { type DadosItemLancamento } from './LancamentoItemForm';
import ParcelamentoSelector from './ParcelamentoSelector';

const todayIso = (): string => dayjs().format('YYYY-MM-DD');
const ontemIso = (): string => dayjs().subtract(1, 'day').format('YYYY-MM-DD');

type AtalhoData = 'hoje' | 'ontem';

/** Mostra o erro de validacao sem fechar o painel. */
const avisar = (mensagem: string): void => {
  vibrarAviso();
  Alert.alert('Confira o lançamento', mensagem);
};

type NovoLancamentoFormProps = {
  visivel: boolean;
  onFechar: () => void;
  onAddLancamento: (lancamento: NovoLancamento) => Promise<void>;
  /**
   * Dados para abrir o formulario ja preenchido (ex.: compra da lista de compras).
   * Lido so na montagem: troque a `key` do formulario para aplicar outro.
   */
  rascunho?: RascunhoLancamento | null;
  /** Mensagem do aviso depois de salvar; o padrao descreve o valor registrado. */
  mensagemSucesso?: string;
};

/**
 * Painel de novo lancamento: valor em destaque no topo, tipo, descricao,
 * data, empresa, itens e parcelamento.
 *
 * Guarda apenas o cabecalho do lancamento e a lista de itens; a edicao de um
 * item fica em `LancamentoItemForm`.
 */
export default function NovoLancamentoForm({
  visivel,
  onFechar,
  onAddLancamento,
  rascunho,
  mensagemSucesso,
}: NovoLancamentoFormProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const toast = useToast();
  const catalogo = useCatalogoLancamento();
  const { carregar } = catalogo;

  const [tipo, setTipo] = useState<TipoLancamento>('saida');
  const [empresaId, setEmpresaId] = useState<string | null>(rascunho?.empresaId ?? null);
  const [categoriaId, setCategoriaId] = useState<string | null>(rascunho?.categoriaId ?? null);
  /** Depois que o usuario escolhe a categoria, a empresa nao a troca mais. */
  const [categoriaManual, setCategoriaManual] = useState(Boolean(rascunho?.categoriaId));
  const [descricao, setDescricao] = useState(rascunho?.descricao ?? '');
  const [data, setData] = useState(todayIso());
  const [dataInputKey, setDataInputKey] = useState(0);
  const [valorManual, setValorManual] = useState('');
  const [salvando, setSalvando] = useState(false);

  const [parcelado, setParcelado] = useState(false);
  const [parcelas, setParcelas] = useState(2);
  const [primeiraParcela, setPrimeiraParcela] = useState(todayIso());
  const [parcelaDataKey, setParcelaDataKey] = useState(0);

  /** Conta do lancamento (origem na transferencia); `null` ate o catalogo carregar. */
  const [contaId, setContaId] = useState<string | null>(null);
  /** So transferencia: conta que recebe o valor. */
  const [contaDestinoId, setContaDestinoId] = useState<string | null>(null);

  const [itens, setItens] = useState<ItemLancamento[]>(() =>
    (rascunho?.itens ?? []).map((item) => ({ ...item, localId: uuidv4() })),
  );
  /** O mini formulario de item so aparece quando o usuario pede. */
  const [formItemAberto, setFormItemAberto] = useState(false);
  const [itemEditIndex, setItemEditIndex] = useState<number | null>(null);
  /** Trocada a cada edicao/salvamento para remontar o mini formulario limpo. */
  const [itemFormKey, setItemFormKey] = useState(0);

  // Cadastros frescos a cada abertura: um produto criado agora ja aparece.
  useEffect(() => {
    if (visivel) {
      carregar();
    }
  }, [visivel, carregar]);

  // Padrao: a primeira conta caixa ativa recebe o lancamento sem conta escolhida.
  // Ajuste durante a renderizacao (padrao "You Might Not Need an Effect").
  const [contaPadraoAplicada, setContaPadraoAplicada] = useState(false);
  const [visivelAnterior, setVisivelAnterior] = useState(visivel);
  if (visivel !== visivelAnterior) {
    setVisivelAnterior(visivel);
    if (visivel) {
      setContaPadraoAplicada(false);
    }
  }
  if (visivel && !contaPadraoAplicada && catalogo.contas.length > 0) {
    setContaPadraoAplicada(true);
    if (contaId === null) {
      setContaId(catalogo.contas.find((conta) => conta.tipo === 'caixa')?.id ?? null);
    }
  }

  const trocarTipo = (novo: TipoLancamento): void => {
    setTipo(novo);

    // Categoria de saida nao serve para entrada (e vice-versa).
    const atual = catalogo.categorias.find((categoria) => categoria.id === categoriaId);

    if (atual && atual.tipo !== novo) {
      setCategoriaId(null);
      setCategoriaManual(false);
    }
  };

  const escolherEmpresa = (id: string): void => {
    const nova = empresaId === id ? null : id;
    setEmpresaId(nova);

    // Sugere a categoria usada da ultima vez nesta empresa.
    const sugerida = nova ? catalogo.categoriaPorEmpresa.get(nova) : undefined;
    const categoriaSugerida = catalogo.categorias.find((categoria) => categoria.id === sugerida);

    if (!categoriaManual && categoriaSugerida && categoriaSugerida.tipo === tipo) {
      setCategoriaId(categoriaSugerida.id);
    }
  };

  const totalItens = useMemo(
    () => itens.reduce((soma, item) => soma + item.quantidade * item.precoUnitario, 0),
    [itens],
  );

  const totalLancamento = itens.length > 0 ? totalItens : Number(valorManual) || 0;

  const contaSelecionada = catalogo.contas.find((conta) => conta.id === contaId);
  const ehTransferencia = tipo === 'transferencia';

  /** Entrada parcelada nao faz sentido aqui: o parcelamento e do que se compra. */
  const permiteParcelar = tipo === 'saida';

  /**
   * Compra no cartao: qual fatura recebe o lancamento, atualizado em tempo
   * real conforme a data muda. Parcelado, a referencia e a data da 1a parcela
   * (cada parcela cai no ciclo da propria data). A view nunca calcula data na
   * mao: quem decide o ciclo e o util de calendario.
   */
  const cicloFatura = useMemo(() => {
    if (
      contaSelecionada?.tipo !== 'cartao' ||
      contaSelecionada.dia_fechamento == null ||
      contaSelecionada.dia_vencimento == null
    ) {
      return null;
    }

    const referencia = permiteParcelar && parcelado ? primeiraParcela : data;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(referencia)) {
      return null;
    }

    return faturaDaCompra(
      referencia,
      contaSelecionada.dia_fechamento,
      contaSelecionada.dia_vencimento,
    );
  }, [contaSelecionada, data, permiteParcelar, parcelado, primeiraParcela]);

  const atalhoData: AtalhoData | null =
    data === todayIso() ? 'hoje' : data === ontemIso() ? 'ontem' : null;

  const escolherData = (atalho: AtalhoData): void => {
    setData(atalho === 'hoje' ? todayIso() : ontemIso());
    setDataInputKey((atual) => atual + 1);
  };

  const alternarParcelamento = (ativo: boolean): void => {
    setParcelado(ativo);

    if (ativo) {
      // Por padrao a 1a parcela vence no dia da compra; o usuario ajusta se quiser.
      setPrimeiraParcela(data);
      setParcelaDataKey((atual) => atual + 1);
    }
  };

  const abrirFormItem = (index: number | null): void => {
    setItemEditIndex(index);
    setItemFormKey((atual) => atual + 1);
    setFormItemAberto(true);
  };

  const fecharFormItem = (): void => {
    setItemEditIndex(null);
    setFormItemAberto(false);
  };

  const limparFormulario = (): void => {
    setTipo('saida');
    setEmpresaId(null);
    setCategoriaId(null);
    setCategoriaManual(false);
    setDescricao('');
    setData(todayIso());
    setDataInputKey((atual) => atual + 1);
    setValorManual('');
    setParcelado(false);
    setParcelas(2);
    setPrimeiraParcela(todayIso());
    setParcelaDataKey((atual) => atual + 1);
    setContaId(catalogo.contas.find((conta) => conta.tipo === 'caixa')?.id ?? null);
    setContaDestinoId(null);
    setItens([]);
    fecharFormItem();
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

    fecharFormItem();
  };

  const removerItem = (index: number): void => {
    setItens((prev) => prev.filter((_, posicao) => posicao !== index));

    if (itemEditIndex === index) {
      fecharFormItem();
    }
  };

  const salvarLancamento = async (): Promise<void> => {
    // Um segundo toque enquanto grava criaria o lancamento em dobro.
    if (salvando) {
      return;
    }

    if (ehTransferencia) {
      if (!contaId || !contaDestinoId) {
        avisar('Escolha a conta de origem e a conta de destino.');
        return;
      }

      if (contaId === contaDestinoId) {
        avisar('Origem e destino precisam ser contas diferentes.');
        return;
      }
    }

    const descricaoFinal =
      descricao.trim() ||
      itens[0]?.descricao ||
      (ehTransferencia ? 'Transferência entre contas' : '');
    const dataFinal = data.trim();

    if (!descricaoFinal) {
      avisar('Informe a descrição do lançamento.');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataFinal)) {
      avisar('Informe uma data válida.');
      return;
    }

    if (totalLancamento <= 0) {
      avisar('Informe o valor ou adicione ao menos um item.');
      return;
    }

    const parcelandoAgora = permiteParcelar && parcelado;

    if (parcelandoAgora && parcelas < 2) {
      avisar('Uma compra parcelada precisa de ao menos 2 parcelas.');
      return;
    }

    if (parcelandoAgora && !/^\d{4}-\d{2}-\d{2}$/.test(primeiraParcela)) {
      avisar('Informe uma data válida para a 1ª parcela.');
      return;
    }

    try {
      setSalvando(true);

      await onAddLancamento({
        tipo,
        descricao: descricaoFinal,
        data: dataFinal,
        empresaId: ehTransferencia ? null : empresaId,
        categoriaId: ehTransferencia ? null : categoriaId,
        valor: tipo === 'entrada' ? totalLancamento : -totalLancamento,
        itens: ehTransferencia ? [] : itens,
        parcelamento: parcelandoAgora ? { parcelas, primeiraParcela } : null,
        contaId,
        contaDestinoId: ehTransferencia ? contaDestinoId : null,
      });

      const mensagem =
        mensagemSucesso ??
        (parcelandoAgora
          ? `Compra parcelada em ${parcelas}x registrada`
          : ehTransferencia
            ? `Transferência de ${toCurrency(totalLancamento)} registrada`
            : `${tipo === 'saida' ? 'Saída' : 'Entrada'} de ${toCurrency(totalLancamento)} registrada`);

      limparFormulario();
      onFechar();
      toast.mostrar(mensagem);
    } catch (error: unknown) {
      console.error('Erro ao adicionar lancamento', error);
      Alert.alert('Erro', 'Não foi possível salvar o lançamento. Nada foi gravado.');
    } finally {
      setSalvando(false);
    }
  };

  const corTotal = tipo === 'saida' ? colors.danger : colors.success;

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo="Novo lançamento"
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button
            label={
              permiteParcelar && parcelado
                ? `Parcelar em ${parcelas}x`
                : ehTransferencia
                  ? 'Transferir'
                  : tipo === 'saida'
                    ? 'Adicionar saída'
                    : 'Adicionar entrada'
            }
            variant={tipo === 'entrada' ? 'success' : 'primary'}
            icon="checkmark"
            loading={salvando}
            flex
            onPress={(): void => {
              void salvarLancamento();
            }}
          />
        </View>
      }
    >
      <SegmentedControl
        opcoes={[
          { valor: 'saida', rotulo: 'Saída', cor: colors.danger },
          { valor: 'entrada', rotulo: 'Entrada', cor: colors.success },
          { valor: 'transferencia', rotulo: 'Transferência', cor: colors.primary },
        ]}
        valor={tipo}
        onChange={trocarTipo}
      />

      <View style={styles.valorBloco}>
        {itens.length === 0 ? (
          <>
            <Text style={styles.valorRotulo}>Valor</Text>
            <BrazilianIntegerInput
              value={valorManual}
              onChangeValue={setValorManual}
              decimalScale={2}
              placeholder="0,00"
              style={[styles.valorInput, { color: corTotal }]}
              accessibilityLabel="Valor do lançamento"
            />
          </>
        ) : (
          <>
            <Text style={styles.valorRotulo}>
              {`Soma de ${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`}
            </Text>
            <Text style={[styles.valorTotal, { color: corTotal }]}>
              {toCurrency(totalLancamento)}
            </Text>
          </>
        )}
      </View>

      {!ehTransferencia ? (
        <>
          <Text style={sharedStyles.label}>Conta</Text>
          <ChipSelector
            opcoes={catalogo.contas.map((conta) => ({
              valor: conta.id,
              rotulo: conta.nome,
            }))}
            selecionado={contaId}
            onSelecionar={setContaId}
            scroll
          />
          {cicloFatura ? (
            <Text style={styles.faturaEtiqueta}>
              {permiteParcelar && parcelado
                ? `1ª parcela cai na fatura de ${formatarData(cicloFatura.dataFechamento)} `
                : `Cai na fatura de ${formatarData(cicloFatura.dataFechamento)} `}
              {`(vence ${formatarData(cicloFatura.dataVencimento)})`}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text style={sharedStyles.label}>De (origem)</Text>
          <ChipSelector
            opcoes={catalogo.contas.map((conta) => ({
              valor: conta.id,
              rotulo: conta.nome,
            }))}
            selecionado={contaId}
            onSelecionar={setContaId}
            scroll
          />
          <Text style={sharedStyles.label}>Para (destino)</Text>
          <ChipSelector
            opcoes={catalogo.contas
              .filter((conta) => conta.id !== contaId)
              .map((conta) => ({
                valor: conta.id,
                rotulo: conta.nome,
              }))}
            selecionado={contaDestinoId}
            onSelecionar={setContaDestinoId}
            scroll
          />
        </>
      )}

      {!ehTransferencia ? (
        <>
          <Text style={sharedStyles.label}>Categoria</Text>
          <SeletorCategoria
            categorias={catalogo.categorias}
            tipo={tipo === 'entrada' ? 'entrada' : 'saida'}
            selecionada={categoriaId}
            onSelecionar={(id): void => {
              setCategoriaId(id);
              setCategoriaManual(id !== null);
            }}
          />
        </>
      ) : null}

      <Text style={sharedStyles.label}>Descrição</Text>
      <TextInput
        value={descricao}
        onChangeText={setDescricao}
        placeholder={itens[0]?.descricao ?? 'Ex.: Mercado'}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />

      <Text style={sharedStyles.label}>Data</Text>
      <View style={styles.dataLinha}>
        <ChipSelector
          opcoes={[
            { valor: 'hoje' as const, rotulo: 'Hoje' },
            { valor: 'ontem' as const, rotulo: 'Ontem' },
          ]}
          selecionado={atalhoData}
          onSelecionar={escolherData}
        />
        <BrazilianDateInput
          key={`data-${dataInputKey}`}
          defaultValue={data}
          onChangeValue={setData}
          placeholder={dayjs().format('DD/MM/YYYY')}
          style={[sharedStyles.input, styles.dataInput]}
        />
      </View>

      {!ehTransferencia ? (
        <>
          <SeletorMultiplo
            label="Empresa"
            opcoes={catalogo.empresas.map((empresa) => ({
              id: empresa.id,
              nome: empresa.nome,
            }))}
            selecionados={empresaId ? [empresaId] : []}
            onToggle={escolherEmpresa}
            placeholderBusca="Buscar empresa"
            textoTrigger="Selecionar empresa"
            textoVazio="Nenhuma empresa cadastrada"
            textoNenhumEncontrado="Nenhuma empresa encontrada"
          />

          <View style={styles.itensCabecalho}>
            <Text style={sharedStyles.label}>Itens</Text>
          </View>

          {itens.length === 0 && !formItemAberto && (
            <Text style={styles.itensDica}>
              Opcional: detalhe os produtos comprados para acompanhar o histórico de preços.
            </Text>
          )}

          {itens.map((item, index) => (
            <LancamentoItemCard
              key={item.localId}
              item={item}
              variante={catalogo.variantes.find((variante) => variante.id === item.varianteId)}
              onEditar={(): void => abrirFormItem(index)}
              onRemover={(): void => removerItem(index)}
            />
          ))}
          {!formItemAberto && (
            <Button
              label="Adicionar item"
              icon="add"
              variant="ghost"
              size="sm"
              onPress={(): void => abrirFormItem(null)}
            />
          )}

          {formItemAberto && (
            <LancamentoItemForm
              key={`item-${itemFormKey}`}
              produtos={catalogo.produtos}
              variantes={catalogo.variantes}
              marcas={catalogo.marcas}
              itemInicial={itemEditIndex !== null ? itens[itemEditIndex] : null}
              onSalvar={salvarItem}
              onCancelar={fecharFormItem}
            />
          )}
        </>
      ) : null}

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
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  valorBloco: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  valorRotulo: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  valorInput: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 40,
    fontWeight: fontWeight.heavy,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 0,
  },
  valorTotal: {
    fontSize: 40,
    fontWeight: fontWeight.heavy,
    letterSpacing: -1,
  },
  dataLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dataInput: {
    flex: 1,
  },
  faturaEtiqueta: {
    fontSize: fontSize.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  itensCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itensDica: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginBottom: spacing.md,
  },
}));
