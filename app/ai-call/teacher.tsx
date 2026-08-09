import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AiCallConfirmSheet } from '@/components/ai-call/AiCallConfirmSheet';
import { AiCallSettingsSheet } from '@/components/ai-call/AiCallSettingsSheet';
import { VoiceOrb, type VoiceOrbState, type VoiceOrbVariant } from '@/components/ai-call/VoiceOrb';
import { useColor } from '@/hooks/useColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAiCall, type AiCallPhase } from '@/hooks/useAiCall';

const IELTS_INSTRUCTIONS = `You are an AI IELTS Speaking Examiner. Conduct the speaking test in a professional, natural, and realistic IELTS format.

Your Role
Act exactly like an official IELTS Speaking examiner.
Be polite, neutral, and concise.
Do not teach, correct, or coach the candidate during the test.
Do not explain scoring criteria unless the test is finished and the user asks for feedback.
Keep the conversation focused on the IELTS Speaking exam structure.

Test Structure
The test has 3 parts:

Part 1 — Introduction & Interview (4–5 minutes)
Introduce yourself briefly.
Verify the candidate's name.
Ask simple questions about familiar topics such as: hometown, studies/work, hobbies, music, food, travel, daily routines.
Ask one question at a time.
Keep follow-up questions short and natural.

Part 2 — Long Turn (3–4 minutes)
Give the candidate a cue card topic.
Tell them they have 1 minute to prepare and 1–2 minutes to speak.
Include 3–4 bullet points on the cue card.
After preparation, ask them to begin speaking.
Do not interrupt unless they stop for a long time.
Ask 1 short follow-up question after the talk.

Part 3 — Discussion (4–5 minutes)
Ask deeper, more abstract questions related to Part 2.
Encourage extended discussion.
Questions should involve: opinions, social issues, comparisons, future trends, advantages/disadvantages.
Ask follow-up questions naturally.

Examiner Behavior Rules
Maintain a formal but friendly tone.
Never dominate the conversation.
Avoid long explanations.
Do not provide model answers.
Do not praise every answer excessively.
If the candidate gives a very short answer, encourage politely: "Could you tell me more about that?" or "Why is that?"
If the candidate asks for repetition, repeat the question once naturally.
Do not switch languages unless the user requests it.

Scoring Mode
If the candidate asks for feedback after the exam, evaluate according to official IELTS Speaking criteria: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, Pronunciation. Estimate an IELTS band score from 0–9 and give concise improvement suggestions.

Important Constraints
Stay in examiner role throughout the test.
Never break character during the speaking session.
Keep responses concise and exam-like.
Ask only one main question at a time.
Start immediately with Part 1 after greeting the candidate.

Opening Line: "Good morning/afternoon. My name is Sarah. I'll be your examiner today. Can you tell me your full name, please?"`;

interface ModeConfig {
  title: string;
  roleLabel: string;
  instructions?: string;
  voice?: string;
}

const MODES: Record<string, ModeConfig> = {
  default: {
    title: 'AI Tutor',
    roleLabel: 'Tutor',
  },
  ielts: {
    title: 'IELTS Examiner',
    roleLabel: 'Examiner',
    instructions: IELTS_INSTRUCTIONS,
    voice: 'shimmer',
  },
};

