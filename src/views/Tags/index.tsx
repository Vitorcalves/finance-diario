import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { Tag } from '../../models/tags';
import type { MenuStackParamList } from '../../routes/types';
import { makeStyles, spacing, useTheme } from '../../theme';
import TagCard from './components/TagCard';
import TagFormModal from './components/TagFormModal';
import { useTags } from './useTags';

type TagsNavigation = NativeStackNavigationProp<MenuStackParamList, 'Tags'>;

/**
 * Tags de evento ("Viagem julho", "Reforma") com quanto cada evento custou,
 * somando todas as categorias. Tocar na tag abre a busca so com os
 * lancamentos dela, na propria pilha do Menu.
 */
export default function TagsView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<TagsNavigation>();
  const { resumos, loading, salvar, excluir } = useTags();
  const [formAberto, setFormAberto] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce com os dados certos. */
  const [formKey, setFormKey] = useState(0);
  const [editando, setEditando] = useState<Tag | null>(null);

  const abrirForm = (tag: Tag | null): void => {
    setEditando(tag);
    setFormKey((atual) => atual + 1);
    setFormAberto(true);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Tags"
        subtitle="Quanto custou cada evento"
        onBack={(): void => navigation.goBack()}
        onAdd={(): void => abrirForm(null)}
      />

      {loading ? (
        <LoadingState />
      ) : resumos.length === 0 ? (
        <EmptyState
          icon="bookmarks-outline"
          message="Nenhuma tag ainda"
          hint='Crie uma tag como "Viagem julho" ou "Reforma" e marque os lançamentos do evento para ver o total, somando todas as categorias.'
          actionLabel="Criar tag"
          onAction={(): void => abrirForm(null)}
        />
      ) : (
        <ScrollView style={sharedStyles.scrollArea} contentContainerStyle={styles.conteudo}>
          {resumos.map((tag) => (
            <TagCard
              key={tag.id}
              tag={tag}
              onAbrir={(): void => navigation.navigate('BuscaLancamentos', { tagId: tag.id })}
              onEditar={(): void => abrirForm(tag)}
              onExcluir={(): void => excluir(tag)}
            />
          ))}
        </ScrollView>
      )}

      <TagFormModal
        key={formKey}
        visivel={formAberto}
        tag={editando}
        onFechar={(): void => setFormAberto(false)}
        onSalvar={salvar}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(() => ({
  conteudo: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
}));
