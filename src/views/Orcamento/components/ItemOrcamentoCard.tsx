import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../../components/ui';
import type { HistoricoPreco } from '../../../models/historicoPreco';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { colors, fontSize, fontWeight, iconSize, sharedStyles } from '../../../theme';
import { toCurrency, toCurrencyPorUnidade } from '../../../utils/format';
import type { PrecoPorUnidade } from '../../../utils/variantes';
import type { ItemOrcamento } from '../types';
import HistoricoItemModal from './HistoricoItemModal';

type ItemOrcamentoCardProps = {
  item: ItemOrcamento;
  /** Preco reduzido a unidade primaria; `null` quando a variante nao tem medida cadastrada. */
  unitario: PrecoPorUnidade | null;
  /** Historico de precos do produto do item, do mais recente para o mais antigo. */
  historico: HistoricoPreco[];
  variantes: ProdutoVariantes[];
  rotuloQuantidade: (quantidade: number, varianteId: string) => string;
  rotuloVariante: (varianteId: string) => string;
  nomeEmpresa: (id: string | null) => string;
  onEditar: () => void;
  onRemover: () => void;
};

/** Item ja adicionado ao orcamento. */
export default function ItemOrcamentoCard({
  item,
  unitario,
  historico,
  variantes,
  rotuloQuantidade,
  rotuloVariante,
  nomeEmpresa,
  onEditar,
  onRemover,
}: ItemOrcamentoCardProps): React.ReactNode {
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
        <HistoricoItemModal
          item={item}
          historico={historico}
          variantes={variantes}
          rotuloVariante={rotuloVariante}
          rotuloQuantidade={rotuloQuantidade}
          nomeEmpresa={nomeEmpresa}
          onFechar={(): void => setHistoricoVisivel(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  unitario: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
});