function formatClock(totalSeconds: number): string {
  const s = Math.max(0, totalSeconds);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

const PHASE_LABEL: Record<AiCallPhase, string> = {
  idle: 'Tap to start',
  connecting: 'Connecting…',
  listening: 'Listening…',
  speaking: 'Speaking…',
  ended: 'Call ended',
};

// Map the call lifecycle phase (+ mute) onto the orb's visual state.
function orbStateFor(phase: AiCallPhase, muted: boolean): VoiceOrbState {
  if (muted && (phase === 'listening' || phase === 'speaking')) return 'muted';
  if (phase === 'ended') return 'idle';
  return phase; // idle | connecting | listening | speaking
}

export default function AiCallTeacherScreen() {
  const isDark = useColorScheme() === 'dark';
  const text = useColor('text');
  const textMuted = useColor('textMuted');
  const red = useColor('red');
  const card = useColor('card');
  const primary = useColor('primary');
  const background = useColor('background');
  const insets = useSafeAreaInsets();
  const { mode: modeParam } = useLocalSearchParams<{ mode?: string }>();
  const modeKey = modeParam && MODES[modeParam] ? modeParam : 'default';
  const modeConfig = MODES[modeKey];

  const {
    phase,
    aiTranscript,
    error,
    secondsLeft,
    muted,
    mouthOpen,
    start,
    toggleMute,
    end,
  } = useAiCall();
  const callActive = phase === 'listening' || phase === 'speaking';
  const lowTime = secondsLeft <= 60;

  const [confirmVisible, setConfirmVisible] = useState(true);
  const [showCaptions, setShowCaptions] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [orbVariant, setOrbVariant] = useState<VoiceOrbVariant>('blue');
  const [orbSize, setOrbSize] = useState(300);
  const startedRef = useRef(false);

  const handleConfirm = () => {
    setConfirmVisible(false);
    if (!startedRef.current) {
      startedRef.current = true;
      start({
        instructions: modeConfig.instructions,
        voice: modeConfig.voice,
      });
    }
  };

  const handleCancel = () => {
    setConfirmVisible(false);
    if (router.canGoBack()) router.back();
  };

  useEffect(() => {
    if (phase === 'ended') {
      const id = setTimeout(() => {
        if (router.canGoBack()) router.back();
      }, 1800);
      return () => clearTimeout(id);
    }
  }, [phase]);

  const handleEnd = () => {
    end();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[primary, isDark ? '#0A0F1A' : '#FFFFFF', background]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + 16 }]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleEnd} hitSlop={12} style={styles.topBarIconBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            onPress={() => setSettingsVisible(true)}
            hitSlop={12}
            style={[styles.captionBtn, { backgroundColor: 'rgba(255,255,255,0.12)' }]}
          >
            <Ionicons name="settings-outline" size={17} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowCaptions((v) => !v)}
            hitSlop={12}
            style={[
              styles.captionBtn,
              { backgroundColor: showCaptions ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)' },
            ]}
          >
            <Ionicons
              name={showCaptions ? 'chatbox' : 'chatbox-outline'}
              size={17}
              color="#fff"
            />
          </TouchableOpacity>
          {callActive ? (
            <View
              style={[
                styles.timerPill,
                { backgroundColor: lowTime ? 'rgba(239,68,68,0.85)' : 'rgba(255,255,255,0.16)' },
              ]}
            >
              <Ionicons name="time-outline" size={13} color="#fff" />
              <Text style={styles.timerText}>{formatClock(secondsLeft)}</Text>
            </View>
          ) : (
            <View style={{ width: 32 }} />
          )}
        </View>
      </View>

      <View style={styles.center}>
        <View style={[styles.avatarStack, { width: orbSize, height: orbSize }]}>
          <VoiceOrb
            state={orbStateFor(phase, muted)}
            variant={orbVariant}
            size={orbSize}
            volume={mouthOpen}
            style={StyleSheet.absoluteFill}
          />
        </View>
        <Text style={[styles.phase, { color: '#fff' }]}>
          {error ? error : PHASE_LABEL[phase]}
        </Text>
      </View>

      <ScrollView
        style={styles.transcripts}
        contentContainerStyle={{ paddingBottom: 16 }}
      >
        {showCaptions && aiTranscript ? (
          <BlurView
            intensity={isDark ? 40 : 80}
            tint={isDark ? 'dark' : 'light'}
            style={[styles.bubble, { backgroundColor: isDark ? 'rgba(16,85,248,0.12)' : 'rgba(16,85,248,0.06)' }]}
          >
            <Text style={[styles.bubbleRole, { color: primary }]}>
              {modeConfig.roleLabel}
            </Text>
            <Text style={[styles.bubbleText, { color: text }]}>{aiTranscript}</Text>
          </BlurView>
        ) : null}
      </ScrollView>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.controlRow}>
          <View style={styles.controlItem}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={toggleMute}
              disabled={!callActive}
              style={[styles.shadowBtn, { opacity: callActive ? 1 : 0.4 }]}
            >
              <View
                style={[
                  styles.muteBtn,
                  {
                    backgroundColor: muted ? red : card,
                  },
                ]}
              >
                <Ionicons
                  name={muted ? 'mic-off' : 'mic'}
                  size={25}
                  color={muted ? '#fff' : text}
                />
              </View>
            </TouchableOpacity>
            <Text style={[styles.ctrlLabel, { color: textMuted }]}>
              {muted ? 'Unmute' : 'Mute'}
            </Text>
          </View>

          <View style={styles.controlItem}>
            <TouchableOpacity activeOpacity={0.85} onPress={handleEnd} style={styles.shadowBtnEnd}>
              <View style={[styles.endBtn, { backgroundColor: red }]}>
                <Ionicons
                  name="call"
                  size={27}
                  color="#fff"
                  style={{ transform: [{ rotate: '135deg' }] }}
                />
              </View>
            </TouchableOpacity>
            <Text style={[styles.ctrlLabel, { color: textMuted }]}>End call</Text>
          </View>
        </View>
      </View>

      </View>
      <AiCallConfirmSheet
        visible={confirmVisible}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <AiCallSettingsSheet
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        orbVariant={orbVariant}
        onOrbVariantChange={setOrbVariant}
        orbSize={orbSize}
        onOrbSizeChange={setOrbSize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  topBarIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  captionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    color: '#fff',
  },
  center: { alignItems: 'center', marginTop: 32 },
  avatarStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phase: { fontSize: 17, marginTop: 28, fontWeight: '600' },
  transcripts: { flex: 1, paddingHorizontal: 20, marginTop: 16 },
  bubble: { borderRadius: 16, padding: 14, marginBottom: 12, overflow: 'hidden' },
  bubbleRole: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  controls: { alignItems: 'center' },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 48,
  },
  controlItem: { alignItems: 'center' },
  shadowBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  shadowBtnEnd: {
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  muteBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlLabel: { marginTop: 10, fontSize: 13, fontWeight: '500' },
});
