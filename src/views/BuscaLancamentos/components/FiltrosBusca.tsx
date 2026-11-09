import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import CategoriaIcone from '../../../components/CategoriaIcone';
import {
  BottomSheet,
  Button,
  OpcoesSheet,
  type OpcaoSheet,
  PressableScale,
  Text,
  TextInput,
} from '../../../components/ui';
import type { CategoriaLancamento } from '../../../models/categoriasLancamento';
import type { Conta } from '../../../models/contas';
import type { Empresa } from '../../../models/empresas';
import type { Tag } from '../../../models/tags';
import { SEM_CATEGORIA } from '../../../models/transacoesModel';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import {
  type Intervalo,
  type PeriodoBusca,
  ROTULO_PERIODO,
  rotuloIntervalo,
} from '../../../utils/periodos';
import type { TipoFiltro } from '../useBuscaLancamentos';

/** Opcao "todas" dos paineis de empresa, categoria, conta e tag. */
const TODAS = '__todas__';

const ROTULO_TIPO: Record<TipoFiltro, string> = {
  todos: 'Saídas e entradas',
  saida: 'Só saídas',
  entrada: 'Só entradas',
};

type Painel =
  'periodo' | 'personalizado' | 'tipo' | 'categoria' | 'empresa' | 'conta' | 'tag' | null;

type FiltrosBuscaProps = {
  termo: string;
  onTermo: (termo: string) => void;
  periodo: PeriodoBusca;
  onPeriodo: (periodo: PeriodoBusca) => void;
  personalizado: Intervalo;
  onPersonalizado: (intervalo: Intervalo) => void;
  tipo: TipoFiltro;
  onTipo: (tipo: TipoFiltro) => void;
  categoriaId: string | null;
  onCategoria: (id: string | null) => void;
  empresaId: string | null;
  onEmpresa: (id: string | null) => void;
  contaId: string | null;
  onConta: (id: string | null) => void;
  tagId: string | null;
  onTag: (id: string | null) => void;
  categorias: CategoriaLancamento[];
  empresas: Empresa[];
  contas: Conta[];
  tags: Tag[];
  filtrosAtivos: boolean;
  onLimpar: () => void;
};

