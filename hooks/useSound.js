import { useCallback } from 'react';
import { useAudioPlayer } from 'expo-audio';

// Hook simple para reproducir un sonido puntual (beep/alerta)
// Notas:
// - useAudioPlayer ya gestiona el ciclo de vida del reproductor; no es necesario (ni recomendable) llamar a remove() manualmente.
// - Evitamos mantener un estado "isLoaded" propio: podemos usar player.isLoaded o simplemente llamar a play(),
//   y si aún no cargó, el módulo gestionará el buffering.
export const useSound = (soundFile) => {
  const player = useAudioPlayer(soundFile);

  const playSound = useCallback(async () => {
    if (!player) return;
    try {
      // Si ya está cargado, reseteamos a inicio para asegurar el beep completo.
      if (player.isLoaded) {
        await player.seekTo(0);
      }
      // play() puede ser sin await (devuelve void), pero mantener await no rompe en JS.
      await player.play();
    } catch (error) {
      console.warn('Error al reproducir el sonido:', error);
    }
  }, [player]);

  return { playSound };
};