import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/colors';
import type { LevelCompletion } from '../hooks/useProgress';

interface LevelTrackProps {
  levelCount: number;
  completed: LevelCompletion[];
  currentLevel: number;
  onSelect: (index: number) => void;
  freeBuildUnlocked?: boolean;
  isFreeBuildSelected?: boolean;
  onSelectFreeBuild?: () => void;
}

export function LevelTrack({
  levelCount,
  completed,
  currentLevel,
  onSelect,
  freeBuildUnlocked,
  isFreeBuildSelected,
  onSelectFreeBuild,
}: LevelTrackProps) {
  const isUnlocked = (i: number) => i === 0 || completed[i - 1]?.reached;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.track}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist"
    >
      {Array.from({ length: levelCount }, (_, i) => {
        const unlocked = isUnlocked(i);
        const isCurrent = !isFreeBuildSelected && i === currentLevel;
        const stars = (completed[i]?.reached ? 1 : 0) + (completed[i]?.gems ? 1 : 0);
        return (
          <Pressable
            key={i}
            disabled={!unlocked}
            onPress={() => onSelect(i)}
            style={[
              styles.dot,
              isCurrent && styles.dotCurrent,
              completed[i]?.reached && styles.dotDone,
              !unlocked && styles.dotLocked,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isCurrent, disabled: !unlocked }}
            accessibilityLabel={`Lesson ${i + 1}${unlocked ? '' : ', locked'}`}
          >
            <Text style={[styles.dotText, !unlocked && styles.dotTextLocked]}>{unlocked ? i + 1 : '🔒'}</Text>
            {stars > 0 && <Text style={styles.starText}>{'⭐'.repeat(stars)}</Text>}
          </Pressable>
        );
      })}

      {onSelectFreeBuild && (
        <Pressable
          disabled={!freeBuildUnlocked}
          onPress={onSelectFreeBuild}
          style={[
            styles.dot,
            styles.freeBuildDot,
            isFreeBuildSelected && styles.dotCurrent,
            !freeBuildUnlocked && styles.dotLocked,
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: !!isFreeBuildSelected, disabled: !freeBuildUnlocked }}
          accessibilityLabel={freeBuildUnlocked ? 'Free Build' : 'Free Build, locked'}
        >
          <Text style={styles.dotText}>{freeBuildUnlocked ? '🎨' : '🔒'}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    flexGrow: 0,
    flexShrink: 0,
    height: 68,
  },
  row: {
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.panelLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotCurrent: {
    borderColor: colors.accentAmber,
  },
  dotDone: {
    backgroundColor: colors.accentGreen,
    borderColor: colors.accentGreen,
  },
  dotLocked: {
    opacity: 0.5,
  },
  freeBuildDot: {
    backgroundColor: colors.panel,
    borderColor: colors.accentPink,
  },
  dotText: {
    color: colors.text,
    fontFamily: fonts.headingSemiBold,
    fontSize: 15,
  },
  dotTextLocked: {
    fontSize: 13,
  },
  starText: {
    position: 'absolute',
    bottom: -16,
    fontSize: 9,
  },
});
