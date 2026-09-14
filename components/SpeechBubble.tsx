import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/colors';
import type { Level } from '../game/levels';

interface SpeechBubbleProps {
  level: Level;
}

export function SpeechBubble({ level }: SpeechBubbleProps) {
  return (
    <View style={styles.bubble} accessibilityRole="text">
      <Text style={styles.title}>{level.title}</Text>
      <Text style={styles.body}>{level.text}</Text>
      <View style={styles.refsRow}>
        {level.refs.map((ref) => (
          <View key={ref} style={styles.refTag}>
            <Text style={styles.refText}>{ref}</Text>
          </View>
        ))}
      </View>
      <View style={styles.tail} />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: colors.panel,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 8,
  },
  title: {
    color: colors.accentAmber,
    fontFamily: fonts.heading,
    fontSize: 17,
    marginBottom: 6,
  },
  body: {
    color: colors.text,
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
  },
  refsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  refTag: {
    backgroundColor: colors.panelLight,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refText: {
    color: colors.mutedText,
    fontFamily: fonts.mono,
    fontSize: 11.5,
  },
  tail: {
    position: 'absolute',
    bottom: -8,
    left: 28,
    width: 16,
    height: 16,
    backgroundColor: colors.panel,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
});
