import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, PressableScale, Text, TextInput } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { correspondeBusca } from '../../../utils/busca';
import { vibrarSelecao } from '../../../utils/haptics';
import {
  type EmpresaDaNota,
  empresasParecidas,
  formatarCnpj,
  nomeParaCadastro,
  normalizarCnpj,
} from '../../../utils/rascunhoDaNotaFiscal';

/** O que a nota diz da loja; no "Lançar sem os itens" so o CNPJ da chave. */
export type EmitenteDaNota = {
  /** Razao social; vazio quando a pagina da nota nao foi lida. */
  nome: string;
  /** Outro nome que a pagina mostra (pode ser o nome fantasia). */
  outroNome: string | null;
  /** 14 caracteres, da chave de acesso. */
  cnpj: string;
  endereco: string | null;
};

type EmpresaDaNotaSheetProps = {
  emitente: EmitenteDaNota;
  /** Empresas ativas, em ordem alfabetica. */
  empresas: EmpresaDaNota[];
  /** Tocou numa empresa ja cadastrada: ela e a loja da nota. */
  onEscolher: (empresa: EmpresaDaNota) => void;
  /** Cadastra a loja com o nome digitado; devolve o motivo da recusa ou `null`. */
  onCadastrar: (nome: string) => Promise<string | null>;
  /** "Seguir sem empresa", o X ou o voltar: o lancamento abre sem empresa. */
  onSemEmpresa: () => void;
  /** Gravando a escolha: nada mais responde ao toque. */
  ocupado: boolean;
};

const textoDoCnpj = (cnpj: string | null | undefined): string =>
  normalizarCnpj(cnpj) ? `CNPJ ${formatarCnpj(cnpj ?? '')}` : 'Sem CNPJ';

/**
 * Painel aberto quando nenhuma empresa tem o CNPJ da nota (nem outra filial
 * dela). A nota traz a razao social, e a loja costuma estar cadastrada com o
 * nome comercial e sem CNPJ: o usuario aponta qual e (o CNPJ fica gravado nela),
 * cadastra uma nova com o nome que quiser ou segue sem empresa.
 *
 * Sem busca, a lista mostra as parecidas com a nota e as empresas sem CNPJ, as
 * candidatas mais provaveis; as que ja tem CNPJ aparecem ao buscar.
 */
