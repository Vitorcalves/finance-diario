import { View } from 'react-native';
import CategoriaIcone from '../../../components/CategoriaIcone';
import { IconButton, Text } from '../../../components/ui';
import type { CategoriaLancamento } from '../../../models/categoriasLancamento';
import type { Empresa } from '../../../models/empresas';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';

type EmpresaCardProps = {
  empresa: Empresa;
  /** Categorias de lancamento vinculadas a empresa. */
  categorias: CategoriaLancamento[];
  onEditar: () => void;
  onDeletar: () => void;
};

/** Linha da lista de empresas. */
export default function EmpresaCard({
  empresa,
  categorias,
  onEditar,
  onDeletar,
}: EmpresaCardProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();

  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{empresa.nome}</Text>
        {empresa.cnpj ? (
          <Text style={sharedStyles.listCardDetail}>CNPJ: {empresa.cnpj}</Text>
        ) : null}
        {empresa.observacao ? (
          <Text style={sharedStyles.listCardDetail}>Obs: {empresa.observacao}</Text>
        ) : null}
        {categorias.length > 0 ? (
          <View style={styles.categorias}>
            {categorias.map((categoria) => (
              <View key={categoria.id} style={styles.categoria}>
                <CategoriaIcone icone={categoria.icone} cor={categoria.cor} tamanho={22} />
                <Text style={styles.categoriaTexto}>{categoria.nome}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton icon="pencil" variant="primary" onPress={onEditar} />
        <IconButton icon="trash" variant="danger" onPress={onDeletar} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  categorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  categoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 2,
    paddingLeft: 2,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  categoriaTexto: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
}));
