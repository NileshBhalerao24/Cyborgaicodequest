import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { LEVELS, MAX_STARS } from '../game/levels';
import { parseProgram, simulate } from '../game/interpreter';
import type { TraceFrame } from '../game/interpreter';
import { getPredictDemo } from '../game/predictDemos';
import { colors, fonts } from '../theme/colors';
import { useProgress } from '../hooks/useProgress';
import { useSound } from '../hooks/useSound';
import { useShare } from '../hooks/useShare';

import { StarfieldBackground } from '../components/StarfieldBackground';
import { SpeechBubble } from '../components/SpeechBubble';
import { MazeView } from '../components/MazeView';
import { CodeEditor } from '../components/CodeEditor';
import { LevelTrack } from '../components/LevelTrack';
import { BadgeShelf } from '../components/BadgeShelf';
import { FeedbackBanner, type RunOutcome } from '../components/FeedbackBanner';
import { PredictAndRun } from '../components/PredictAndRun';
import { ShareCard } from '../components/ShareCard';
import { FreeBuildScreen } from './FreeBuildScreen';

const BADGE_TOAST_MS = 2200;

type Mode = 'lesson' | 'freebuild';
type LessonPhase = 'predict' | 'modify';

export function GameScreen() {
  const { width, height } = useWindowDimensions();
  const progress = useProgress();
  const sound = useSound(progress.soundOn);
  const { cardRef: winCardRef, shareCard: shareWinCard, busy: sharingWin } = useShare();

  const [mode, setMode] = useState<Mode>('lesson');
  const [currentLevel, setCurrentLevel] = useState(0);
  const [phase, setPhase] = useState<LessonPhase>('predict');
  const [code, setCode] = useState('');
  const [trace, setTrace] = useState<TraceFrame[] | null>(null);
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [toastBadge, setToastBadge] = useState<{ icon: string; name: string } | null>(null);

  const resultRef = useRef<{ success: boolean; crashed: boolean; allGems: boolean } | null>(null);
  const hasHydratedLevel = useRef(false);
  // Predict→Run is shown once per level per app session (in-memory only — a
  // fresh app launch shows it again, which matches PRIMM's "predict before
  // you engage" intent without repeating it on every retry within a session).
  const seenPredictRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!progress.loading && !hasHydratedLevel.current) {
      hasHydratedLevel.current = true;
      const startLevel = Math.min(progress.lastLevel, LEVELS.length - 1);
      setCurrentLevel(startLevel);
      setPhase(seenPredictRef.current.has(startLevel) ? 'modify' : 'predict');
    }
  }, [progress.loading, progress.lastLevel]);

  const level = LEVELS[currentLevel];
  const demo = getPredictDemo(currentLevel);
  const freeBuildUnlocked = progress.completed[LEVELS.length - 1]?.reached ?? false;

  const resetRun = () => {
    setTrace(null);
    setOutcome(null);
    setRunning(false);
    resultRef.current = null;
  };

  const enterLevel = (index: number) => {
    setCurrentLevel(index);
    setCode('');
    resetRun();
    setPhase(seenPredictRef.current.has(index) ? 'modify' : 'predict');
  };

  const goToLevel = (index: number) => {
    if (running) return;
    setMode('lesson');
    enterLevel(index);
    progress.setLastLevel(index);
  };

  const handleSelectFreeBuild = () => {
    if (running || !freeBuildUnlocked) return;
    setMode('freebuild');
  };

  const handlePredictDone = () => {
    seenPredictRef.current.add(currentLevel);
    setPhase('modify');
  };

  const handleRun = () => {
    if (running) return;
    resetRun();
    try {
      const nodes = parseProgram(code);
      const result = simulate(nodes, level);
      resultRef.current = result;
      setTrace(result.trace);
      setRunning(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Something went wrong.';
      setOutcome({ kind: 'error', message });
      sound.playFail();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    }
  };

  const handleFrame = (frame: TraceFrame) => {
    if (frame.crashed) sound.playCrash();
    else if (frame.gem) sound.playGem();
    else sound.playStep();
  };

  const handleFinished = () => {
    setRunning(false);
    const result = resultRef.current;
    if (!result) return;

    if (result.crashed) {
      setOutcome({ kind: 'crashed' });
      sound.playFail();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }

    if (result.success) {
      const stars = 1 + (result.allGems ? 1 : 0);
      setOutcome({ kind: 'success', allGems: result.allGems, stars });
      sound.playSuccess();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setConfettiTrigger((t) => t + 1);
      progress.markLevelResult(currentLevel, { reached: true, gems: result.allGems });

      const newlyAwarded = progress.awardBadge(currentLevel);
      if (newlyAwarded) {
        setTimeout(() => {
          sound.playBadge();
          setToastBadge(level.badge);
          setTimeout(() => setToastBadge(null), BADGE_TOAST_MS);
        }, 400);
      }
      return;
    }

    setOutcome({ kind: 'incomplete' });
    sound.playFail();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  };

  const handleRetry = () => {
    resetRun();
  };

  const isLastLevel = currentLevel === LEVELS.length - 1;

  const handleNext = () => {
    if (isLastLevel) {
      setMode('freebuild');
      return;
    }
    const next = currentLevel + 1;
    enterLevel(next);
    progress.setLastLevel(next);
  };

  const handleShareWin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const result = await shareWinCard();
    if (result === 'saved') {
      Alert.alert('Saved!', 'Your win card was saved to your photos.');
    } else if (result === 'failed') {
      Alert.alert("Couldn't share", 'Something went wrong sharing your win. Try again?');
    } else if (result === 'unavailable') {
      Alert.alert(
        'Not available in Expo Go',
        "Sharing needs a real app build to work. Try it again after installing a build from 'eas build' instead of Expo Go."
      );
    }
  };

  const handleResetProgress = () => {
    Alert.alert(
      'Reset all progress?',
      'This clears every star and badge you have earned. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            progress.resetProgress();
            seenPredictRef.current = new Set();
            setMode('lesson');
            enterLevel(0);
          },
        },
      ]
    );
  };

  if (progress.loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accentTeal} />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <StarfieldBackground width={width} height={height} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Cyborg AI: Code Quest</Text>
            <Text style={styles.headerStars}>
              ⭐ {progress.totalStars}/{MAX_STARS}
            </Text>
          </View>
          <Pressable
            onPress={() => progress.setSoundOn(!progress.soundOn)}
            style={styles.muteButton}
            accessibilityRole="button"
            accessibilityLabel={progress.soundOn ? 'Mute sound' : 'Unmute sound'}
          >
            <Text style={styles.muteIcon}>{progress.soundOn ? '🔊' : '🔇'}</Text>
          </Pressable>
        </View>

        <LevelTrack
          levelCount={LEVELS.length}
          completed={progress.completed}
          currentLevel={currentLevel}
          onSelect={goToLevel}
          freeBuildUnlocked={freeBuildUnlocked}
          isFreeBuildSelected={mode === 'freebuild'}
          onSelectFreeBuild={handleSelectFreeBuild}
        />

        {mode === 'freebuild' ? (
          <FreeBuildScreen sound={sound} />
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {phase === 'predict' && demo ? (
              <PredictAndRun demo={demo} sound={sound} onDone={handlePredictDone} />
            ) : (
              <>
                <SpeechBubble level={level} />

                <MazeView
                  level={level}
                  trace={trace}
                  playing={running}
                  onFrame={handleFrame}
                  onFinished={handleFinished}
                />

                <View style={styles.editorSection}>
                  <CodeEditor value={code} onChangeText={setCode} chips={level.chips} editable={!running} />
                </View>

                <Pressable
                  style={[styles.runButton, running && styles.runButtonDisabled]}
                  onPress={handleRun}
                  disabled={running}
                  accessibilityRole="button"
                  accessibilityLabel="Run program"
                >
                  <Text style={styles.runButtonText}>{running ? 'Running…' : '▶ Run program'}</Text>
                </Pressable>

                {outcome && (
                  <View style={styles.feedbackWrap}>
                    <FeedbackBanner
                      outcome={outcome}
                      isLastLevel={isLastLevel}
                      confettiTrigger={confettiTrigger}
                      onRetry={handleRetry}
                      onNext={handleNext}
                      onShare={handleShareWin}
                      sharing={sharingWin}
                    />
                  </View>
                )}
              </>
            )}

            <Pressable
              onLongPress={handleResetProgress}
              delayLongPress={800}
              style={styles.badgeSection}
              accessibilityRole="button"
              accessibilityLabel="Badge shelf. Long press to reset all progress."
            >
              <BadgeShelf levels={LEVELS} earned={progress.badgesEarned} toastBadge={toastBadge} />
            </Pressable>
          </ScrollView>
        )}

        {/* Off-screen — captured by useShare when sharing a lesson win, never shown on screen. */}
        <View style={styles.offscreen} pointerEvents="none">
          <ShareCard
            ref={winCardRef}
            data={{ kind: 'lesson-win', lessonTitle: level.title, badgeIcon: level.badge.icon, badgeName: level.badge.name }}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 10,
  },
  headerTitleWrap: {
    flexShrink: 1,
  },
  headerTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 18,
  },
  headerStars: {
    color: colors.mutedText,
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  muteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muteIcon: {
    fontSize: 18,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    gap: 14,
  },
  editorSection: {
    marginTop: 4,
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
  feedbackWrap: {
    marginTop: 4,
  },
  badgeSection: {
    marginTop: 10,
    paddingTop: 24,
  },
  offscreen: {
    position: 'absolute',
    top: -9999,
    left: -9999,
  },
});
