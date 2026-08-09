import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useColor } from '@/hooks/useColor';

export function AiCallConfirmSheet({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const primary = useColor('primary');
  const indigo = useColor('indigo');
  const text = useColor('text');
  const textMuted = useColor('textMuted');

  return (
    <BottomSheet isVisible={visible} onClose={onCancel} snapPoints={[0.4]}>
      <View style={styles.content}>
        <LinearGradient colors={[primary, indigo]} style={styles.iconCircle}>
          <Ionicons name="sparkles" size={34} color="#fff" />
        </LinearGradient>

        <Text style={[styles.title, { color: text }]}>Start Chat with AI?</Text>
        <Text style={[styles.body, { color: textMuted }]}>
          You&apos;ll have up to 20 minutes with your AI tutor.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onConfirm}
          style={styles.primaryBtn}
        >
          <LinearGradient colors={[primary, indigo]} style={styles.primaryBtnBg}>
            <Text style={styles.primaryBtnText}>Start</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onCancel}
          style={styles.secondaryBtn}
        >
          <Text style={[styles.secondaryBtnText, { color: textMuted }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', paddingTop: 8 },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 21, fontWeight: '700', marginBottom: 10 },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
  },
  primaryBtn: { alignSelf: 'stretch', borderRadius: 16, overflow: 'hidden' },
  primaryBtnBg: {
    flexDirection: 'row',
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryBtn: { paddingVertical: 16, marginTop: 4 },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },
});
