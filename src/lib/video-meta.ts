// Lee duración y dimensiones de un fichero de vídeo en el navegador y
// captura un fotograma como miniatura JPEG. Todo en cliente, sin subir nada.

export type VideoMeta = { duration: number; width: number; height: number };

function loadVideo(file: File): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error("El navegador no puede leer este vídeo"));
  });
}

export async function readVideoMeta(file: File): Promise<VideoMeta & { video: HTMLVideoElement }> {
  const video = await loadVideo(file);
  return {
    video,
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
  };
}

// Captura el fotograma del segundo 1 (o la mitad si el vídeo es más corto).
// Espera al evento `seeked`: con `loadedmetadata` la miniatura sale negra.
export function captureThumbnail(video: HTMLVideoElement, maxWidth = 640): Promise<Blob | null> {
  return new Promise((resolve) => {
    const t = Math.min(1, video.duration / 2);
    const timeout = setTimeout(() => resolve(null), 5000);

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const scale = Math.min(1, maxWidth / video.videoWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
      } catch {
        resolve(null);
      }
    };
    video.currentTime = t;
  });
}

// PUT con XMLHttpRequest: fetch no expone el progreso de subida.
export function putWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`La subida falló (HTTP ${xhr.status})`));
    xhr.onerror = () =>
      reject(new Error("Error de red al subir. Si es en local, revisa el CORS del bucket."));
    xhr.send(body);
  });
}
