import { ActivityIndicator, View } from 'react-native';
import { Button, Text } from '../../../components/ui';
import { type BackupAutomatico, MAX_BACKUPS_AUTOMATICOS } from '../../../models/backupAutomatico';
import { useTheme } from '../../../theme';
import { formatarDataHora } from '../../../utils/format';

type BackupsAutomaticosProps = {
  /** `null` enquanto a pasta e lida. */
  backups: BackupAutomatico[] | null;
  erro: string | null;
  /** Nome do backup sendo lido ou restaurado: mostra o carregando no botao dele. */
  emUso: string | null;
  /** Bloqueia os botoes, ex.: durante uma importacao pelo JSON colado. */
  bloqueado: boolean;
  onRestaurar: (backup: BackupAutomatico) => void;
};

/** Copias da pasta de backups do app (automaticas e manuais), cada uma com o botao de restaurar. */
export default function BackupsAutomaticos({
  backups,
  erro,
  emUso,
  bloqueado,
  onRestaurar,
}: BackupsAutomaticosProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const ocupado = bloqueado || emUso !== null;

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>Backups salvos no app</Text>
      <Text style={sharedStyles.sectionHint}>
        O app faz um antes de cada atualização do banco e antes de recriá-lo, e você pode criar um
        em Exportar. Ficam os {MAX_BACKUPS_AUTOMATICOS} últimos.
      </Text>

      {erro !== null ? (
        <Text style={sharedStyles.inlineEmptyText}>{erro}</Text>
      ) : backups === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : backups.length === 0 ? (
        <Text style={sharedStyles.inlineEmptyText}>Nenhum backup salvo no app ainda.</Text>
      ) : (
        backups.map((backup) => (
          <View key={backup.nome} style={sharedStyles.listCard}>
            <View style={sharedStyles.listCardInfo}>
              <Text style={sharedStyles.listCardTitle}>{formatarDataHora(backup.criadoEm)}</Text>
              <Text style={sharedStyles.listCardDetail}>{backup.descricao}</Text>
            </View>
            <Button
              label="Restaurar"
              variant="secondary"
              size="sm"
              loading={emUso === backup.nome}
              disabled={ocupado && emUso !== backup.nome}
              onPress={(): void => onRestaurar(backup)}
            />
          </View>
        ))
      )}
    </View>
  );
}
