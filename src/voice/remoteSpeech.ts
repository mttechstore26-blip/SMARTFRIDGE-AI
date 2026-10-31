const DEFAULT_ENDPOINT = 'https://smartfridge-sync.207-180-244-108.sslip.io';
export type CapturedVoice = { stop: () => void };
export async function startRemoteVoice(
  endpoint: string,
  token: string,
  onTranscript: (text: string) => void,
  onError: (message: string) => void
): Promise<CapturedVoice> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined')
    throw new Error('Registrazione audio non supportata da questa web app.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const mimeType = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
  let recorder: MediaRecorder;
  try { recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); }
  catch (error) { stream.getTracks().forEach(track => track.stop()); throw error; }
  const chunks: Blob[] = [];
  let finished = false;
  let timeout = 0;
  const finish = () => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timeout);
    if (recorder.state !== 'inactive') recorder.stop();
    stream.getTracks().forEach(track => track.stop());
  };
  recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
  recorder.onerror = () => { onError('Errore durante la registrazione audio.'); finish(); };
  recorder.onstop = () => {
    stream.getTracks().forEach(track => track.stop());
    if (!chunks.length) { onError('Nessun audio registrato.'); return; }
    const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' });
    if (blob.size > 3_000_000) { onError('Registrazione troppo lunga.'); return; }
    const base = (endpoint || DEFAULT_ENDPOINT).replace(/\/$/, '');
    const form = new FormData();
    form.append('audio', blob, blob.type.includes('mp4') ? 'command.m4a' : 'command.webm');
    void fetch(base + '/api/transcribe', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token },
      body: form, cache: 'no-store'
    }).then(async response => {
      if (!response.ok) throw new Error(response.status === 404 ? 'Il servizio vocale non è ancora installato sulla VPS.' : 'Trascrizione non disponibile (' + response.status + ').');
      const data = await response.json() as { text?: string };
      if (!data.text?.trim()) throw new Error('Non ho riconosciuto parole nella registrazione.');
      onTranscript(data.text.trim());
    }).catch(error => onError(error instanceof Error ? error.message : 'Trascrizione non riuscita.'));
  };
  recorder.start();
  timeout = window.setTimeout(finish, 10000);
  return { stop: finish };
}
