import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BookOpen, ChevronRight, FileText } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { useAuth } from '@/providers/auth-provider';
import { getMyStudentBooks, type StudentBook } from '@/lib/api/books';
import { SPACING } from '@/theme/globals';

async function downloadAndShare(url: string, fileName: string) {
  if (Platform.OS === 'web') {
    await Linking.openURL(url);
    return;
  }

  const safeFileName = `${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}.pdf`;
  const file = new File(new Directory(Paths.document), safeFileName);

  if (!file.exists) {
    const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
    if (!downloaded.exists) throw new Error('Download failed');
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
}

function BookRow({ book, index }: { book: StudentBook; index: number }) {
  const card = useColor('card');
  const foreground = useColor('foreground');
  const primary = useColor('primary');
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handlePress = async () => {
    if (!book.url) {
      toast({ variant: 'error', title: 'Unavailable', description: 'This book has no file attached.' });
      return;
    }
    try {
      setDownloading(true);
      await downloadAndShare(book.url, book.title || 'student_book');
    } catch {
      toast({ variant: 'error', title: 'Error', description: 'Failed to download the book. Please try again.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: card, shadowColor: foreground, opacity: pressed ? 0.85 : 1 },
        ]}
        onPress={handlePress}
        disabled={downloading}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${primary}1F` }]}>
          <Icon name={FileText} size={24} color={primary} />
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.title} numberOfLines={2}>
            {book.title}
          </Text>
          <Text variant='caption'>Course Material · PDF</Text>
        </View>

        <View style={[styles.actionWrap, { backgroundColor: `${primary}14` }]}>
          {downloading ? (
            <Spinner size='sm' color={primary} />
          ) : (
            <Icon name={ChevronRight} size={18} color={primary} strokeWidth={2.5} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function StudentBooksScreen() {
  const { user } = useAuth();
  const muted = useColor('textMuted');
  const primary = useColor('primary');
  const [books, setBooks] = useState<StudentBook[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.user_id) return;
    getMyStudentBooks(user.user_id)
      .then(setBooks)
      .catch(() => setBooks([]));
  }, [user?.user_id]);

  const onRefresh = async () => {
    if (!user?.user_id) return;
    setRefreshing(true);
    try {
      setBooks(await getMyStudentBooks(user.user_id));
    } catch {
      setBooks([]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary} />}
    >
      {books === null ? (
        <>
          <Skeleton height={84} variant='rounded' />
          <Skeleton height={84} variant='rounded' />
          <Skeleton height={84} variant='rounded' />
        </>
      ) : books.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
            <Icon name={BookOpen} size={36} color={muted} />
          </View>
          <Text variant='subtitle' style={styles.emptyTitle}>
            No Books Yet
          </Text>
          <Text variant='caption' style={styles.emptyText}>
            Check back later for course materials.
          </Text>
        </View>
      ) : (
        books.map((book, index) => <BookRow key={book.id} book={book} index={index} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  actionWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.12)',
    marginBottom: SPACING.xs,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
