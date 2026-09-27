import { useRef, useState } from 'react';
import { View } from 'react-native';

export type ShareResult = 'shared' | 'saved' | 'failed' | 'unavailable';

/**
 * react-native-view-shot and expo-media-library's native modules aren't part
 * of the classic Expo Go client — requiring them at module scope crashes the
 * whole app on launch there (before Share is ever tapped). They're required
 * lazily inside shareCard() instead, so every other screen works fine in
 * Expo Go and only tapping Share hits the (caught) "not available here" path.
 */
export function useShare() {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const shareCard = async (): Promise<ShareResult> => {
    if (!cardRef.current || busy) return 'failed';
    setBusy(true);
    try {
      const { captureRef } = require('react-native-view-shot');
      const Sharing = require('expo-sharing');
      const MediaLibrary = require('expo-media-library');

      const uri = await captureRef(cardRef, { format: 'png', quality: 0.92 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Cyborg AI win!' });
        return 'shared';
      }

      // Sharing isn't available on this platform — fall back to saving straight to the camera roll.
      const perm = await MediaLibrary.requestPermissionsAsync(true);
      if (!perm.granted) return 'failed';
      await MediaLibrary.Asset.create(uri);
      return 'saved';
    } catch {
      return 'unavailable';
    } finally {
      setBusy(false);
    }
  };

  return { cardRef, shareCard, busy };
}
