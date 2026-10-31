import { useEffect, useRef, useState } from 'react';
import { Camera, Keyboard, RefreshCw, X, Zap } from 'lucide-react';
import { validBarcode } from './barcodeValidation';
import { isScannerSoundReady, scannerSound, unlockScannerSound } from './scannerSounds';

interface BarcodeScannerProps { mode: 'entrata' | 'uscita'; demo?: boolean; onCode: (code: string) => void; onClose: () => void; }

export function BarcodeScanner({ mode, demo = false, onCode, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scanLocked = useRef(false);
  const soundEnabled = useRef(isScannerSoundReady());
  const lastValidRead = useRef(Date.now());
  const lastErrorBeep = useRef(0);
  const lastRead = useRef({ code: '', timestamp: 0, count: 0 });
  const acceptCodeRef = useRef<(raw: string, manual?: boolean) => void>(() => {});
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [manualCode, setManualCode] = useState('');
  const [soundReady, setSoundReady] = useState(isScannerSoundReady);
  const [cameraError, setCameraError] = useState('');
  const [cameraName, setCameraName] = useState('Fotocamera anteriore');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [simulated, setSimulated] = useState(demo);
  const [status, setStatus] = useState('Posiziona il codice nella cornice e tienilo fermo.');
  const acceptCode = (raw: string, manual = false) => {
    const code = raw.trim().replace(/\s+/g, '');
    if (scanLocked.current) return;
    if (!validBarcode(code)) {
      if (manual) { setCameraError('EAN/UPC non valido: controlla le cifre e il numero di controllo.'); if (soundEnabled.current) scannerSound('error'); }
      return;
    }
    lastValidRead.current = Date.now();
    if (!manual) {
      const previous = lastRead.current;
      const now = Date.now();
      const count = previous.code === code && now - previous.timestamp < 2000 ? previous.count + 1 : 1;
      lastRead.current = { code, timestamp: now, count };
      if (count < 2) { setStatus('Codice rilevato, tieni fermo un istante…'); return; }
    }
    scanLocked.current = true;
    if (soundEnabled.current) scannerSound('success');
    controlsRef.current?.stop();
    if (navigator.vibrate) navigator.vibrate(80);
    onCodeRef.current(code);
  };

  acceptCodeRef.current = acceptCode;

  useEffect(() => {
    if (simulated || !videoRef.current) return;
    let cancelled = false;
    let activeControls: { stop: () => void } | null = null;
    setCameraError('');
    setStatus('Posiziona il codice nella cornice e tienilo fermo.');
    lastRead.current = { code: '', timestamp: 0, count: 0 };
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { DecodeHintType, BarcodeFormat } = await import('@zxing/library');
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 180, delayBetweenScanSuccess: 300 });
        const constraints: MediaStreamConstraints = { audio: false, video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } };
        activeControls = await reader.decodeFromConstraints(constraints, videoRef.current!, (result) => {
          if (result && !cancelled) acceptCodeRef.current(result.getText());
        });
        if (cancelled) { activeControls.stop(); return; }
        controlsRef.current = activeControls;
        try {
          const available = await BrowserMultiFormatReader.listVideoInputDevices();
          if (!cancelled) {
            setDevices(available);
            const active = videoRef.current?.srcObject as MediaStream | null;
            const activeId = active?.getVideoTracks()[0]?.getSettings().deviceId;
            const found = available.find((device) => device.deviceId === activeId);
            setCameraName(found?.label || (deviceId ? 'Fotocamera selezionata' : 'Fotocamera anteriore'));
          }
        } catch { /* Device labels may be restricted by iOS. */ }
      } catch (error) {
        if (!cancelled) setCameraError(error instanceof Error ? error.message : 'Fotocamera non disponibile: usa il codice manuale.');
      }
    };
    void start();
    return () => { cancelled = true; activeControls?.stop(); controlsRef.current?.stop(); controlsRef.current = null; };
  }, [simulated, deviceId]);

  const nextCamera = () => {
    if (devices.length < 2) return;
    const current = (videoRef.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId;
    const index = devices.findIndex((device) => device.deviceId === current);
    setDeviceId(devices[(index + 1) % devices.length].deviceId);
  };

  useEffect(() => {
    if (simulated) return;
    const timer = window.setInterval(() => {
      if (scanLocked.current || cameraError || !soundEnabled.current || !controlsRef.current) return;
      const now = Date.now();
      if (now - lastValidRead.current >= 7000 && now - lastErrorBeep.current >= 12000) {
        lastErrorBeep.current = now;
        scannerSound('error');
        setStatus('Codice non letto: migliora la luce o prova a spostare la confezione.');
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [simulated, cameraError]);

  const enableSound = async () => {
    const ready = await unlockScannerSound();
    soundEnabled.current = ready;
    setSoundReady(ready);
    if (ready) scannerSound('success');
    else setCameraError('Il browser non ha attivato l’audio. Controlla le impostazioni e riprova.');
  };

  const submitManual = (event: React.FormEvent) => { event.preventDefault(); acceptCode(manualCode, true); };
  return <div className="scanner-overlay"><div className="scanner-panel">
    <header className="scanner-header"><div><span className="eyebrow">Modalità {mode === 'entrata' ? 'entrata' : 'uscita'}</span><h2><Camera size={23} /> Scanner EAN</h2></div><button className="icon-button" onClick={onClose} aria-label="Chiudi scanner"><X /></button></header>
    <div className={`scanner-viewport ${simulated ? 'simulated' : ''}`}>{simulated ? <div className="simulated-scanner"><Zap size={46} /><strong>Scanner simulato</strong><span>Seleziona un codice demo per provare il flusso.</span></div> : <><video ref={videoRef} muted playsInline autoPlay /><div className="scan-frame" /><div className="scanner-caption" role="status">{status}</div></>}</div>
    <div className="scanner-toolbar">
      <button type="button" className="button secondary" onClick={() => void enableSound()}>{soundReady ? "Audio attivo ✓" : "Attiva segnali audio"}</button>
      {devices.length > 1 && !simulated && <button type="button" className="button secondary" onClick={nextCamera}><RefreshCw size={16} /> Cambia fotocamera</button>}
      <span className="camera-label">{cameraName}</span>
      {demo && <button className="button secondary" onClick={() => setSimulated((value) => !value)}><Zap size={16} /> {simulated ? 'Scansione reale' : 'Demo'}</button>}
    </div>
    {cameraError && !simulated && <div className="scanner-note" role="alert">{cameraError}</div>}
    {simulated && <div className="demo-codes"><button onClick={() => acceptCode('8000500310427', true)}>Latte · 8000500310427</button><button onClick={() => acceptCode('8001250123456', true)}>Yogurt · 8001250123456</button></div>}
    <form className="manual-code" onSubmit={submitManual}><Keyboard size={18} /><input inputMode="numeric" pattern="[0-9]*" placeholder="EAN/UPC manuale (8, 12 o 13 cifre)" value={manualCode} onChange={(event) => { setManualCode(event.target.value); setCameraError(''); }} /><button className="button dark" type="submit">Conferma</button></form>
    <p className="scanner-footnote">Per i codici piccoli, avvicina lentamente la confezione finché le barre sono nitide e ben illuminate. La fotocamera frontale dell'iPad Air 2 ha limiti fisici di messa a fuoco. I fotogrammi non vengono caricati sul server.</p>
  </div></div>;
}
