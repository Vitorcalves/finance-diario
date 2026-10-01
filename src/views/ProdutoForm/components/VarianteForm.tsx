import { useState } from 'react';
import { Alert, View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import ScannerCodigoBarras from '../../../components/ScannerCodigoBarras';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { Button, IconButton, Text, TextInput } from '../../../components/ui';
import type { Marca } from '../../../models/marcas';
import { makeStyles, spacing, useTheme } from '../../../theme';
import { Unidades } from '../../../utils/unidades';
import type { DadosVariante, VarianteFormItem } from '../types';
import NomeSimplesForm from './NomeSimplesForm';
import SeletorUnidade from './SeletorUnidade';

type VarianteFormProps = {
  marcas: Marca[];
  /** Variante em edicao; `null` monta o formulario em branco. */
  varianteInicial: VarianteFormItem | null;
  onSalvar: (dados: DadosVariante) => void;
  onCancelar: () => void;
  /** Cria uma marca nova e devolve o id para ja deixar selecionada. */
  onCriarMarca: (nome: string) => Promise<number | null>;
};

/**
 * Mini formulario de variante.
 *
 * O estado e local e inicializado por `varianteInicial`; a tela troca a `key`
 * do componente para alternar entre edicao e nova variante.
 */
export default function VarianteForm({
  marcas,
  varianteInicial,
  onSalvar,
  onCancelar,
  onCriarMarca,
}: VarianteFormProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [marcaId, setMarcaId] = useState<number | null>(varianteInicial?.marcaId ?? null);
  const [unidadeId, setUnidadeId] = useState<number | null>(varianteInicial?.unidadeId ?? null);
  const [quantidade, setQuantidade] = useState(varianteInicial?.quantidade ?? '');
  const [codigoBarras, setCodigoBarras] = useState(varianteInicial?.codigoBarras ?? '');
  const [preco, setPreco] = useState(varianteInicial?.preco ?? '');
  const [scannerAberto, setScannerAberto] = useState(false);

  const editando = varianteInicial !== null;

  /** Unidade de venda a granel: o preco e por kg/L/m e a quantidade vira opcional. */
  const granel = Unidades.ehGranel(unidadeId);
  const medidaGranel = `${quantidade && quantidade !== '1' ? `${quantidade} ` : ''}${
    Unidades.porId(unidadeId)?.sigla ?? ''
  }`;

  const criarMarca = async (nome: string): Promise<boolean> => {
    const idCriado = await onCriarMarca(nome);

    if (idCriado === null) {
      return false;
    }

    setMarcaId(idCriado);
    return true;
  };

  const salvar = (): void => {
    if (!preco || Number(preco) <= 0) {
      Alert.alert('Erro', 'Preço da variante deve ser maior que zero');
      return;
    }

    onSalvar({ marcaId, unidadeId, quantidade, codigoBarras, preco });
  };

  return (
    <View style={sharedStyles.subForm}>
      <Text style={sharedStyles.subFormTitle}>
        {editando ? 'Editar variante' : 'Nova variante'}
      </Text>

      <SeletorMultiplo
        label="Marca"
        opcoes={marcas.map((marca) => ({ id: String(marca.id), nome: marca.nome }))}
        selecionados={marcaId !== null ? [String(marcaId)] : []}
        onToggle={(id): void => setMarcaId((atual) => (atual === Number(id) ? null : Number(id)))}
        placeholderBusca="Buscar marca"
        textoTrigger="Selecionar marca"
        textoVazio="Nenhuma marca cadastrada"
        textoNenhumEncontrado="Nenhuma marca encontrada"
        add
        textoAdicionar="Nova marca"
        formAdicionar={(fechar): React.ReactNode => (
          <NomeSimplesForm placeholder="Nome da marca" onSalvar={criarMarca} onCancelar={fechar} />
        )}
      />

      <Text style={sharedStyles.label}>Unidade</Text>
      <SeletorUnidade valor={unidadeId} onSelecionar={setUnidadeId} />
      {granel && (
        <Text style={[sharedStyles.sectionHint, sharedStyles.inputSpaced]}>
          {`Venda a granel: o preço é por ${medidaGranel} e, no lançamento, você informa o peso comprado (ex.: 0,750 kg). Deixe a quantidade vazia para preço por ${
            Unidades.porId(unidadeId)?.sigla ?? ''
          }.`}
        </Text>
      )}

      <Text style={sharedStyles.label}>Quantidade</Text>
      <BrazilianIntegerInput
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
        placeholder={granel ? 'Ex: 1 (opcional)' : 'Ex: 500'}
        value={quantidade}
        onChangeValue={setQuantidade}
        decimalScale={0}
        placeholderTextColor={colors.placeholder}
      />

      <Text style={sharedStyles.label}>Código de Barras</Text>
      <View style={styles.codigoRow}>
        <TextInput
          style={[sharedStyles.input, styles.codigoInput]}
          placeholder="Ex: 1234567890"
          value={codigoBarras}
          onChangeText={setCodigoBarras}
          keyboardType="number-pad"
          placeholderTextColor={colors.placeholder}
        />
        <IconButton icon="barcode-outline" onPress={(): void => setScannerAberto(true)} />
      </View>

      <Text style={sharedStyles.label}>{granel ? `Preço por ${medidaGranel} *` : 'Preço *'}</Text>
      <BrazilianIntegerInput
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
        placeholder="Ex: 10,50"
        value={preco}
        onChangeValue={setPreco}
        decimalScale={2}
        placeholderTextColor={colors.placeholder}
      />

      <View style={sharedStyles.actionsRow}>
        {editando && <Button label="Cancelar" variant="secondary" flex onPress={onCancelar} />}
        <Button
          label={editando ? 'Salvar variante' : 'Adicionar variante'}
          icon={editando ? 'checkmark' : 'add'}
          flex
          onPress={salvar}
        />
      </View>

      {scannerAberto && (
        <ScannerCodigoBarras
          onLer={(codigo): void => {
            setCodigoBarras(codigo);
            setScannerAberto(false);
          }}
          onFechar={(): void => setScannerAberto(false)}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  codigoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  codigoInput: {
    flex: 1,
  },
}));
