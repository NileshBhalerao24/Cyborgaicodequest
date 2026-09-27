import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/colors';
import { ConfettiBurst } from './ConfettiBurst';

export type RunOutcome =
  | { kind: 'error'; message: string }
  | { kind: 'crashed' }
  | { kind: 'incomplete' }
  | { kind: 'success'; allGems: boolean; stars: number };

interface FeedbackBannerProps {
  outcome: RunOutcome;
  isLastLevel: boolean;
  confettiTrigger: number;
  onRetry: () => void;
  onNext: () => void;
  onShare?: () => void;
  sharing?: boolean;
}

function messageFor(outcome: RunOutcome): { icon: string; title: string; body: string } {
  switch (outcome.kind) {
    case 'error':
      return { icon: '🤔', title: 'Almost!', body: `${outcome.message} Try again — you'll get it next time!` };
    case 'crashed':
      return {
        icon: '💥',
        title: 'Oops!',
        body: "Cyborg bumped into a wall. Try again — you'll get it next time!",
      };
    case 'incomplete':
      return {
        icon: '🧭',
        title: 'So close!',
        body: "Cyborg finished the program but didn't reach the star yet. Try again — you'll get it next time!",
      };
    case 'success':
      return {
        icon: '🎉',
        title: 'You did it!',
        body: outcome.allGems
          ? 'Cyborg reached the star and grabbed every gem along the way!'
          : 'Cyborg reached the star! Come back and grab all the gems for a bonus star.',
      };
    default:
      return { icon: '🤔', title: '', body: '' };
  }
}

export function FeedbackBanner({
  outcome,
  isLastLevel,
  confettiTrigger,
  onRetry,
  onNext,
  onShare,
  sharing,
}: FeedbackBannerProps) {
  const { icon, title, body } = messageFor(outcome);
  const isSuccess = outcome.kind === 'success';
  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={[styles.banner, isSuccess ? styles.bannerSuccess : styles.bannerFail]}>
      {isSuccess && <ConfettiBurst trigger={confettiTrigger} width={screenWidth} />}
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {isSuccess && (
        <Text style={styles.stars}>{'⭐'.repeat(outcome.stars)}{'☆'.repeat(2 - outcome.stars)}</Text>
      )}

      <View style={styles.actions}>
        {isSuccess ? (
          <Pressable
            style={styles.primaryButton}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={isLastLevel ? 'Go to Free Build' : 'Go to next lesson'}
          >
            <Text style={styles.primaryButtonText}>{isLastLevel ? 'Try Free Build 🎨' : 'Next lesson →'}</Text>
          </Pressable>
        ) : null}
        {isSuccess && onShare && (
          <Pressable
            style={[styles.secondaryButton, sharing && styles.buttonDisabled]}
            onPress={onShare}
            disabled={sharing}
            accessibilityRole="button"
            accessibilityLabel="Share your win"
          >
            <Text style={styles.secondaryButtonText}>{sharing ? 'Preparing…' : '📤 Share your win'}</Text>
          </Pressable>
        )}
        {!isSuccess && (
          <Pressable
            style={styles.primaryButton}
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.primaryButtonText}>Try again</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  bannerSuccess: {
    backgroundColor: 'rgba(140,216,103,0.14)',
    borderColor: colors.accentGreen,
  },
  bannerFail: {
    backgroundColor: 'rgba(255,111,111,0.12)',
    borderColor: colors.accentCoral,
  },
  icon: {
    fontSize: 34,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 19,
    marginBottom: 4,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  stars: {
    fontSize: 22,
    marginTop: 8,
    letterSpacing: 4,
  },
  actions: {
    marginTop: 14,
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: colors.accentAmber,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontFamily: fonts.headingSemiBold,
    fontSize: 15,
  },
  secondaryButton: {
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
  buttonDisabled: {
    opacity: 0.6,
  },
});
