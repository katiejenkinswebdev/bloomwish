import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

import { meditationAudioUrl } from '@/features/meditations/api';
import type { MeditationRow } from '@/lib/supabase/database.types';

/**
 * On-device audio caching: a meditation is downloaded once, then every replay
 * plays the local file — zero egress, instant start, works offline. Cache
 * files are keyed by meditation id (each generation is a new row, so entries
 * are immutable) and live in the OS cache directory, which the system may
 * clear under storage pressure — in which case we simply re-download.
 *
 * Web plays the signed URL directly; the browser's HTTP cache handles it.
 */
export async function getPlayableMeditationUri(
  meditation: Pick<MeditationRow, 'id' | 'audio_url'>
): Promise<string> {
  if (!meditation.audio_url) throw new Error('Meditation has no audio yet');

  if (Platform.OS === 'web') {
    return meditationAudioUrl(meditation.audio_url);
  }

  try {
    const dir = new Directory(Paths.cache, 'meditations');
    if (!dir.exists) dir.create({ intermediates: true });

    const cached = new File(dir, `${meditation.id}.wav`);
    if (cached.exists) {
      return cached.uri;
    }

    const signedUrl = await meditationAudioUrl(meditation.audio_url);
    const downloaded = await File.downloadFileAsync(signedUrl, cached);
    return downloaded.uri;
  } catch (err) {
    // Any cache trouble (full disk, cleared mid-write) falls back to streaming.
    console.warn('meditation cache miss, streaming instead', err);
    return meditationAudioUrl(meditation.audio_url);
  }
}
