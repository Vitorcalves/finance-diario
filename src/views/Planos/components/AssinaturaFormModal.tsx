import { useState } from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import SeletorCategoria from '../../../components/SeletorCategoria';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { BottomSheet, Button, ChipSelector, Text, TextInput } from '../../../components/ui';
import type { CategoriaLancamento } from '../../../models/categoriasLancamento';
import type { Conta } from '../../../models/contas';
import type { Empresa } from '../../../models/empresas';
import { useTheme } from '../../../theme';
import { type FrequenciaPlano, ROTULO_FREQUENCIA } from '../../../utils/parcelas';
import type { DadosFormularioAssinatura } from '../types';

const FREQUENCIAS: FrequenciaPlano[] = ['semanal', 'mensal', 'anual'];

/** Categoria sugerida para toda assinatura nova (criada pela migracao 008). */
const CATEGORIA_PADRAO = 'assinaturas';

type AssinaturaFormModalProps = {
  visivel: boolean;
  empresas: Empresa[];
  categorias: CategoriaLancamento[];
  /** Contas caixa e cartoes ativas: quem paga a cobranca (ou recebe o salario). */
  contas: Conta[];
  salvando: boolean;
  onFechar: () => void;
  /** Devolve `true` quando a assinatura foi criada, o que fecha o painel. */
  onSalvar: (dados: DadosFormularioAssinatura) => Promise<boolean>;
};

/** Cadastro de uma assinatura: valor, ritmo e data da primeira cobranca. */
export default function AssinaturaFormModal({
  visivel,
  empresas,
  categorias,
  contas,
  salvando,
  onFechar,
  onSalvar,
}: AssinaturaFormModalProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const [descricao, setDescricao] = useState('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [valor, setValor] = useState('');
  const [dataInicio, setDataInicio] = useState(dayjs().format('YYYY-MM-DD'));
  const [dataInputKey, setDataInputKey] = useState(0);
  const [frequencia, setFrequencia] = useState<FrequenciaPlano>('mensal');
  const [categoriaId, setCategoriaId] = useState<string | null>(CATEGORIA_PADRAO);
  const [contaId, setContaId] = useState<string | null>(null);
  /** Salario (entrada programada): o valor entra no caixa escolhido todo mes. */
  const [modo, setModo] = useState<'gasto' | 'salario'>('gasto');

  const ehSalario = modo === 'salario';
  const caixas = contas.filter((conta) => conta.tipo === 'caixa');

  const limpar = (): void => {
    setDescricao('');
    setEmpresaId(null);
    setValor('');
    setDataInicio(dayjs().format('YYYY-MM-DD'));
    setDataInputKey((atual) => atual + 1);
    setFrequencia('mensal');
    setCategoriaId(CATEGORIA_PADRAO);
    setContaId(null);
    setModo('gasto');
  };

  const salvar = (): void => {
    if (ehSalario && !contaId) {
      return;
    }

    void (async (): Promise<void> => {
      const salvou = await onSalvar({
        descricao:
          descricao.trim() ||
          (ehSalario
            ? `Salário — ${caixas.find((conta) => conta.id === contaId)?.nome ?? 'caixa'}`
            : ''),
        // Salario e renda: sem empresa; categoria opcional de entrada.
        empresaId: ehSalario ? null : empresaId,
        // A padrao pode ter sido excluida pelo usuario ou nao servir para entrada.
        categoriaId: categorias.some((categoria) => categoria.id === categoriaId)
          ? categoriaId
          : null,
        valor: Number(valor) || 0,
        dataInicio,
        frequencia,
        intervalo: 1,
        contaId,
        contaDestinoId: ehSalario && caixas.some((conta) => conta.id === contaId) ? contaId : null,
      });

      if (salvou) {
        limpar();
        onFechar();
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo="Nova assinatura"
      subtitulo="Streaming, academia, plano do celular..."
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button
            label="Salvar assinatura"
            icon="checkmark"
            loading={salvando}
            flex
            onPress={salvar}
          />
        </View>
      }
    >
      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Descrição *</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: Streaming"
          value={descricao}
          onChangeText={setDescricao}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Valor da cobrança (R$) *</Text>
        <BrazilianIntegerInput
          value={valor}
          onChangeValue={setValor}
          decimalScale={2}
          placeholder="Ex.: 39,90"
          style={sharedStyles.input}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Tipo</Text>
        <ChipSelector
          opcoes={[
            { valor: 'gasto' as const, rotulo: 'Cobrança' },
            { valor: 'salario' as const, rotulo: 'Salário (entrada)' },
          ]}
          selecionado={modo}
          onSelecionar={(valor): void => {
            setModo(valor);
            setContaId(null);
            // A categoria padrao e de saida; entrada comeca sem categoria.
            setCategoriaId(valor === 'salario' ? null : CATEGORIA_PADRAO);
          }}
        />
        {ehSalario ? (
          <Text style={sharedStyles.sectionHint}>
            O valor entra no saldo do caixa todo mês, sem origem: é renda, não gasto.
          </Text>
        ) : null}
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Categoria</Text>
        <SeletorCategoria
          categorias={categorias}
          tipo={ehSalario ? 'entrada' : 'saida'}
          selecionada={categoriaId}
          onSelecionar={setCategoriaId}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>{ehSalario ? 'Para caixa' : 'Conta'}</Text>
        <ChipSelector
          opcoes={(ehSalario ? caixas : contas).map((conta) => ({
            valor: conta.id,
            rotulo: conta.nome,
          }))}
          selecionado={contaId}
          onSelecionar={setContaId}
          scroll
        />
        {ehSalario ? null : (
          <Text style={sharedStyles.sectionHint}>
            Sem escolha, a cobrança cai na caixa padrão. No cartão, cada cobrança entra na fatura do
            ciclo.
          </Text>
        )}
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Frequência</Text>
        <ChipSelector
          opcoes={FREQUENCIAS.map((opcao) => ({
            valor: opcao,
            rotulo: ROTULO_FREQUENCIA[opcao],
          }))}
          selecionado={frequencia}
          onSelecionar={setFrequencia}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>1ª cobrança *</Text>
        <BrazilianDateInput
          key={`inicio-${dataInputKey}`}
          defaultValue={dataInicio}
          onChangeValue={setDataInicio}
          placeholder={dayjs().format('DD/MM/YYYY')}
          style={sharedStyles.input}
        />
        <Text style={sharedStyles.sectionHint}>
          O dia desta data vira o dia da cobrança em todos os meses seguintes.
        </Text>
      </View>

      {ehSalario ? null : (
        <SeletorMultiplo
          label="Empresa"
          opcoes={empresas.map((empresa) => ({ id: empresa.id, nome: empresa.nome }))}
          selecionados={empresaId ? [empresaId] : []}
          onToggle={(id): void => setEmpresaId((atual) => (atual === id ? null : id))}
          placeholderBusca="Buscar empresa"
          textoTrigger="Selecionar empresa"
          textoVazio="Nenhuma empresa cadastrada"
          textoNenhumEncontrado="Nenhuma empresa encontrada"
        />
      )}
    </BottomSheet>
  );
}
