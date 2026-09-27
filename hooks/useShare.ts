import { useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

export type ShareResult = 'shared' | 'saved' | 'failed';

export function useShare() {
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const shareCard = async (): Promise<ShareResult> => {
    if (!cardRef.current || busy) return 'failed';
    setBusy(true);
    try {
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
      return 'failed';
    } finally {
      setBusy(false);
    }
  };

  return { cardRef, shareCard, busy };
}
