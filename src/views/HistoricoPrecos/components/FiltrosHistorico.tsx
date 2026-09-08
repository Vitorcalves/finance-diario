import { Text, View } from 'react-native';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { ChipSelector } from '../../../components/ui';
import type { Produto } from '../../../models/produtos';
import { sharedStyles } from '../../../theme';
import type { Agrupamento, Ordenacao } from '../types';

const OPCOES_AGRUPAMENTO: { valor: Agrupamento; rotulo: string }[] = [
  { valor: 'variante', rotulo: 'Variante' },
  { valor: 'produto', rotulo: 'Produto' },
];

const OPCOES_ORDENACAO: { valor: Ordenacao; rotulo: string }[] = [
  { valor: 'menorPreco', rotulo: 'Menor preco atual' },
  { valor: 'recente', rotulo: 'Mais recente' },
  { valor: 'nome', rotulo: 'Nome' },
];

type FiltrosHistoricoProps = {
  produtos: Produto[];
  produtoFiltro: string | null;
  onAlternarProduto: (id: string) => void;
  agrupamento: Agrupamento;
  onTrocarAgrupamento: (valor: Agrupamento) => void;
  ordenacao: Ordenacao;
  onTrocarOrdenacao: (valor: Ordenacao) => void;
};

/** Cartao de filtros: produto, agrupamento e ordenacao. */
export default function FiltrosHistorico({
  produtos,
  produtoFiltro,
  onAlternarProduto,
  agrupamento,
  onTrocarAgrupamento,
  ordenacao,
  onTrocarOrdenacao,
}: FiltrosHistoricoProps): React.ReactNode {
  return (
    <View style={sharedStyles.card}>
      <SeletorMultiplo
        label="Produto"
        opcoes={produtos.map((produto) => ({ id: produto.id, nome: produto.nome }))}
        selecionados={produtoFiltro ? [produtoFiltro] : []}
        onToggle={onAlternarProduto}
        placeholderBusca="Buscar produto"
        textoTrigger={produtoFiltro ? 'Trocar produto' : 'Todos os produtos'}
        textoVazio="Nenhum produto cadastrado"
        textoNenhumEncontrado="Nenhum produto encontrado"
      />

      <Text style={sharedStyles.label}>Comparar por</Text>
      <ChipSelector
        opcoes={OPCOES_AGRUPAMENTO}
        selecionado={agrupamento}
        onSelecionar={onTrocarAgrupamento}
      />

      <Text style={sharedStyles.label}>Ordenar por</Text>
      <ChipSelector
        opcoes={OPCOES_ORDENACAO}
        selecionado={ordenacao}
        onSelecionar={onTrocarOrdenacao}
      />
    </View>
  );
}
