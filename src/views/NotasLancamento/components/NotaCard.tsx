import { View } from 'react-native';
import { Button, SwipeableRow, Text } from '../../../components/ui';
import type { NotaLancamento } from '../../../models/notasLancamento';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { formatarDataHora, formatarDiaRelativo, toCurrency } from '../../../utils/format';
import type { CatalogoLancamento } from '../../Home/useCatalogoLancamento';
import type { RascunhoLancamento } from '../../Home/types';

type NotaCardProps = {
  nota: NotaLancamento;
  /** O que o interpretador entendeu da nota, para conferir antes de lancar. */
  rascunho: RascunhoLancamento;
  catalogo: CatalogoLancamento;
  editando: boolean;
  onLancar: () => void;
  onEditar: () => void;
  onExcluir: () => void;
};

/** "R$ 35,00 · Ontem · Nubank · 3x": so o que foi reconhecido. */
const resumoDoRascunho = (rascunho: RascunhoLancamento, catalogo: CatalogoLancamento): string[] => {
  const partes: string[] = [];

  if (rascunho.tipo === 'entrada') partes.push('Entrada');
  if (rascunho.valor !== undefined) partes.push(toCurrency(rascunho.valor));
  if (rascunho.parcelas) partes.push(`${rascunho.parcelas}x`);
  if (rascunho.data) partes.push(formatarDiaRelativo(rascunho.data));

  const conta = catalogo.contas.find((item) => item.id === rascunho.contaId);
  if (conta) partes.push(conta.nome);

  const empresa = catalogo.empresas.find((item) => item.id === rascunho.empresaId);
  if (empresa) partes.push(empresa.nome);

  const categoria = catalogo.categorias.find((item) => item.id === rascunho.categoriaId);
  if (categoria) partes.push(categoria.nome);

  return partes;
};

/** Uma nota da lista: o texto, o que o app entendeu dele e o botao de lancar. */
export default function NotaCard({
  nota,
  rascunho,
  catalogo,
  editando,
  onLancar,
  onEditar,
  onExcluir,
}: NotaCardProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const resumo = resumoDoRascunho(rascunho, catalogo);

  return (
    <SwipeableRow
      style={styles.linha}
      acoes={[
        { rotulo: 'Editar', icone: 'create-outline', tipo: 'info', onPress: onEditar },
        { rotulo: 'Excluir', icone: 'trash-outline', tipo: 'danger', onPress: onExcluir },
      ]}
    >
      <View style={[sharedStyles.card, styles.card, editando && styles.cardEditando]}>
        <Text style={styles.texto}>{nota.texto}</Text>

        {resumo.length > 0 ? (
          <Text style={styles.resumo}>{resumo.join(' · ')}</Text>
        ) : (
          <Text style={styles.semResumo}>Sem valor reconhecido: complete ao lançar.</Text>
        )}

        <View style={styles.rodape}>
          <Text style={styles.data}>
            {editando ? 'Editando acima' : `Anotada em ${formatarDataHora(nota.created_at)}`}
          </Text>
          <Button
            label="Lançar"
            icon="arrow-forward"
            size="sm"
            onPress={onLancar}
            disabled={editando}
          />
        </View>
      </View>
    </SwipeableRow>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    borderRadius: radius.xl,
  },
  card: {
    gap: spacing.xs,
  },
  cardEditando: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  texto: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  resumo: {
    fontSize: fontSize.small,
    color: colors.primary,
  },
  semResumo: {
    fontSize: fontSize.small,
    color: colors.textSubtle,
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  data: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
}));