export default function EmpresaDaNotaSheet({
  emitente,
  empresas,
  onEscolher,
  onCadastrar,
  onSemEmpresa,
  ocupado,
}: EmpresaDaNotaSheetProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [busca, setBusca] = useState('');
  const [nome, setNome] = useState(() => nomeParaCadastro(emitente.nome, emitente.cnpj, empresas));
  const [erro, setErro] = useState<string | null>(null);
  const [cadastrando, setCadastrando] = useState(false);

  const parecidas = useMemo(
    () =>
      empresasParecidas(
        [emitente.nome, emitente.outroNome ?? ''].filter((texto) => texto.trim()),
        empresas,
      ),
    [emitente.nome, emitente.outroNome, empresas],
  );

  const termo = busca.trim();

  const lista = useMemo(
    () =>
      termo
        ? empresas.filter((empresa) =>
            correspondeBusca(
              `${empresa.nome} ${empresa.cnpj ?? ''} ${normalizarCnpj(empresa.cnpj)}`,
              termo,
            ),
          )
        : empresas.filter(
            (empresa) => !normalizarCnpj(empresa.cnpj) && !parecidas.includes(empresa),
          ),
    [empresas, parecidas, termo],
  );

  const algumaComCnpj = empresas.some((empresa) => normalizarCnpj(empresa.cnpj));
  const travado = ocupado || cadastrando;

  const cadastrar = async (): Promise<void> => {
    const limpo = nome.trim();

    if (!limpo) {
      setErro('Informe o nome da loja.');
      return;
    }

    setCadastrando(true);
    const recusa = await onCadastrar(limpo);
    setCadastrando(false);

    if (recusa) {
      setErro(recusa);
    }
  };

  const renderEmpresa = (empresa: EmpresaDaNota): React.ReactNode => (
    <PressableScale
      key={empresa.id}
      style={styles.item}
      escala={0.98}
      disabled={travado}
      accessibilityRole="button"
      accessibilityLabel={`Usar ${empresa.nome}`}
      onPress={(): void => {
        vibrarSelecao();
        onEscolher(empresa);
      }}
    >
      <View style={styles.itemIcone}>
        <Ionicons name="storefront-outline" size={iconSize.sm} color={colors.primary} />
      </View>
      <View style={styles.textos}>
        <Text style={styles.itemNome}>{empresa.nome}</Text>
        <Text style={styles.detalhe}>{textoDoCnpj(empresa.cnpj)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textSubtle} />
    </PressableScale>
  );

  return (
    <BottomSheet
      visivel
      onFechar={onSemEmpresa}
      titulo="Empresa da nota"
      subtitulo="Nenhuma empresa cadastrada tem este CNPJ"
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button
            label="Seguir sem empresa"
            variant="secondary"
            flex
            disabled={travado}
            onPress={onSemEmpresa}
          />
        </View>
      }
    >
      <View style={styles.emitente}>
        <Ionicons name="receipt-outline" size={iconSize.md} color={colors.primary} />
        <View style={styles.textos}>
          <Text style={styles.emitenteNome}>{emitente.nome || 'Loja da nota'}</Text>
          {emitente.outroNome ? (
            <Text style={styles.detalhe}>{`Também aparece como ${emitente.outroNome}`}</Text>
          ) : null}
          <Text style={styles.detalhe}>{textoDoCnpj(emitente.cnpj)}</Text>
          {emitente.endereco ? <Text style={styles.detalhe}>{emitente.endereco}</Text> : null}
        </View>
      </View>

      {empresas.length > 0 ? (
        <>
          <Text style={sharedStyles.label}>Já está cadastrada?</Text>
          <Text style={[sharedStyles.sectionHint, styles.dica]}>
            Toque na loja, pelo nome que você usa: o CNPJ fica gravado nela e as próximas notas já
            vêm com a empresa.
          </Text>
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar pelo nome ou CNPJ"
            placeholderTextColor={colors.placeholder}
            style={[sharedStyles.input, sharedStyles.inputSpaced]}
          />

          {!termo && parecidas.length > 0 ? (
            <>
              <Text style={styles.grupo}>Parecidas com a nota</Text>
              {parecidas.map(renderEmpresa)}
            </>
          ) : null}

          {!termo && lista.length > 0 ? <Text style={styles.grupo}>Sem CNPJ</Text> : null}
          {lista.map(renderEmpresa)}

          {termo && lista.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>Nenhuma empresa encontrada</Text>
          ) : null}
          {!termo && algumaComCnpj ? (
            <Text style={[sharedStyles.sectionHint, styles.dica]}>
              As empresas que já têm CNPJ aparecem quando você busca.
            </Text>
          ) : null}
        </>
      ) : null}

      <Text style={[sharedStyles.label, styles.secao]}>
        {empresas.length > 0 ? 'Ou cadastre uma nova' : 'Cadastre a loja'}
      </Text>
      <TextInput
        value={nome}
        onChangeText={(texto): void => {
          setNome(texto);
          setErro(null);
        }}
        placeholder="Nome da loja (ex.: o nome comercial)"
        placeholderTextColor={colors.placeholder}
        editable={!travado}
        style={[sharedStyles.input, sharedStyles.inputSpaced]}
      />
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
      <Button
        label="Cadastrar com o CNPJ da nota"
        icon="add"
        variant="ghost"
        loading={cadastrando}
        disabled={ocupado || !nome.trim()}
        onPress={(): void => {
          void cadastrar();
        }}
      />
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  emitente: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  emitenteNome: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  detalhe: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  dica: {
    marginBottom: spacing.md,
  },
  grupo: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  itemIcone: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemNome: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  secao: {
    marginTop: spacing.lg,
  },
  erro: {
    fontSize: fontSize.caption,
    color: colors.danger,
    marginTop: -spacing.sm,
    marginBottom: spacing.sm,
  },
}));
