import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/colors';
import type { Level } from '../game/levels';

interface BadgeShelfProps {
  levels: Level[];
  earned: boolean[];
  toastBadge: { icon: string; name: string } | null;
}

export function BadgeShelf({ levels, earned, toastBadge }: BadgeShelfProps) {
  const toastOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toastBadge) {
      toastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1600),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [toastBadge, toastOpacity]);

  return (
    <View>
      <Text style={styles.heading}>Badges</Text>
      <View style={styles.grid} accessibilityRole="list">
        {levels.map((level, i) => (
          <View
            key={level.title}
            style={[styles.badge, !earned[i] && styles.badgeLocked]}
            accessibilityLabel={earned[i] ? `Badge earned: ${level.badge.name}` : 'Badge locked'}
          >
            <Text style={styles.icon}>{earned[i] ? level.badge.icon : '🔒'}</Text>
            <Text style={styles.name} numberOfLines={1}>
              {earned[i] ? level.badge.name : '???'}
            </Text>
          </View>
        ))}
      </View>

      {toastBadge && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text style={styles.toastIcon}>{toastBadge.icon}</Text>
          <Text style={styles.toastText}>Badge unlocked: {toastBadge.name}!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: colors.mutedText,
    fontFamily: fonts.headingSemiBold,
    fontSize: 13,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    width: 78,
    height: 78,
    borderRadius: 14,
    backgroundColor: colors.panelLight,
    borderWidth: 1,
    borderColor: colors.accentAmber,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  badgeLocked: {
    borderColor: colors.border,
    opacity: 0.55,
  },
  icon: {
    fontSize: 26,
    marginBottom: 4,
  },
  name: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 9.5,
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    top: -56,
    left: 0,
    right: 0,
    backgroundColor: colors.accentAmber,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  toastIcon: {
    fontSize: 18,
  },
  toastText: {
    color: colors.background,
    fontFamily: fonts.headingSemiBold,
    fontSize: 13,
  },
});
