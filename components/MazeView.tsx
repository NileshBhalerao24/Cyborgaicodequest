import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import type { Level } from '../game/levels';
import type { TraceFrame } from '../game/interpreter';

interface MazeViewProps {
  level: Level;
  trace: TraceFrame[] | null;
  playing: boolean;
  stepMs?: number;
  onFrame?: (frame: TraceFrame, index: number, isLast: boolean) => void;
  onFinished?: () => void;
}

const MAX_CELL = 62;
const MIN_CELL = 30;
const MAX_GRID_HEIGHT = 300;
const PADDING = 14;

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

function starPoints(cx: number, cy: number, outerR: number, innerR: number): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(' ');
}

export function MazeView({ level, trace, playing, stepMs = 340, onFrame, onFinished }: MazeViewProps) {
  const [frameIndex, setFrameIndex] = useState(0);
  const shakeX = useRef(new Animated.Value(0)).current;
  const wasCrashedRef = useRef(false);
  const onFrameRef = useRef(onFrame);
  const onFinishedRef = useRef(onFinished);
  onFrameRef.current = onFrame;
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (!playing || !trace || trace.length <= 1) {
      setFrameIndex(trace ? trace.length - 1 : 0);
      return;
    }
    setFrameIndex(0);
    let idx = 0;
    const timer = setInterval(() => {
      idx++;
      if (idx >= trace.length) {
        clearInterval(timer);
        onFinishedRef.current?.();
        return;
      }
      setFrameIndex(idx);
      onFrameRef.current?.(trace[idx], idx, idx === trace.length - 1);
    }, stepMs);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trace, playing, stepMs]);

  const currentFrame: TraceFrame = trace
    ? trace[Math.min(frameIndex, trace.length - 1)]
    : { x: level.start.x, y: level.start.y, dir: level.start.dir, crashed: false, gem: null };

  useEffect(() => {
    if (currentFrame.crashed && !wasCrashedRef.current) {
      wasCrashedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      shakeX.setValue(0);
      Animated.sequence([
        Animated.timing(shakeX, { toValue: -8, duration: 40, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 8, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: -6, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    } else if (!currentFrame.crashed) {
      wasCrashedRef.current = false;
    }
  }, [currentFrame.crashed, shakeX]);

  const collectedGems = useMemo(() => {
    const set = new Set<string>();
    if (trace) {
      for (let i = 0; i <= Math.min(frameIndex, trace.length - 1); i++) {
        if (trace[i].gem) set.add(trace[i].gem as string);
      }
    }
    return set;
  }, [trace, frameIndex]);

  const screenWidth = Dimensions.get('window').width;
  const availableWidth = Math.min(screenWidth - 48, 420);
  const cell = Math.max(
    MIN_CELL,
    Math.min(MAX_CELL, Math.floor(availableWidth / level.cols), Math.floor(MAX_GRID_HEIGHT / level.rows))
  );
  const gridWidth = cell * level.cols;
  const gridHeight = cell * level.rows;
  const svgWidth = gridWidth + PADDING * 2;
  const svgHeight = gridHeight + PADDING * 2;

  const cx = (x: number) => PADDING + x * cell + cell / 2;
  const cy = (y: number) => PADDING + y * cell + cell / 2;

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const isWall = level.wallSet.has(`${x},${y}`);
      cells.push(
        <Rect
          key={`cell-${x}-${y}`}
          x={PADDING + x * cell}
          y={PADDING + y * cell}
          width={cell}
          height={cell}
          fill={isWall ? colors.wallFill : colors.openFill}
          stroke={colors.gridLine}
          strokeWidth={1}
        />
      );
      if (isWall) {
        cells.push(
          <Line
            key={`hatch-${x}-${y}`}
            x1={PADDING + x * cell + 4}
            y1={PADDING + y * cell + cell - 4}
            x2={PADDING + x * cell + cell - 4}
            y2={PADDING + y * cell + 4}
            stroke={colors.border}
            strokeWidth={2}
            opacity={0.6}
          />
        );
      }
    }
  }

  const rotation = currentFrame.dir * 90;
  const robotColor = currentFrame.crashed ? colors.accentCoral : colors.accentTeal;
  const robotR = cell * 0.32;

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View style={{ transform: [{ translateX: shakeX }] }}>
        <Svg width={svgWidth} height={svgHeight}>
          <Defs>
            <RadialGradient id="glowPink" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.accentPink} stopOpacity={0.55} />
              <Stop offset="100%" stopColor={colors.accentPink} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="glowAmber" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.accentAmber} stopOpacity={0.6} />
              <Stop offset="100%" stopColor={colors.accentAmber} stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {cells}

          {level.gems
            .filter((g) => !collectedGems.has(`${g.x},${g.y}`))
            .map((g) => (
              <G key={`gem-${g.x}-${g.y}`}>
                <Circle cx={cx(g.x)} cy={cy(g.y)} r={cell * 0.45} fill="url(#glowPink)" />
                <Polygon
                  points={diamondPoints(cx(g.x), cy(g.y), cell * 0.18)}
                  fill={colors.accentPink}
                  stroke="#FFFFFF"
                  strokeWidth={1}
                />
              </G>
            ))}

          <G key="goal">
            <Circle cx={cx(level.goal.x)} cy={cy(level.goal.y)} r={cell * 0.55} fill="url(#glowAmber)" />
            <Polygon
              points={starPoints(cx(level.goal.x), cy(level.goal.y), cell * 0.26, cell * 0.11)}
              fill={colors.accentAmber}
              stroke="#FFFFFF"
              strokeWidth={1}
            />
          </G>

          <G
            key="robot"
            transform={`rotate(${rotation} ${cx(currentFrame.x)} ${cy(currentFrame.y)})`}
          >
            <Line
              x1={cx(currentFrame.x)}
              y1={cy(currentFrame.y) - robotR - 6}
              x2={cx(currentFrame.x)}
              y2={cy(currentFrame.y) - robotR}
              stroke={robotColor}
              strokeWidth={2}
            />
            <Circle cx={cx(currentFrame.x)} cy={cy(currentFrame.y) - robotR - 7} r={2.5} fill={colors.accentAmber} />
            <Rect
              x={cx(currentFrame.x) - robotR}
              y={cy(currentFrame.y) - robotR}
              width={robotR * 2}
              height={robotR * 2}
              rx={robotR * 0.4}
              fill={robotColor}
              stroke="#FFFFFF"
              strokeWidth={1.5}
            />
            <Circle cx={cx(currentFrame.x) - robotR * 0.35} cy={cy(currentFrame.y) - robotR * 0.1} r={robotR * 0.16} fill="#1B1140" />
            <Circle cx={cx(currentFrame.x) + robotR * 0.35} cy={cy(currentFrame.y) - robotR * 0.1} r={robotR * 0.16} fill="#1B1140" />
            <Path
              d={`M ${cx(currentFrame.x) - robotR * 0.3} ${cy(currentFrame.y) + robotR * 0.35} Q ${cx(currentFrame.x)} ${cy(currentFrame.y) + robotR * 0.55} ${cx(currentFrame.x) + robotR * 0.3} ${cy(currentFrame.y) + robotR * 0.35}`}
              stroke="#1B1140"
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}
