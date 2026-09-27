import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { FREE_BUILD_CHIPS, FREE_BUILD_SUGGESTIONS, makeFreeBuildGrid } from '../game/freeBuild';
import { parseProgram, simulate } from '../game/interpreter';
import type { TraceFrame } from '../game/interpreter';
import type { Position } from '../game/levels';
import { colors, fonts } from '../theme/colors';
import type { useSound } from '../hooks/useSound';
import { useShare } from '../hooks/useShare';

import { MazeView } from '../components/MazeView';
import { CodeEditor } from '../components/CodeEditor';
import { ShareCard } from '../components/ShareCard';

interface FreeBuildScreenProps {
  sound: ReturnType<typeof useSound>;
}

export function FreeBuildScreen({ sound }: FreeBuildScreenProps) {
  const [code, setCode] = useState('');
  const [trailRuns, setTrailRuns] = useState<Position[][]>([]);
  const [trace, setTrace] = useState<TraceFrame[] | null>(null);
  const [running, setRunning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { cardRef, shareCard, busy: sharing } = useShare();
  const grid = makeFreeBuildGrid();

  const handleRun = () => {
    if (running) return;
    setErrorMessage(null);
    try {
      const nodes = parseProgram(code);
      const result = simulate(nodes, grid, true);
      setTrace(result.trace);
      setRunning(true);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Something went wrong.');
      sound.playFail();
    }
  };

  const handleFrame = (frame: TraceFrame) => {
    if (frame.gem) sound.playGem();
    else sound.playStep();
  };

  const handleFinished = () => {
    setRunning(false);
    if (trace) {
      const points: Position[] = [];
      for (const f of trace) {
        const last = points[points.length - 1];
        if (!last || last.x !== f.x || last.y !== f.y) points.push({ x: f.x, y: f.y });
      }
      setTrailRuns((prev) => [...prev, points]);
    }
    setTrace(null);
  };

  const handleClearCanvas = () => {
    setTrailRuns([]);
    setTrace(null);
    setRunning(false);
  };

  const handleTrySuggestion = (snippetCode: string) => {
    setCode(snippetCode);
    setErrorMessage(null);
  };

  const handleSaveAndShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await shareCard();
    if (result === 'saved') {
      Alert.alert('Saved!', 'Your drawing was saved to your photos.');
    } else if (result === 'failed') {
      Alert.alert("Couldn't share", 'Something went wrong saving your drawing. Try again?');
    } else if (result === 'unavailable') {
      Alert.alert(
        'Not available in Expo Go',
        "Sharing needs a real app build to work. Try it again after installing a build from 'eas build' instead of Expo Go."
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}>
        <Text style={styles.title}>🎨 Free Build</Text>
        <Text style={styles.subtitle}>
          No walls, no goal, no wrong answers — just play with everything you've learned and watch Cyborg draw.
        </Text>
      </View>

      <View style={styles.mazeWrap}>
        <MazeView
          level={grid}
          trace={trace}
          playing={running}
          sandbox
          trailRuns={trailRuns}
          onFrame={handleFrame}
          onFinished={handleFinished}
        />
      </View>

      <View style={styles.editorSection}>
        <CodeEditor value={code} onChangeText={setCode} chips={FREE_BUILD_CHIPS} editable={!running} />
      </View>

      <View style={styles.suggestionsRow}>
        {FREE_BUILD_SUGGESTIONS.map((s) => (
          <Pressable
            key={s.label}
            style={({ pressed }) => [styles.suggestionChip, pressed && styles.suggestionChipPressed]}
            onPress={() => handleTrySuggestion(s.code)}
            accessibilityRole="button"
            accessibilityLabel={`Try this: ${s.label}`}
          >
            <Text style={styles.suggestionText}>✨ {s.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.runButton, running && styles.runButtonDisabled]}
        onPress={handleRun}
        disabled={running}
        accessibilityRole="button"
        accessibilityLabel="Run program"
      >
        <Text style={styles.runButtonText}>{running ? 'Running…' : '▶ Run'}</Text>
      </Pressable>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      <View style={styles.actionsRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={handleClearCanvas}
          accessibilityRole="button"
          accessibilityLabel="Clear canvas"
        >
          <Text style={styles.secondaryButtonText}>🧹 Clear canvas</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, sharing && styles.runButtonDisabled]}
          onPress={handleSaveAndShare}
          disabled={sharing}
          accessibilityRole="button"
          accessibilityLabel="Save and share"
        >
          <Text style={styles.primaryButtonText}>{sharing ? 'Preparing…' : '📤 Save & share'}</Text>
        </Pressable>
      </View>

      {/* Off-screen — captured by useShare, never shown on screen. */}
      <View style={styles.offscreen} pointerEvents="none">
        <ShareCard ref={cardRef} data={{ kind: 'free-build', trailRuns, gridCols: grid.cols, gridRows: grid.rows }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 14,
  },
  intro: {
    gap: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 20,
  },
  subtitle: {
    color: colors.mutedText,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
  },
  mazeWrap: {
    alignItems: 'center',
  },
  editorSection: {
    marginTop: 4,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: colors.panelLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  suggestionChipPressed: {
    backgroundColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 12.5,
  },
  runButton: {
    backgroundColor: colors.accentTeal,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  runButtonDisabled: {
    opacity: 0.6,
  },
  runButtonText: {
    color: colors.background,
    fontFamily: fonts.heading,
    fontSize: 16,
  },
  errorText: {
    color: colors.accentCoral,
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: colors.panelLight,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontFamily: fonts.headingSemiBold,
    fontSize: 14,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: colors.accentAmber,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontFamily: fonts.headingSemiBold,
    fontSize: 14,
  },
  offscreen: {
    position: 'absolute',
    top: -9999,
    left: -9999,
  },
});
