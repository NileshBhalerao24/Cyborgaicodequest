import React, { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts } from '../theme/colors';

interface CodeEditorProps {
  value: string;
  onChangeText: (text: string) => void;
  chips: string[];
  editable?: boolean;
}

interface Selection {
  start: number;
  end: number;
}

function chipLabel(snippet: string): string {
  const firstLine = snippet.split('\n')[0];
  return snippet.includes('\n') ? `${firstLine} …` : firstLine;
}

export function CodeEditor({ value, onChangeText, chips, editable = true }: CodeEditorProps) {
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef<Selection>({ start: value.length, end: value.length });

  const insertChip = (snippet: string) => {
    const start = Math.min(selectionRef.current.start, value.length);
    const end = Math.min(selectionRef.current.end, value.length);
    const next = value.slice(0, start) + snippet + value.slice(end);
    const cursor = start + snippet.length;
    onChangeText(next);
    selectionRef.current = { start: cursor, end: cursor };
    requestAnimationFrame(() => inputRef.current?.setSelection(cursor, cursor));
  };

  return (
    <View>
      <View style={styles.editorWrap}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onSelectionChange={(e) => {
            selectionRef.current = e.nativeEvent.selection;
          }}
          multiline
          editable={editable}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          spellCheck={false}
          textAlignVertical="top"
          placeholder="Type your code here…"
          placeholderTextColor={colors.mutedText}
          accessibilityLabel="Code editor"
          accessibilityHint="Write commands for Cyborg here"
        />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
      >
        {chips.map((snippet, i) => (
          <Pressable
            key={`${i}-${snippet}`}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => insertChip(snippet)}
            accessibilityRole="button"
            accessibilityLabel={`Insert code: ${chipLabel(snippet)}`}
          >
            <Text style={styles.chipText}>{chipLabel(snippet)}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  editorWrap: {
    backgroundColor: '#150C33',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 140,
    padding: 10,
  },
  input: {
    color: colors.accentTeal,
    fontFamily: fonts.mono,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 120,
  },
  chipsRow: {
    marginTop: 10,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    backgroundColor: colors.panelLight,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipPressed: {
    backgroundColor: colors.border,
  },
  chipText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12.5,
  },
});
