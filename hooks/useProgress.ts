import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LEVELS } from '../game/levels';

export interface LevelCompletion {
  reached: boolean;
  gems: boolean;
}

interface PersistedProgress {
  completed: LevelCompletion[];
  badgesEarned: boolean[];
  soundOn: boolean;
  lastLevel: number;
}

const STORAGE_KEY = '@cyborg_ai_code_quest/progress';

function emptyCompletion(): LevelCompletion[] {
  return LEVELS.map(() => ({ reached: false, gems: false }));
}

function emptyBadges(): boolean[] {
  return LEVELS.map(() => false);
}

function defaultProgress(): PersistedProgress {
  return {
    completed: emptyCompletion(),
    badgesEarned: emptyBadges(),
    soundOn: true,
    lastLevel: 0,
  };
}

export function useProgress() {
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<LevelCompletion[]>(emptyCompletion());
  const [badgesEarned, setBadgesEarned] = useState<boolean[]>(emptyBadges());
  const [soundOn, setSoundOnState] = useState(true);
  const [lastLevel, setLastLevelState] = useState(0);
  const loaded = useRef(false);
  const stateRef = useRef<PersistedProgress>(defaultProgress());

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed: Partial<PersistedProgress> = JSON.parse(raw);
          if (parsed.completed && parsed.completed.length === LEVELS.length) {
            setCompleted(parsed.completed);
            stateRef.current.completed = parsed.completed;
          }
          if (parsed.badgesEarned && parsed.badgesEarned.length === LEVELS.length) {
            setBadgesEarned(parsed.badgesEarned);
            stateRef.current.badgesEarned = parsed.badgesEarned;
          }
          if (typeof parsed.soundOn === 'boolean') {
            setSoundOnState(parsed.soundOn);
            stateRef.current.soundOn = parsed.soundOn;
          }
          if (typeof parsed.lastLevel === 'number') {
            setLastLevelState(parsed.lastLevel);
            stateRef.current.lastLevel = parsed.lastLevel;
          }
        }
      } catch {
        // Corrupt or missing storage — fall back to defaults already set.
      } finally {
        loaded.current = true;
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback((next: Partial<PersistedProgress>) => {
    if (!loaded.current) return;
    stateRef.current = { ...stateRef.current, ...next };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateRef.current)).catch(() => {});
  }, []);

  const markLevelResult = useCallback(
    (levelIndex: number, result: LevelCompletion) => {
      setCompleted((prev) => {
        const next = prev.slice();
        next[levelIndex] = {
          reached: prev[levelIndex].reached || result.reached,
          gems: prev[levelIndex].gems || result.gems,
        };
        persist({ completed: next });
        return next;
      });
    },
    [persist]
  );

  const awardBadge = useCallback(
    (levelIndex: number) => {
      let didAward = false;
      setBadgesEarned((prev) => {
        if (prev[levelIndex]) return prev;
        didAward = true;
        const next = prev.slice();
        next[levelIndex] = true;
        persist({ badgesEarned: next });
        return next;
      });
      return didAward;
    },
    [persist]
  );

  const setSoundOn = useCallback(
    (value: boolean) => {
      setSoundOnState(value);
      persist({ soundOn: value });
    },
    [persist]
  );

  const setLastLevel = useCallback(
    (value: number) => {
      setLastLevelState(value);
      persist({ lastLevel: value });
    },
    [persist]
  );

  const resetProgress = useCallback(async () => {
    const fresh = defaultProgress();
    stateRef.current = fresh;
    setCompleted(fresh.completed);
    setBadgesEarned(fresh.badgesEarned);
    setSoundOnState(fresh.soundOn);
    setLastLevelState(fresh.lastLevel);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // best effort
    }
  }, []);

  const totalStars = completed.reduce((sum, c) => sum + (c.reached ? 1 : 0) + (c.gems ? 1 : 0), 0);

  return {
    loading,
    completed,
    badgesEarned,
    soundOn,
    lastLevel,
    totalStars,
    markLevelResult,
    awardBadge,
    setSoundOn,
    setLastLevel,
    resetProgress,
  };
}

export type UseProgressReturn = ReturnType<typeof useProgress>;
