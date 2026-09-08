import dayjs from 'dayjs';
import { Text, View } from 'react-native';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import type { Empresa } from '../../../models/empresas';
import { colors, sharedStyles } from '../../../theme';

type DadosPesquisaProps = {
  empresas: Empresa[];
  empresaSelecionada: string | null;
  onAlternarEmpresa: (id: string) => void;
  data: string;
  onTrocarData: (data: string) => void;
  /** Muda quando o orcamento e limpo, para recriar o campo de data. */
  dataInputKey: number;
};

/** Mercado e data em que os precos foram pesquisados. */
export default function DadosPesquisa({
  empresas,
  empresaSelecionada,
  onAlternarEmpresa,
  data,
  onTrocarData,
  dataInputKey,
}: DadosPesquisaProps): React.ReactNode {
  return (
    <View style={sharedStyles.card}>
      <SeletorMultiplo
        label="Mercado"
        opcoes={empresas.map((empresa) => ({ id: empresa.id, nome: empresa.nome }))}
        selecionados={empresaSelecionada ? [empresaSelecionada] : []}
        onToggle={onAlternarEmpresa}
        placeholderBusca="Buscar mercado"
        textoTrigger={empresaSelecionada ? 'Trocar mercado' : 'Selecionar mercado'}
        textoVazio="Nenhuma empresa cadastrada"
        textoNenhumEncontrado="Nenhuma empresa encontrada"
      />

      <Text style={sharedStyles.label}>Data da pesquisa (DD/MM/AAAA)</Text>
      <BrazilianDateInput
        key={`data-${dataInputKey}`}
        defaultValue={data}
        onChangeValue={onTrocarData}
        placeholder={dayjs().format('DD/MM/YYYY')}
        placeholderTextColor={colors.placeholder}
        style={sharedStyles.input}
      />
    </View>
  );
}
