import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/colors';

interface CodeBlockProps {
  code: string;
}

/** Read-only, styled code display — reuses CodeEditor's visual language without the input/chips. */
export function CodeBlock({ code }: CodeBlockProps) {
  return (
    <View style={styles.wrap} accessibilityLabel={`Code: ${code}`}>
      <Text style={styles.text}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#150C33',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  text: {
    color: colors.accentTeal,
    fontFamily: fonts.mono,
    fontSize: 15,
    lineHeight: 21,
  },
});
