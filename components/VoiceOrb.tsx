/**
 * VoiceOrb — Expo / React Native port of assistant-ui's <VoiceOrb />
 *
 * Renders an animated, shader-driven orb that reacts to voice session state
 * (idle / connecting / listening / speaking / muted) and microphone volume.
 *
 * Original (web): https://www.assistant-ui.com/docs/ui/voice
 * Engine here:   @shopify/react-native-skia (SKSL shader) + Reanimated.
 */

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import {
  Canvas,
  Fill,
  Shader,
  Skia,
  vec,
  useClock,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type VoiceOrbState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "muted";

export type VoiceOrbVariant = "default" | "blue" | "violet" | "emerald";

export type VoiceOrbProps = {
  /** Voice session state. Drives the orb's animation parameters. */
  state?: VoiceOrbState;
  /** Color palette. */
  variant?: VoiceOrbVariant;
  /** Orb canvas size (px). The actual sphere fills ~50% of this; the rest is glow. */
  size?: number;
  /** Realtime mic / playback volume 0..1. Boosts speed, amplitude, and glow. */
  volume?: number;
  /** Optional wrapper style. */
  style?: ViewStyle;
};

/* ------------------------------------------------------------------ */
/*  Palettes & per-state animation targets (1:1 with web version)      */
/* ------------------------------------------------------------------ */

const VARIANT_COLORS: Record<VoiceOrbVariant, [number, number, number][]> = {
  default: [
    [0.55, 0.55, 0.6],
    [0.7, 0.7, 0.75],
    [0.4, 0.4, 0.45],
  ],
  blue: [
    [0.2, 0.5, 1.0],
    [0.4, 0.7, 1.0],
    [0.1, 0.3, 0.8],
  ],
  violet: [
    [0.6, 0.3, 1.0],
    [0.8, 0.5, 1.0],
    [0.4, 0.15, 0.8],
  ],
  emerald: [
    [0.15, 0.75, 0.55],
    [0.3, 0.9, 0.7],
    [0.1, 0.55, 0.4],
  ],
};

type OrbParams = {
  speed: number;
  amplitude: number;
  glow: number;
  brightness: number;
  pulse: number;
  saturation: number;
};

const STATE_PARAMS: Record<VoiceOrbState, OrbParams> = {
  idle: {
    speed: 0.15,
    amplitude: 0.04,
    glow: 0.15,
    brightness: 0.55,
    pulse: 0.0,
    saturation: 0.7,
  },
  connecting: {
    speed: 0.5,
    amplitude: 0.1,
    glow: 0.45,
    brightness: 0.75,
    pulse: 1.0,
    saturation: 0.9,
  },
  listening: {
    speed: 0.4,
    amplitude: 0.14,
    glow: 0.5,
    brightness: 0.85,
    pulse: 0.0,
    saturation: 1.0,
  },
  speaking: {
    speed: 1.4,
    amplitude: 0.35,
    glow: 0.9,
    brightness: 1.0,
    pulse: 0.0,
    saturation: 1.0,
  },
  muted: {
    speed: 0.06,
    amplitude: 0.015,
    glow: 0.08,
    brightness: 0.35,
    pulse: 0.0,
    saturation: 0.2,
  },
};

/* ------------------------------------------------------------------ */
/*  SKSL shader (ported from the original GLSL fragment shader)        */
/*  - vec aliases work in SKSL the same as GLSL                        */
/*  - function overloading isn't allowed, so mod289 split into _3/_4   */
/* ------------------------------------------------------------------ */

const SKSL = `
uniform float u_time;
uniform float u_speed;
uniform float u_amplitude;
uniform float u_glow;
uniform float u_brightness;
uniform float u_pulse;
uniform float u_saturation;
uniform vec3  u_color0;
uniform vec3  u_color1;
uniform vec3  u_color2;
uniform vec2  u_resolution;

vec3 mod289_3(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec4 mod289_4(vec4 x) { return x - floor(x / 289.0) * 289.0; }
vec4 permute(vec4 x)  { return mod289_4((x * 34.0 + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  vec3 i  = floor(v + dot(v, vec3(C.y)));
  vec3 x0 = v - i + dot(i, vec3(C.x));
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g, l.zxy);
  vec3 i2 = max(g, l.zxy);
  vec3 x1 = x0 - i1 + C.x;
  vec3 x2 = x0 - i2 + C.y;
  vec3 x3 = x0 - 0.5;
  i = mod289_3(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p / 49.0);
  vec4 x_ = floor(j / 7.0);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x  = (x_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 y  = (y_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 h  = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 g0 = vec3(a0.xy, h.x);
  vec3 g1 = vec3(a0.zw, h.y);
  vec3 g2 = vec3(a1.xy, h.z);
  vec3 g3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));
  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3)));
}

half4 main(float2 fragCoord) {
  vec2 uv = (fragCoord / u_resolution) * 2.0 - 1.0;
  float dist = length(uv);
  float t = u_time * u_speed;

  // Hard sphere boundary with soft anti-aliased edge
  float radius = 0.44;
  float circle = 1.0 - smoothstep(radius - 0.008, radius + 0.008, dist);

  if (circle < 0.001) {
    // Outer glow halo
    float glowDist = dist - radius;
    float glow = exp(-glowDist * 12.0) * u_glow * 0.4;
    vec3  glowColor = mix(u_color0, u_color1, 0.5);
    return half4(half3(glowColor * glow), half(glow));
  }

  float n1 = snoise(vec3(uv * 2.0,       t * 0.6))        * 0.5 + 0.5;
  float n2 = snoise(vec3(uv * 3.5 + 7.0, t * 0.9))        * 0.5 + 0.5;
  float n3 = snoise(vec3(uv * 1.5 - 3.0, t * 0.4 + 10.0)) * 0.5 + 0.5;

  vec2 distort = vec2(
    snoise(vec3(uv * 2.0 + 5.0,  t * 0.7)),
    snoise(vec3(uv * 2.0 + 15.0, t * 0.7))
  ) * u_amplitude * 2.0;

  float n4 = snoise(vec3((uv + distort) * 3.0, t * 0.5)) * 0.5 + 0.5;

  vec3 col = mix(u_color0, u_color1, n1);
  col = mix(col, u_color2,         n2 * 0.5);
  col = mix(col, u_color1 * 1.3,   n4 * 0.4);

  float vein = pow(n3, 3.0) * u_amplitude * 6.0;
  col += vein * mix(u_color1, vec3(1.0), 0.3);

  float centerDist = dist / radius;
  float depthShade = 1.0 - centerDist * centerDist * 0.4;
  col *= depthShade;

  float rim = pow(centerDist, 4.0) * 0.6;
  col += rim * mix(u_color0, vec3(1.0), 0.5);

  vec2  lightPos  = vec2(-0.15, -0.18);
  float specDist  = length(uv - lightPos);
  float spec      = exp(-specDist * specDist * 30.0) * 0.7;
  col += spec * vec3(1.0);

  vec2  lightPos2 = vec2(0.2, 0.25);
  float spec2     = exp(-length(uv - lightPos2) * 8.0) * 0.15;
  col += spec2 * u_color1;

  float pulseFactor = 1.0 + u_pulse * sin(u_time * 3.5) * 0.35;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, u_saturation);
  col *= u_brightness * pulseFactor;

  return half4(half3(col), half(circle));
}
`;

// Compile once. Skia.RuntimeEffect.Make returns null if compilation fails.
const orbEffect = Skia.RuntimeEffect.Make(SKSL);
if (!orbEffect) {
  // Surfaces a clear error during development instead of a silent blank canvas.
  // eslint-disable-next-line no-console
  console.error("[VoiceOrb] SKSL compilation failed");
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

const LERP_DURATION = 600; // ms — feels like the 0.045 lerp factor in the web version

export const VoiceOrb: React.FC<VoiceOrbProps> = React.memo(
  ({ state = "idle", variant = "default", size = 96, volume = 0, style }) => {
    const colors = VARIANT_COLORS[variant];

    // Animated, smoothly-interpolated shader parameters
    const speed = useSharedValue(STATE_PARAMS.idle.speed);
    const amplitude = useSharedValue(STATE_PARAMS.idle.amplitude);
    const glow = useSharedValue(STATE_PARAMS.idle.glow);
    const brightness = useSharedValue(STATE_PARAMS.idle.brightness);
    const pulse = useSharedValue(STATE_PARAMS.idle.pulse);
    const saturation = useSharedValue(STATE_PARAMS.idle.saturation);

    // Volume is a fast-moving signal — keep it on its own shared value so the
    // caller can update at 20–60Hz without re-rendering React.
    const vol = useSharedValue(volume);
    useEffect(() => {
      vol.value = volume;
    }, [volume, vol]);

    // Retarget params on state change
    useEffect(() => {
      const target = STATE_PARAMS[state];
      const t = { duration: LERP_DURATION, easing: Easing.out(Easing.cubic) };
      speed.value = withTiming(target.speed, t);
      amplitude.value = withTiming(target.amplitude, t);
      glow.value = withTiming(target.glow, t);
      brightness.value = withTiming(target.brightness, t);
      pulse.value = withTiming(target.pulse, t);
      saturation.value = withTiming(target.saturation, t);
    }, [state, speed, amplitude, glow, brightness, pulse, saturation]);

    // Skia animation clock
    const clock = useClock();

    // Stable resolution vec
    const resolution = useMemo(() => vec(size, size), [size]);

    // Build the uniforms object reactively. Order MUST match SKSL declaration.
    const uniforms = useDerivedValue(() => ({
      u_time: clock.value / 1000,
      u_speed: speed.value + vol.value * 0.4,
      u_amplitude: amplitude.value + vol.value * 0.12,
      u_glow: glow.value + vol.value * 0.2,
      u_brightness: brightness.value,
      u_pulse: pulse.value,
      u_saturation: saturation.value,
      u_color0: colors[0],
      u_color1: colors[1],
      u_color2: colors[2],
      u_resolution: resolution,
    }));

    if (!orbEffect) {
      // Fallback so the layout doesn't collapse if the shader didn't compile.
      return <View style={[{ width: size, height: size }, style]} />;
    }

    return (
      <View style={[{ width: size, height: size }, style]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Fill>
            <Shader source={orbEffect} uniforms={uniforms} />
          </Fill>
        </Canvas>
      </View>
    );
  },
);

VoiceOrb.displayName = "VoiceOrb";

/* ------------------------------------------------------------------ */
/*  Helper: derive an orb state from a generic voice-session object    */
/* ------------------------------------------------------------------ */

export type VoiceSessionState =
  | undefined
  | null
  | {
      status: { type: "starting" | "running" | "ended" };
      isMuted?: boolean;
      mode?: "listening" | "speaking";
    };

export function deriveVoiceOrbState(s: VoiceSessionState): VoiceOrbState {
  if (!s) return "idle";
  if (s.status.type === "starting") return "connecting";
  if (s.status.type === "ended") return "idle";
  if (s.isMuted) return "muted";
  if (s.mode === "speaking") return "speaking";
  return "listening";
}
