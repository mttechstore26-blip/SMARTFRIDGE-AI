export type SpeechResultEvent = { results: ArrayLike<(ArrayLike<{ transcript: string }> & { isFinal: boolean })> };
export type SpeechRecognitionConstructor = new () => SpeechRecognition;
export type SpeechRecognition = { lang: string; interimResults: boolean; continuous: boolean; onresult: ((event: SpeechResultEvent) => void) | null; onerror: ((event: Event) => void) | null; onend: (() => void) | null; onspeechend: (() => void) | null; start: () => void; stop: () => void };

declare global { interface Window { webkitSpeechRecognition?: SpeechRecognitionConstructor; SpeechRecognition?: SpeechRecognitionConstructor; } }

export function getSpeechRecognition(): SpeechRecognition | null {
  const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
}

export function speakItalian(text: string) {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'it-IT';
  window.speechSynthesis.speak(utterance);
  return true;
}
