import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import type { VoiceOrbVariant } from '@/components/ai-call/VoiceOrb';
import { useColor } from '@/hooks/useColor';

const ORB_COLOR_OPTIONS: { id: VoiceOrbVariant; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Blue', swatch: '#3B82F6' },
  { id: 'violet', label: 'Violet', swatch: '#9333EA' },
  { id: 'emerald', label: 'Emerald', swatch: '#10B981' },
  { id: 'default', label: 'Classic', swatch: '#94A3B8' },
];

export const ORB_MIN_SIZE = 180;
export const ORB_MAX_SIZE = 420;

export function AiCallSettingsSheet({
  visible,
  onClose,
  orbVariant,
  onOrbVariantChange,
  orbSize,
  onOrbSizeChange,
}: {
  visible: boolean;
  onClose: () => void;
  orbVariant: VoiceOrbVariant;
  onOrbVariantChange: (variant: VoiceOrbVariant) => void;
  orbSize: number;
  onOrbSizeChange: (size: number) => void;
}) {
  const text = useColor('text');
  const textMuted = useColor('textMuted');
  const primary = useColor('primary');
  const border = useColor('border');

  return (
    <BottomSheet isVisible={visible} onClose={onClose} snapPoints={[0.48]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: text }]}>Call settings</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: textMuted }]}>Orb color</Text>
        <View style={styles.colorRow}>
          {ORB_COLOR_OPTIONS.map((opt) => {
            const selected = opt.id === orbVariant;
            return (
              <TouchableOpacity
                key={opt.id}
                activeOpacity={0.8}
                onPress={() => onOrbVariantChange(opt.id)}
                style={styles.colorItem}
              >
                <View
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: opt.swatch,
                      borderColor: selected ? opt.swatch : 'transparent',
                    },
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                </View>
                <Text style={[styles.colorLabel, { color: textMuted }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sizeHeader}>
          <Text style={[styles.sectionLabel, { color: textMuted, marginBottom: 0 }]}>
            Orb size
          </Text>
          <Text style={[styles.sizeValue, { color: text }]}>{Math.round(orbSize)}px</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={ORB_MIN_SIZE}
          maximumValue={ORB_MAX_SIZE}
          step={1}
          value={orbSize}
          onValueChange={onOrbSizeChange}
          minimumTrackTintColor={primary}
          maximumTrackTintColor={border}
          thumbTintColor={primary}
        />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorItem: { alignItems: 'center', gap: 6 },
  swatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  colorLabel: { fontSize: 12, fontWeight: '500' },
  sizeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  sizeValue: { fontSize: 13, fontWeight: '600' },
  slider: { width: '100%', height: 40, marginTop: 4 },
});
