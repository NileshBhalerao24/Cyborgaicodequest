import { useEffect, useRef } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

const SOURCES = {
  step: require('../assets/sounds/step.wav'),
  gem: require('../assets/sounds/gem.wav'),
  crash: require('../assets/sounds/crash.wav'),
  fail: require('../assets/sounds/fail.wav'),
  success: require('../assets/sounds/success.wav'),
  badge: require('../assets/sounds/badge.wav'),
};

export type SoundName = keyof typeof SOURCES;

export function useSound(soundOn: boolean) {
  const step = useAudioPlayer(SOURCES.step);
  const gem = useAudioPlayer(SOURCES.gem);
  const crash = useAudioPlayer(SOURCES.crash);
  const fail = useAudioPlayer(SOURCES.fail);
  const success = useAudioPlayer(SOURCES.success);
  const badge = useAudioPlayer(SOURCES.badge);

  const players = useRef({ step, gem, crash, fail, success, badge });
  players.current = { step, gem, crash, fail, success, badge };

  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  const play = (name: SoundName) => {
    if (!soundOnRef.current) return;
    const player = players.current[name];
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // ignore playback errors (e.g. player not yet loaded)
    }
  };

  return {
    playStep: () => play('step'),
    playGem: () => play('gem'),
    playCrash: () => play('crash'),
    playFail: () => play('fail'),
    playSuccess: () => play('success'),
    playBadge: () => play('badge'),
  };
}
