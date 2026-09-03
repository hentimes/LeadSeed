/**
 * Documento offscreen: unico contexto donde MV3 permite reproducir audio
 * con la extension cerrada. El tono se sintetiza con WebAudio para no
 * depender de un archivo de sonido embebido.
 */

function playChime(): void {
  const context = new AudioContext();
  const now = context.currentTime;

  // Dos notas ascendentes cortas: se distingue de los sonidos del sistema
  // sin resultar estridente.
  for (const [index, frequency] of [880, 1174.66].entries()) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    const startAt = now + index * 0.12;
    const endAt = startAt + 0.18;

    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.22, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(endAt);
  }

  window.setTimeout(() => {
    void context.close();
  }, 600);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'PLAY_ALERT_SOUND') {
    playChime();
  }
});
