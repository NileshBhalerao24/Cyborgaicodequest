import React, { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polyline, Rect } from 'react-native-svg';
import { colors, fonts } from '../theme/colors';
import type { Position } from '../game/levels';
import { StarfieldBackground } from './StarfieldBackground';

const CARD_WIDTH = 360;
const CARD_HEIGHT = 450;
const TRAIL_COLORS = [colors.accentTeal, colors.accentPink, colors.accentAmber, colors.accentGreen, colors.accentCoral];

export type ShareCardData =
  | { kind: 'lesson-win'; lessonTitle: string; badgeIcon: string; badgeName: string }
  | { kind: 'free-build'; trailRuns: Position[][]; gridCols: number; gridRows: number };

function CyborgMascot({ size = 96 }: { size?: number }) {
  const r = size * 0.5;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <Svg width={size} height={size + 14}>
      <G>
        <Line x1={cx} y1={12} x2={cx} y2={22} stroke={colors.accentTeal} strokeWidth={3} />
        <Circle cx={cx} cy={10} r={4} fill={colors.accentAmber} />
        <Rect x={cx - r} y={22} width={r * 2} height={r * 2} rx={r * 0.35} fill={colors.accentTeal} stroke="#FFFFFF" strokeWidth={2} />
        <Circle cx={cx - r * 0.35} cy={22 + r * 0.85} r={r * 0.14} fill={colors.background} />
        <Circle cx={cx + r * 0.35} cy={22 + r * 0.85} r={r * 0.14} fill={colors.background} />
        <Path
          d={`M ${cx - r * 0.28} ${22 + r * 1.3} Q ${cx} ${22 + r * 1.5} ${cx + r * 0.28} ${22 + r * 1.3}`}
          stroke={colors.background}
          strokeWidth={2.5}
          fill="none"
          strokeLinecap="round"
        />
      </G>
    </Svg>
  );
}

function TrailSnapshot({ trailRuns, gridCols, gridRows }: { trailRuns: Position[][]; gridCols: number; gridRows: number }) {
  const size = 220;
  const cell = size / Math.max(gridCols, gridRows);
  const cx = (x: number) => x * cell + cell / 2;
  const cy = (y: number) => y * cell + cell / 2;

  return (
    <Svg width={size} height={size}>
      <Rect x={0} y={0} width={size} height={size} rx={16} fill={colors.openFill} stroke={colors.border} strokeWidth={1} />
      {trailRuns.map((run, i) => (
        <Polyline
          key={i}
          points={run.map((p) => `${cx(p.x)},${cy(p.y)}`).join(' ')}
          fill="none"
          stroke={TRAIL_COLORS[i % TRAIL_COLORS.length]}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      ))}
    </Svg>
  );
}

export const ShareCard = forwardRef<View, { data: ShareCardData }>(({ data }, ref) => {
  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      <StarfieldBackground width={CARD_WIDTH} height={CARD_HEIGHT} starCount={45} />
      {data.kind === 'lesson-win' ? (
        <>
          <CyborgMascot size={100} />
          <Text style={styles.badgeIcon}>{data.badgeIcon}</Text>
          <Text style={styles.title}>I taught Cyborg to code!</Text>
          <Text style={styles.caption}>
            {data.lessonTitle} — earned "{data.badgeName}" 🪐
          </Text>
        </>
      ) : (
        <>
          <TrailSnapshot trailRuns={data.trailRuns} gridCols={data.gridCols} gridRows={data.gridRows} />
          <Text style={styles.title}>Look what I coded!</Text>
          <Text style={styles.caption}>Free Build in Cyborg AI: Code Quest</Text>
        </>
      )}
      <Text style={styles.wordmark}>✨ Cyborg AI: Code Quest ✨</Text>
    </View>
  );
});
ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  badgeIcon: {
    fontSize: 40,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 20,
    textAlign: 'center',
  },
  caption: {
    color: colors.accentAmber,
    fontFamily: fonts.headingSemiBold,
    fontSize: 14,
    textAlign: 'center',
  },
  wordmark: {
    position: 'absolute',
    bottom: 20,
    color: colors.mutedText,
    fontFamily: fonts.body,
    fontSize: 12,
  },
});
