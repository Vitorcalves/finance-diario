import { useState } from 'react';
import { View } from 'react-native';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { BottomSheet, Button, Text, TextInput } from '../../../components/ui';
import type { CategoriaLancamento } from '../../../models/categoriasLancamento';
import type { Empresa } from '../../../models/empresas';
import { fontSize, makeStyles, spacing, useTheme } from '../../../theme';
import type { DadosEmpresa } from '../useEmpresas';

type EmpresaFormModalProps = {
  visivel: boolean;
  /** Empresa em edicao; `null` abre o formulario em branco. */
  empresa: Empresa | null;
  /** Todas as categorias de lancamento, para vincular a empresa. */
  categorias: CategoriaLancamento[];
  /** Categorias ja vinculadas a empresa em edicao. Lido so na montagem. */
  categoriaIdsIniciais: string[];
  onFechar: () => void;
  /** Devolve `true` quando a empresa foi salva, o que fecha o painel. */
  onSalvar: (dados: DadosEmpresa, empresa: Empresa | null) => Promise<boolean>;
};

/** Painel de cadastro e edicao de empresa. */
export default function EmpresaFormModal({
  visivel,
  empresa,
  categorias,
  categoriaIdsIniciais,
  onFechar,
  onSalvar,
}: EmpresaFormModalProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const [nome, setNome] = useState(empresa?.nome ?? '');
  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? '');
  const [observacao, setObservacao] = useState(empresa?.observacao ?? '');
  const [categoriaIds, setCategoriaIds] = useState<string[]>(categoriaIdsIniciais);
  const [salvando, setSalvando] = useState(false);

  const alternarCategoria = (id: string): void =>
    setCategoriaIds((atuais) =>
      atuais.includes(id) ? atuais.filter((atual) => atual !== id) : [...atuais, id],
    );

  const salvar = (): void => {
    void (async (): Promise<void> => {
      setSalvando(true);
      const salvou = await onSalvar({ nome, cnpj, observacao, categoriaIds }, empresa);
      setSalvando(false);

      if (salvou) {
        onFechar();
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo={empresa ? 'Editar empresa' : 'Nova empresa'}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button label="Salvar" icon="checkmark" loading={salvando} flex onPress={salvar} />
        </View>
      }
    >
      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Nome da empresa *</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: Mercado Central"
          value={nome}
          onChangeText={setNome}
        />
      </View>

      <SeletorMultiplo
        label="Categorias de lançamento"
        multiplo
        opcoes={categorias.map((categoria) => ({
          id: categoria.id,
          nome: categoria.tipo === 'entrada' ? `${categoria.nome} (entrada)` : categoria.nome,
        }))}
        selecionados={categoriaIds}
        onToggle={alternarCategoria}
        placeholderBusca="Buscar categoria"
        textoTrigger="Vincular categorias"
        textoVazio="Nenhuma categoria cadastrada"
        textoNenhumEncontrado="Nenhuma categoria encontrada"
      />
      <Text style={styles.dica}>
        Opcional: no lançamento, ao escolher uma dessas categorias a lista de empresas mostra só as
        dela. Sem categoria, a empresa aparece em todas.
      </Text>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>CNPJ</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: 00.000.000/0001-00"
          value={cnpj}
          onChangeText={setCnpj}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Observação</Text>
        <TextInput
          style={[sharedStyles.input, sharedStyles.inputMultiline]}
          placeholder="Anotações sobre a empresa"
          value={observacao}
          onChangeText={setObservacao}
          multiline
          numberOfLines={4}
        />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  /** O seletor ja deixa `spacing.lg` embaixo: a dica sobe para ficar junto dele. */
  dica: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
}));
