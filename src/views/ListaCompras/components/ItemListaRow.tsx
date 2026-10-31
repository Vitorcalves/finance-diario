import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, type TextInput as RNTextInput, View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import { PressableScale, SwipeableRow, Text } from '../../../components/ui';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { formatarMoeda, toCurrency, toCurrencyPorUnidade } from '../../../utils/format';
import type { ItemNaLista } from '../useListaCompras';

/** Lado do quadrado de marcar. */
export const CAIXA = 26;

/** Diferencas abaixo de meio centavo sao arredondamento. */
const CENTAVO = 0.005;

type ItemListaRowProps = {
  entrada: ItemNaLista;
  /** Mercado em que o usuario esta: o campo de preco anota ali. */
  mercadoAtual: string | null;
  primeiro: boolean;
  ultimo: boolean;
  onAlternar: () => void;
  onEditar: () => void;
  onRemover: () => void;
  onPreco: (preco: number | null) => void;
  /** Registra o campo de preco para o "proximo" do teclado chegar nele. */
  campoRef?: (campo: RNTextInput | null) => void;
  /** Tecla "proximo" do teclado: vai para o preco do item seguinte. */
  onProximo?: () => void;
  /** Abre a escolha da marca vista junto com o preco neste mercado. */
  onEscolherMarca?: () => void;
};

/**
 * Uma linha da lista: caixa do carrinho, o item com os precos dos outros
 * mercados embaixo e, a direita, o campo do preco no mercado atual.
 */
export default function ItemListaRow({
  entrada,
  mercadoAtual,
  primeiro,
  ultimo,
  onAlternar,
  onEditar,
  onRemover,
  onPreco,
  campoRef,
  onProximo,
  onEscolherMarca,
}: ItemListaRowProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  const { item, variante, quantidade, granel, medida, precos, precoAtual, dicaAtual } = entrada;
  const comprado = item.comprado === 1;
  const diferenca = entrada.diferencaAtual;
  const aquiEMenor = diferenca !== null && diferenca <= CENTAVO;

  const detalhe = [
    granel ? quantidade : `${quantidade} un.`,
    variante ?? (item.produto_id ? 'Qualquer marca' : null),
  ]
    .filter(Boolean)
    .join(' · ');

  const outrosPrecos = precos.filter(
    (preco) => preco.empresaId !== mercadoAtual && preco.preco !== null,
  );

  return (
    <SwipeableRow
      style={[styles.linha, primeiro && styles.primeira, ultimo && styles.ultima]}
      acoes={[{ rotulo: 'Excluir', icone: 'trash-outline', tipo: 'danger', onPress: onRemover }]}
    >
      <Pressable
        onPress={onEditar}
        style={styles.conteudo}
        accessibilityRole="button"
        accessibilityHint="Abre o item para editar a quantidade e os preços"
      >
        <PressableScale
          escala={0.85}
          onPress={onAlternar}
          hitSlop={spacing.md}
          style={[styles.caixa, comprado && styles.caixaMarcada]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: comprado }}
          accessibilityLabel={`${comprado ? 'Tirar do carrinho' : 'Pôr no carrinho'}: ${item.descricao}`}
        >
          {comprado && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
        </PressableScale>

        <View style={styles.textos}>
          <Text style={[styles.nome, comprado && styles.nomeComprado]} numberOfLines={2}>
            {item.descricao}
          </Text>
          {detalhe ? (
            <Text style={styles.detalhe} numberOfLines={1}>
              {detalhe}
            </Text>
          ) : null}

          {outrosPrecos.length > 0 && (
            <Text style={styles.outros}>
              {outrosPrecos.map((preco, indice) => (
                <Text key={preco.empresaId}>
                  {indice > 0 ? '  ·  ' : ''}
                  <Text style={preco.menor ? styles.outroMenor : undefined}>
                    {`${preco.nome} ${formatarMoeda(preco.preco ?? 0)}`}
                  </Text>
                </Text>
              ))}
            </Text>
          )}
        </View>

        {mercadoAtual && (
          <View style={styles.colunaPreco}>
            <BrazilianIntegerInput
              ref={campoRef}
              value={precoAtual !== null ? precoAtual.toFixed(2) : ''}
              onChangeValue={(valor): void => onPreco(valor ? Number(valor) : null)}
              decimalScale={2}
              placeholder={dicaAtual !== null ? `últ. ${formatarMoeda(dicaAtual)}` : '0,00'}
              returnKeyType={onProximo ? 'next' : 'done'}
              submitBehavior={onProximo ? 'submit' : 'blurAndSubmit'}
              onSubmitEditing={onProximo}
              accessibilityLabel={`Preço de ${item.descricao}`}
              style={[styles.campo, aquiEMenor && styles.campoMenor]}
            />
            {diferenca !== null && (
              <Text
                style={[styles.legenda, aquiEMenor ? styles.legendaMenor : styles.legendaMaior]}
              >
                {aquiEMenor ? 'menor preço' : `+${toCurrency(diferenca)}`}
              </Text>
            )}
            {entrada.unitarioAtual ? (
              <Text style={styles.unitario}>
                {toCurrencyPorUnidade(entrada.unitarioAtual.valor, entrada.unitarioAtual.sigla)}
              </Text>
            ) : (
              granel && precoAtual !== null && <Text style={styles.legenda}>{`por ${medida}`}</Text>
            )}
            {(entrada.marcaAtual || entrada.escolheMarca) && (
              <Pressable
                onPress={onEscolherMarca}
                hitSlop={spacing.sm}
                accessibilityRole="button"
                accessibilityLabel={`Marca vista aqui: ${entrada.marcaAtual ?? 'não informada'}`}
              >
                <Text
                  style={entrada.marcaAtual ? styles.marca : styles.marcaVazia}
                  numberOfLines={1}
                >
                  {entrada.marcaAtual ?? 'qual marca?'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>
    </SwipeableRow>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    backgroundColor: colors.surface,
  },
  primeira: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  ultima: {
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  caixa: {
    width: CAIXA,
    height: CAIXA,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: {
    borderColor: colors.success,
    backgroundColor: colors.success,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nome: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  nomeComprado: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  detalhe: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  outros: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  outroMenor: {
    color: colors.success,
    fontWeight: fontWeight.bold,
  },
  colunaPreco: {
    width: 100,
    alignItems: 'flex-end',
    gap: 2,
  },
  campo: {
    width: '100%',
    textAlign: 'right',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  campoMenor: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  legenda: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  legendaMenor: {
    color: colors.success,
    fontWeight: fontWeight.bold,
  },
  legendaMaior: {
    color: colors.warning,
    fontWeight: fontWeight.bold,
  },
  marca: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  unitario: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  marcaVazia: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
}));
