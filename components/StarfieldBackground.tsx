import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface StarfieldBackgroundProps {
  width: number;
  height: number;
  starCount?: number;
}

// Deterministic pseudo-random sequence so the starfield doesn't reshuffle on every re-render.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function StarfieldBackground({ width, height, starCount = 90 }: StarfieldBackgroundProps) {
  const stars = useMemo(() => {
    const rand = mulberry32(1337);
    return Array.from({ length: starCount }, (_, i) => ({
      key: i,
      x: rand() * width,
      y: rand() * height,
      r: 0.6 + rand() * 1.6,
      opacity: 0.15 + rand() * 0.65,
    }));
  }, [width, height, starCount]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        {stars.map((s) => (
          <Circle key={s.key} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={s.opacity} />
        ))}
      </Svg>
    </View>
  );
}
