/**
 * VoiceOrb.web.tsx — Web fallback for <VoiceOrb />
 *
 * Renders a lightweight, high-performance gradient orb on Web without
 * relying on Skia WASM, avoiding the `Skia.RuntimeEffect` crash on Web.
 */

import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type VoiceOrbState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'muted';

export type VoiceOrbVariant = 'default' | 'blue' | 'violet' | 'emerald';

export type VoiceOrbProps = {
  /** Voice session state. Drives the orb's appearance. */
  state?: VoiceOrbState;
  /** Color palette. */
  variant?: VoiceOrbVariant;
  /** Orb canvas size (px). */
  size?: number;
  /** Realtime mic / playback volume 0..1. */
  volume?: number;
  /** Optional wrapper style. */
  style?: ViewStyle;
};

const VARIANT_HEX: Record<VoiceOrbVariant, { outer: string; mid: string; inner: string; glow: string }> = {
  default: { outer: '#4a4a55', mid: '#8c8c99', inner: '#b3b3bf', glow: 'rgba(140, 140, 153, 0.4)' },
  blue: { outer: '#0d3cb3', mid: '#1055f8', inner: '#60a5fa', glow: 'rgba(16, 85, 248, 0.45)' },
  violet: { outer: '#581c87', mid: '#7c3aed', inner: '#c084fc', glow: 'rgba(124, 58, 237, 0.45)' },
  emerald: { outer: '#064e3b', mid: '#059669', inner: '#34d399', glow: 'rgba(5, 150, 105, 0.45)' },
};

export const VoiceOrb: React.FC<VoiceOrbProps> = React.memo(
  ({ state = 'idle', variant = 'default', size = 96, volume = 0, style }) => {
    const palette = VARIANT_HEX[variant] || VARIANT_HEX.default;
    const orbDiameter = Math.round(size * 0.72);
    const glowRadius = Math.round(size * 0.22);
    const glowOpacity = state === 'speaking' ? 0.6 + volume * 0.3 : state === 'listening' ? 0.45 : 0.25;

    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        {/* Ambient Glow */}
        <View
          style={{
            position: 'absolute',
            width: orbDiameter,
            height: orbDiameter,
            borderRadius: orbDiameter / 2,
            backgroundColor: palette.mid,
            opacity: glowOpacity,
          }}
        />

        {/* Outer Orb sphere */}
        <LinearGradient
          colors={[palette.inner, palette.mid, palette.outer]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.85, y: 0.95 }}
          style={{
            width: orbDiameter,
            height: orbDiameter,
            borderRadius: orbDiameter / 2,
            shadowColor: palette.mid,
            shadowOpacity: 0.45,
            shadowRadius: glowRadius,
            shadowOffset: { width: 0, height: 0 },
            elevation: 8,
            overflow: 'hidden',
          }}
        >
          {/* Inner Highlight / sheen */}
          <LinearGradient
            colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0.05)', 'transparent']}
            start={{ x: 0.15, y: 0.1 }}
            end={{ x: 0.7, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
        </LinearGradient>
      </View>
    );
  }
);

VoiceOrb.displayName = 'VoiceOrb';

export type VoiceSessionState =
  | undefined
  | null
  | {
      status: { type: 'starting' | 'running' | 'ended' };
      isMuted?: boolean;
      mode?: 'listening' | 'speaking';
    };

export function deriveVoiceOrbState(s: VoiceSessionState): VoiceOrbState {
  if (!s) return 'idle';
  if (s.status.type === 'starting') return 'connecting';
  if (s.status.type === 'ended') return 'idle';
  if (s.isMuted) return 'muted';
  if (s.mode === 'speaking') return 'speaking';
  return 'listening';
}