/** Campo de busca e a fileira de filtros; cada filtro abre um painel com as opcoes. */
export default function FiltrosBusca({
  termo,
  onTermo,
  periodo,
  onPeriodo,
  personalizado,
  onPersonalizado,
  tipo,
  onTipo,
  categoriaId,
  onCategoria,
  empresaId,
  onEmpresa,
  contaId,
  onConta,
  tagId,
  onTag,
  categorias,
  empresas,
  contas,
  tags,
  filtrosAtivos,
  onLimpar,
}: FiltrosBuscaProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const [painel, setPainel] = useState<Painel>(null);
  /** Datas digitadas no painel personalizado, aplicadas so ao confirmar. */
  const [rascunhoInicio, setRascunhoInicio] = useState(personalizado.inicio ?? '');
  const [rascunhoFim, setRascunhoFim] = useState(personalizado.fim ?? '');

  const fechar = (): void => setPainel(null);

  const rotuloPeriodo =
    periodo === 'personalizado' && (personalizado.inicio || personalizado.fim)
      ? rotuloIntervalo(personalizado)
      : ROTULO_PERIODO[periodo];

  const categoria = categorias.find((item) => item.id === categoriaId);
  const rotuloCategoria =
    categoriaId === SEM_CATEGORIA ? 'Sem categoria' : (categoria?.nome ?? 'Categoria');
  const rotuloEmpresa = empresas.find((item) => item.id === empresaId)?.nome ?? 'Empresa';
  const rotuloConta = contas.find((item) => item.id === contaId)?.nome ?? 'Conta';
  const rotuloTag = tags.find((item) => item.id === tagId)?.nome ?? 'Tag';

  const opcoesPeriodo: OpcaoSheet<PeriodoBusca>[] = (
    Object.keys(ROTULO_PERIODO) as PeriodoBusca[]
  ).map((valor) => ({ valor, rotulo: ROTULO_PERIODO[valor] }));

  const opcoesTipo: OpcaoSheet<TipoFiltro>[] = (Object.keys(ROTULO_TIPO) as TipoFiltro[]).map(
    (valor) => ({ valor, rotulo: ROTULO_TIPO[valor] }),
  );

  const opcoesCategoria: OpcaoSheet<string>[] = [
    { valor: TODAS, rotulo: 'Todas as categorias' },
    ...categorias.map((item) => ({
      valor: item.id,
      rotulo: item.nome,
      descricao: item.tipo === 'entrada' ? 'Entrada' : undefined,
      icone: <CategoriaIcone icone={item.icone} cor={item.cor} tamanho={32} />,
    })),
    { valor: SEM_CATEGORIA, rotulo: 'Sem categoria', icone: <CategoriaIcone tamanho={32} /> },
  ];

  const opcoesEmpresa: OpcaoSheet<string>[] = [
    { valor: TODAS, rotulo: 'Todas as empresas' },
    ...empresas.map((item) => ({ valor: item.id, rotulo: item.nome })),
  ];

  const opcoesConta: OpcaoSheet<string>[] = [
    { valor: TODAS, rotulo: 'Todas as contas' },
    ...contas.map((item) => ({ valor: item.id, rotulo: item.nome })),
  ];

  const opcoesTag: OpcaoSheet<string>[] = [
    { valor: TODAS, rotulo: 'Todas as tags' },
    ...tags.map((item) => ({
      valor: item.id,
      rotulo: item.nome,
      descricao: item.descricao || undefined,
    })),
  ];

  const pilula = (
    rotulo: string,
    ativo: boolean,
    alvo: Exclude<Painel, null>,
    icone: React.ComponentProps<typeof Ionicons>['name'],
  ): React.ReactNode => (
    <PressableScale
      key={alvo}
      escala={0.95}
      style={[styles.pilula, ativo && styles.pilulaAtiva]}
      onPress={(): void => setPainel(alvo)}
      accessibilityRole="button"
      accessibilityLabel={`Filtro: ${rotulo}`}
    >
      <Ionicons name={icone} size={14} color={ativo ? colors.onPrimary : colors.textMuted} />
      <Text style={[styles.pilulaTexto, ativo && styles.pilulaTextoAtivo]} numberOfLines={1}>
        {rotulo}
      </Text>
      <Ionicons name="chevron-down" size={14} color={ativo ? colors.onPrimary : colors.textMuted} />
    </PressableScale>
  );

  return (
    <View style={styles.container}>
      <View style={styles.busca}>
        <Ionicons name="search" size={iconSize.sm} color={colors.textSubtle} />
        <TextInput
          style={styles.buscaInput}
          placeholder="Buscar por descrição, item ou empresa"
          value={termo}
          onChangeText={onTermo}
          returnKeyType="search"
          autoCorrect={false}
        />
        {termo.length > 0 && (
          <Pressable
            onPress={(): void => onTermo('')}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Limpar busca"
          >
            <Ionicons name="close-circle" size={iconSize.sm} color={colors.textSubtle} />
          </Pressable>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.pilulas}
      >
        {pilula(rotuloPeriodo, periodo !== 'tudo', 'periodo', 'calendar-outline')}
        {pilula(ROTULO_TIPO[tipo], tipo !== 'todos', 'tipo', 'swap-vertical-outline')}
        {pilula(rotuloCategoria, categoriaId !== null, 'categoria', 'pricetag-outline')}
        {pilula(rotuloEmpresa, empresaId !== null, 'empresa', 'storefront-outline')}
        {pilula(rotuloConta, contaId !== null, 'conta', 'wallet-outline')}
        {(tags.length > 0 || tagId !== null) &&
          pilula(rotuloTag, tagId !== null, 'tag', 'bookmark-outline')}
        {filtrosAtivos && (
          <Pressable
            onPress={onLimpar}
            hitSlop={spacing.sm}
            style={styles.limpar}
            accessibilityRole="button"
          >
            <Text style={styles.limparTexto}>Limpar</Text>
          </Pressable>
        )}
      </ScrollView>

      <OpcoesSheet
        visivel={painel === 'periodo'}
        titulo="Período"
        opcoes={opcoesPeriodo}
        selecionado={periodo}
        onSelecionar={(valor): void => {
          if (valor === 'personalizado') {
            // O painel de datas abre depois que este terminar de fechar.
            setTimeout(() => setPainel('personalizado'), 300);
            return;
          }

          onPeriodo(valor);
        }}
        onFechar={fechar}
      />

      <BottomSheet
        visivel={painel === 'personalizado'}
        onFechar={fechar}
        titulo="Período personalizado"
        rodape={
          <View style={styles.acoes}>
            <Button label="Cancelar" variant="secondary" flex onPress={fechar} />
            <Button
              label="Aplicar"
              icon="checkmark"
              flex
              onPress={(): void => {
                onPersonalizado({ inicio: rascunhoInicio || null, fim: rascunhoFim || null });
                onPeriodo('personalizado');
                fechar();
              }}
            />
          </View>
        }
      >
        <Text style={styles.rotuloCampo}>De</Text>
        <BrazilianDateInput
          defaultValue={rascunhoInicio}
          onChangeValue={setRascunhoInicio}
          placeholder={dayjs().startOf('month').format('DD/MM/YYYY')}
          style={styles.campoData}
        />
        <Text style={styles.rotuloCampo}>Até</Text>
        <BrazilianDateInput
          defaultValue={rascunhoFim}
          onChangeValue={setRascunhoFim}
          placeholder={dayjs().format('DD/MM/YYYY')}
          style={styles.campoData}
        />
        <Text style={styles.dica}>Deixe um dos campos vazio para não limitar aquele lado.</Text>
      </BottomSheet>

      <OpcoesSheet
        visivel={painel === 'tipo'}
        titulo="Tipo"
        opcoes={opcoesTipo}
        selecionado={tipo}
        onSelecionar={onTipo}
        onFechar={fechar}
      />

      <OpcoesSheet
        visivel={painel === 'categoria'}
        titulo="Categoria"
        opcoes={opcoesCategoria}
        selecionado={categoriaId ?? TODAS}
        onSelecionar={(valor): void => onCategoria(valor === TODAS ? null : valor)}
        onFechar={fechar}
      />

      <OpcoesSheet
        visivel={painel === 'empresa'}
        titulo="Empresa"
        opcoes={opcoesEmpresa}
        selecionado={empresaId ?? TODAS}
        onSelecionar={(valor): void => onEmpresa(valor === TODAS ? null : valor)}
        onFechar={fechar}
      />

      <OpcoesSheet
        visivel={painel === 'conta'}
        titulo="Conta"
        opcoes={opcoesConta}
        selecionado={contaId ?? TODAS}
        onSelecionar={(valor): void => onConta(valor === TODAS ? null : valor)}
        onFechar={fechar}
      />

      <OpcoesSheet
        visivel={painel === 'tag'}
        titulo="Tag"
        opcoes={opcoesTag}
        selecionado={tagId ?? TODAS}
        onSelecionar={(valor): void => onTag(valor === TODAS ? null : valor)}
        onFechar={fechar}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  buscaInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
  },
  pilulas: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    maxWidth: 220,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pilulaAtiva: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pilulaTexto: {
    flexShrink: 1,
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  pilulaTextoAtivo: {
    color: colors.onPrimary,
    fontWeight: fontWeight.bold,
  },
  limpar: {
    paddingHorizontal: spacing.sm,
  },
  limparTexto: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  rotuloCampo: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  campoData: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.input,
    backgroundColor: colors.surfaceMuted,
    marginBottom: spacing.md,
  },
  dica: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginBottom: spacing.sm,
  },
  acoes: {
    flexDirection: 'row',
    gap: spacing.md,
  },
}));
