import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, fonts } from '../theme/colors';
import type { PredictDemo } from '../game/predictDemos';
import { toSimGrid } from '../game/predictDemos';
import { parseProgram, simulate } from '../game/interpreter';
import type { TraceFrame } from '../game/interpreter';
import { CodeBlock } from './CodeBlock';
import { MazeView } from './MazeView';
import type { useSound } from '../hooks/useSound';

interface PredictAndRunProps {
  demo: PredictDemo;
  sound: ReturnType<typeof useSound>;
  onDone: () => void;
}

type Phase = 'predict' | 'run';

export function PredictAndRun({ demo, sound, onDone }: PredictAndRunProps) {
  const [phase, setPhase] = useState<Phase>('predict');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [trace, setTrace] = useState<TraceFrame[] | null>(null);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);

  const grid = useMemo(() => toSimGrid(demo.demoLevel), [demo]);
  const usesAtGoal = demo.democode.includes('atGoal()');

  const handleAnswer = (index: number) => {
    setSelectedIndex(index);
    Haptics.selectionAsync().catch(() => {});
    const nodes = parseProgram(demo.democode);
    const result = simulate(nodes, grid);
    setTrace(result.trace);
    setPhase('run');
    setRunning(true);
    setFinished(false);
  };

  const handleFrame = (frame: TraceFrame) => {
    if (frame.gem) sound.playGem();
    else sound.playStep();
  };

  const handleFinished = () => {
    setRunning(false);
    setFinished(true);
  };

  const wasCorrect = selectedIndex === demo.correctIndex;

  return (
    <View style={styles.container}>
      <Text style={styles.stepLabel}>{phase === 'predict' ? 'Step 1: Predict' : 'Step 2: Run'}</Text>

      <CodeBlock code={demo.democode} />

      <View style={styles.mazeWrap}>
        <MazeView
          level={grid}
          trace={phase === 'run' ? trace : null}
          playing={phase === 'run' && running}
          showGoal={usesAtGoal}
          onFrame={handleFrame}
          onFinished={handleFinished}
        />
      </View>

      {phase === 'predict' ? (
        <View style={styles.questionBlock}>
          <Text style={styles.question}>{demo.question}</Text>
          <View style={styles.options}>
            {demo.options.map((option, index) => (
              <Pressable
                key={option}
                style={({ pressed }) => [styles.optionPill, pressed && styles.optionPillPressed]}
                onPress={() => handleAnswer(index)}
                accessibilityRole="button"
                accessibilityLabel={option}
              >
                <Text style={styles.optionText}>{option}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.questionBlock}>
          {finished ? (
            <>
              <Text style={styles.confirmation}>
                {wasCorrect ? '✓ You were right!' : "Actually, here's what happened:"}
              </Text>
              <Pressable
                style={styles.primaryButton}
                onPress={onDone}
                accessibilityRole="button"
                accessibilityLabel="Let's try it yourself"
              >
                <Text style={styles.primaryButtonText}>Let's try it yourself →</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.confirmation}>Watching Cyborg run it…</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  stepLabel: {
    color: colors.mutedText,
    fontFamily: fonts.headingSemiBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mazeWrap: {
    alignItems: 'center',
  },
  questionBlock: {
    backgroundColor: colors.panel,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  question: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 16,
  },
  options: {
    gap: 8,
  },
  optionPill: {
    backgroundColor: colors.panelLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  optionPillPressed: {
    backgroundColor: colors.border,
  },
  optionText: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14.5,
  },
  confirmation: {
    color: colors.accentAmber,
    fontFamily: fonts.headingSemiBold,
    fontSize: 15,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: colors.accentTeal,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontFamily: fonts.headingSemiBold,
    fontSize: 15,
  },
});
