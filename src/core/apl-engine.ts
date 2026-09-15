/**
 * Motore di Analisi APL (Average Picture Level)
 * Estrazione fotometrica basata sullo standard ITU-R BT.709:
 * Luminanza = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255
 */

export interface AplFrameSample {
  timestampSec: number;
  aplPercent: number;
}

export interface VideoAplResult {
  averageAplPercent: number;
  minAplPercent: number;
  maxAplPercent: number;
  samples: AplFrameSample[];
}

/**
 * Calcola l'APL di un elemento ImageData (Canvas 2D)
 */
export function calcolaImageDataApl(imageData: ImageData): number {
  const data = imageData.data;
  const totalPixels = data.length / 4;
  if (totalPixels === 0) return 0;

  let sumLuminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Formula fotometrica ITU-R BT.709
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    sumLuminance += lum;
  }

  const avg = sumLuminance / totalPixels;
  return Math.round(avg * 1000) / 10; // Percentuale con 1 decimale (es. 28.4%)
}

/**
 * Campiona 30 frame uniformi da un file video ed estrae la media APL
 */
export async function analizzaVideoApl(
  file: File,
  onProgress?: (progressPct: number) => void
): Promise<VideoAplResult> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      reject(new Error('Impossibile inizializzare il contesto Canvas 2D'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || isNaN(duration) || duration <= 0) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Durata video non valida o non leggibile'));
        return;
      }

      // Risoluzione di campionamento ottimizzata per velocità (es. 160x90 px)
      canvas.width = 160;
      canvas.height = 90;

      const numFrames = 30;
      const stepTime = duration / (numFrames + 1);
      const samples: AplFrameSample[] = [];

      try {
        for (let i = 1; i <= numFrames; i++) {
          const seekTime = i * stepTime;
          video.currentTime = seekTime;

          await new Promise<void>((res) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked);
              res();
            };
            video.addEventListener('seeked', onSeeked);
          });

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const frameApl = calcolaImageDataApl(imgData);

          samples.push({
            timestampSec: Math.round(seekTime * 10) / 10,
            aplPercent: frameApl,
          });

          if (onProgress) {
            onProgress(Math.round((i / numFrames) * 100));
          }
        }

        URL.revokeObjectURL(objectUrl);

        const aplValues = samples.map((s) => s.aplPercent);
        const sum = aplValues.reduce((acc, v) => acc + v, 0);
        const averageAplPercent = Math.round((sum / aplValues.length) * 10) / 10;
        const minAplPercent = Math.min(...aplValues);
        const maxAplPercent = Math.max(...aplValues);

        resolve({
          averageAplPercent,
          minAplPercent,
          maxAplPercent,
          samples,
        });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Errore durante il caricamento del video: ${e}`));
    };
  });
}

/**
 * Estrae l'APL da un'immagine statica caricata
 */
export async function analizzaFotoApl(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = Math.round((160 / img.width) * img.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas non disponibile'));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const apl = calcolaImageDataApl(data);
      URL.revokeObjectURL(objectUrl);
      resolve(apl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossibile elaborare il file immagine'));
    };
  });
}
