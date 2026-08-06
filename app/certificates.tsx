import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Award, Download, ShieldCheck, X } from 'lucide-react-native';

import { Spinner } from '@/components/ui/spinner';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import { ApiError } from '@/lib/api/client';
import { getMyCertificates, type Certificate } from '@/lib/api/certificates';
import { useAuth } from '@/providers/auth-provider';
import { BORDER_RADIUS, SPACING } from '@/theme/globals';

export default function CertificatesScreen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const primary = useColor('primary');
  const card = useColor('card');
  const border = useColor('border');
  const green = useColor('green');
  const background = useColor('background');

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selected, setSelected] = useState<Certificate | null>(null);

  const fetchCertificates = useCallback(async () => {
    if (!user?.user_id) return;
    try {
      const data = await getMyCertificates(user.user_id);
      setCertificates(data);
    } catch (err) {
      const description =
        err instanceof ApiError ? err.message : 'Failed to load certificates.';
      toast({ variant: 'error', title: 'Error', description });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.user_id, toast]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchCertificates();
  };

  const handleDownload = async () => {
    if (!selected?.certificate_url) return;
    try {
      await Linking.openURL(selected.certificate_url);
    } catch {
      toast({
        variant: 'error',
        title: 'Error',
        description: 'Unable to open certificate. Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Spinner size='lg' />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <FlatList
        data={certificates}
        keyExtractor={(item, index) => item.id || `certificate-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Image
              source={require('@/assets/images/icons/premium/certificate.png')}
              style={styles.emptyImage}
              resizeMode='contain'
            />
            <Text variant='subtitle' style={styles.emptyTitle}>
              No Certificates Yet
            </Text>
            <Text variant='caption' style={styles.emptyText}>
              Complete courses to earn your certificates.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, { backgroundColor: card, borderColor: border }]}
            onPress={() => setSelected(item)}
          >
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: item.certificate_url }}
                style={styles.certificateImage}
                resizeMode='cover'
              />
              <View style={styles.ribbonBadge}>
                <Award size={18} color='#FFD700' />
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text numberOfLines={1} style={styles.courseName}>
                {item.course_name}
              </Text>
              <View style={styles.verifiedRow}>
                <ShieldCheck size={14} color={green} />
                <Text style={[styles.verifiedText, { color: green }]}>Verified</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Modal
        visible={selected !== null}
        transparent
        animationType='fade'
        onRequestClose={() => setSelected(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selected?.course_name ?? 'Certificate'}
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: 'rgba(16, 185, 129, 0.9)' }]}
                onPress={handleDownload}
              >
                <Download size={20} color='#FFFFFF' />
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}
                onPress={() => setSelected(null)}
              >
                <X size={20} color='#FFFFFF' />
              </Pressable>
            </View>
          </View>

          <View style={styles.modalImageWrapper}>
            {selected && (
              <Image
                source={{ uri: selected.certificate_url }}
                style={styles.modalImage}
                resizeMode='contain'
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: SPACING.md,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.xs,
  },
  emptyImage: {
    width: 180,
    height: 180,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    textAlign: 'center',
    lineHeight: 32
  },
  emptyText: {
    textAlign: 'center',
  },
  card: {
    width: '48%',
    borderRadius: BORDER_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 140,
  },
  certificateImage: {
    width: '100%',
    height: '100%',
  },
  ribbonBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 20,
    padding: 6,
  },
  cardContent: {
    padding: SPACING.sm + 4,
  },
  courseName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 26, 0.92)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 56,
    paddingBottom: SPACING.md,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: SPACING.sm,
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  modalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImageWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  modalImage: {
    width: '100%',
    height: '70%',
  },
});
