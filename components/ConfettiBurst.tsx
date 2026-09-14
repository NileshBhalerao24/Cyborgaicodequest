import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface ConfettiBurstProps {
  trigger: number; // increment to replay the burst
  width: number;
}

const COLORS = ['#4DE8D0', '#FFC857', '#8CD867', '#FF7AB8', '#FF6F6F', '#F5F3FF'];
const PARTICLE_COUNT = 26;
const FALL_DISTANCE = 260;

interface Particle {
  id: number;
  left: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  rotateTo: string;
  drift: number;
}

function makeParticles(width: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    left: Math.random() * width,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 250,
    duration: 900 + Math.random() * 700,
    rotateTo: `${Math.round((Math.random() - 0.5) * 720)}deg`,
    drift: (Math.random() - 0.5) * 60,
  }));
}

function ConfettiPiece({ particle }: { particle: Particle }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: particle.duration,
      delay: particle.delay,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, FALL_DISTANCE] });
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.drift] });
  const rotate = progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', particle.rotateTo] });
  const opacity = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: particle.left,
        top: -10,
        width: particle.size,
        height: particle.size,
        backgroundColor: particle.color,
        borderRadius: 2,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate }],
      }}
    />
  );
}

export function ConfettiBurst({ trigger, width }: ConfettiBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger <= 0) return;
    setParticles(makeParticles(width));
    const timer = setTimeout(() => setParticles([]), 1900);
    return () => clearTimeout(timer);
  }, [trigger, width]);

  if (particles.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiPiece key={p.id} particle={p} />
      ))}
    </View>
  );
}
