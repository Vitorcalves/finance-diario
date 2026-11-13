import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChipSelector,
  type ChipOpcao,
  EmptyState,
  LoadingState,
  ScreenHeader,
  TextInput,
} from '../../components/ui';
import type { CategoriaLancamento } from '../../models/categoriasLancamento';
import type { Empresa } from '../../models/empresas';
import { fontSize, iconSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { correspondeBusca } from '../../utils/busca';
import EmpresaCard from './components/EmpresaCard';
import EmpresaFormModal from './components/EmpresaFormModal';
import { useEmpresas } from './useEmpresas';

/** Filtros que nao sao uma categoria; os outros valores sao o id da categoria. */
const TODAS = '__todas__';
const SEM_CATEGORIA = '__sem_categoria__';

/** Cadastro de empresas (mercados) usadas nos lancamentos. */
export default function EmpresasView(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const { empresas, categorias, categoriasPorEmpresa, loading, salvar, deletar } = useEmpresas();
  const [showForm, setShowForm] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce limpo. */
  const [formKey, setFormKey] = useState(0);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string>(TODAS);

  const termo = busca.trim();

  const abrirFormulario = (empresa: Empresa | null): void => {
    setEmpresaEditando(empresa);
    setFormKey((atual) => atual + 1);
    setShowForm(true);
  };

  const categoriaPorId = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias],
  );

  const categoriasDaEmpresa = (empresaId: string): CategoriaLancamento[] =>
    (categoriasPorEmpresa.get(empresaId) ?? []).flatMap((id) => {
      const categoria = categoriaPorId.get(id);
      return categoria ? [categoria] : [];
    });

  /** So as categorias que tem empresa; sem nenhum vinculo, nao ha o que filtrar. */
  const opcoesFiltro = useMemo((): ChipOpcao<string>[] => {
    const comCategoria = empresas.filter((empresa) => categoriasPorEmpresa.has(empresa.id)).length;

    if (comCategoria === 0) {
      return [];
    }

    const porCategoria = categorias
      .map((categoria) => ({
        valor: categoria.id,
        rotulo: categoria.nome,
        contador: empresas.filter((empresa) =>
          categoriasPorEmpresa.get(empresa.id)?.includes(categoria.id),
        ).length,
      }))
      .filter((opcao) => opcao.contador > 0);

    const semCategoria = empresas.length - comCategoria;

    return [
      { valor: TODAS, rotulo: 'Todas', contador: empresas.length },
      ...porCategoria,
      ...(semCategoria > 0
        ? [{ valor: SEM_CATEGORIA, rotulo: 'Sem categoria', contador: semCategoria }]
        : []),
    ];
  }, [empresas, categorias, categoriasPorEmpresa]);

  // A categoria filtrada some quando a ultima empresa dela e desvinculada.
  const filtroAtivo = opcoesFiltro.some((opcao) => opcao.valor === filtro) ? filtro : TODAS;

  /** Ja vem em ordem alfabetica do model; aqui so filtra. */
  const empresasFiltradas = useMemo(
    () =>
      empresas.filter((empresa) => {
        const ids = categoriasPorEmpresa.get(empresa.id) ?? [];

        if (filtroAtivo === SEM_CATEGORIA && ids.length > 0) {
          return false;
        }

        if (filtroAtivo !== TODAS && filtroAtivo !== SEM_CATEGORIA && !ids.includes(filtroAtivo)) {
          return false;
        }

        // O CNPJ entra tambem so com os digitos: "12345" acha "12.345.678/0001-00".
        const cnpj = empresa.cnpj ?? '';
        return correspondeBusca(`${empresa.nome} ${cnpj} ${cnpj.replace(/\D/g, '')}`, termo);
      }),
    [empresas, categoriasPorEmpresa, filtroAtivo, termo],
  );

  const renderConteudo = (): React.ReactNode => {
    if (loading) {
      return <LoadingState />;
    }

    if (empresas.length === 0) {
      return (
        <EmptyState
          icon="business-outline"
          message="Nenhuma empresa cadastrada"
          actionLabel="Adicionar Empresa"
          onAction={(): void => abrirFormulario(null)}
        />
      );
    }

    if (empresasFiltradas.length === 0) {
      return (
        <EmptyState
          icon="search"
          message={
            termo ? `Nenhuma empresa encontrada para "${termo}"` : 'Nenhuma empresa neste filtro'
          }
        />
      );
    }

    return (
      <ScrollView
        style={sharedStyles.scrollArea}
        contentContainerStyle={sharedStyles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {empresasFiltradas.map((empresa) => (
          <EmpresaCard
            key={empresa.id}
            empresa={empresa}
            categorias={categoriasDaEmpresa(empresa.id)}
            onEditar={(): void => abrirFormulario(empresa)}
            onDeletar={(): void => deletar(empresa)}
          />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Empresas"
        subtitle={
          empresas.length > 0
            ? `${empresas.length} ${empresas.length === 1 ? 'empresa' : 'empresas'}`
            : undefined
        }
        onAdd={(): void => abrirFormulario(null)}
      />

      {!loading && empresas.length > 0 && (
        <View style={styles.filtros}>
          <View style={styles.buscaContainer}>
            <Ionicons name="search" size={iconSize.sm} color={colors.textSubtle} />
            <TextInput
              style={styles.buscaInput}
              placeholder="Buscar empresa por nome ou CNPJ"
              value={busca}
              onChangeText={setBusca}
              returnKeyType="search"
              autoCorrect={false}
            />
            {busca.length > 0 && (
              <Pressable
                onPress={(): void => setBusca('')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Limpar busca"
              >
                <Ionicons name="close-circle" size={iconSize.sm} color={colors.textSubtle} />
              </Pressable>
            )}
          </View>

          {opcoesFiltro.length > 0 && (
            <ChipSelector
              opcoes={opcoesFiltro}
              selecionado={filtroAtivo}
              onSelecionar={setFiltro}
              scroll
            />
          )}
        </View>
      )}

      {renderConteudo()}

      <EmpresaFormModal
        key={formKey}
        visivel={showForm}
        empresa={empresaEditando}
        categorias={categorias}
        categoriaIdsIniciais={
          empresaEditando ? (categoriasPorEmpresa.get(empresaEditando.id) ?? []) : []
        }
        onFechar={(): void => setShowForm(false)}
        onSalvar={salvar}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  filtros: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  buscaContainer: {
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
}));
