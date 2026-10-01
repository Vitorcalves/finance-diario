import { useState } from 'react';
import { View } from 'react-native';
import HistoricoProdutoModal from '../../../components/HistoricoProdutoModal';
import { IconButton, Text } from '../../../components/ui';
import type { Marca } from '../../../models/marcas';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { fontSize, fontWeight, iconSize, makeStyles, useTheme } from '../../../theme';
import { toCurrency, toCurrencyPorUnidade } from '../../../utils/format';
import type { PrecoPorUnidade } from '../../../utils/variantes';
import type { ItemOrcamento } from '../types';

type ItemOrcamentoCardProps = {
  item: ItemOrcamento;
  /** Preco reduzido a unidade primaria; `null` quando a variante nao tem medida cadastrada. */
  unitario: PrecoPorUnidade | null;
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  rotuloQuantidade: (quantidade: number, varianteId: string) => string;
  onEditar: () => void;
  onRemover: () => void;
};

/** Item ja adicionado ao orcamento. */
export default function ItemOrcamentoCard({
  item,
  unitario,
  variantes,
  marcas,
  rotuloQuantidade,
  onEditar,
  onRemover,
}: ItemOrcamentoCardProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const [historicoVisivel, setHistoricoVisivel] = useState(false);

  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{item.descricao}</Text>
        <Text style={sharedStyles.listCardDetail}>
          {`${rotuloQuantidade(item.quantidade, item.varianteId)} x ${toCurrency(
            item.preco,
          )} = ${toCurrency(item.quantidade * item.preco)}`}
        </Text>
        {unitario && (
          <Text style={styles.unitario}>
            {toCurrencyPorUnidade(unitario.valor, unitario.sigla)}
          </Text>
        )}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton
          icon="eye"
          variant="info"
          size={iconSize.sm}
          onPress={(): void => setHistoricoVisivel(true)}
        />
        <IconButton icon="pencil" variant="primary" size={iconSize.sm} onPress={onEditar} />
        <IconButton icon="trash" variant="danger" size={iconSize.sm} onPress={onRemover} />
      </View>

      {historicoVisivel && (
        <HistoricoProdutoModal
          produtoId={item.produtoId}
          subtitulo={item.descricao}
          varianteId={item.varianteId}
          variantes={variantes}
          marcas={marcas}
          onFechar={(): void => setHistoricoVisivel(false)}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  unitario: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
}));
