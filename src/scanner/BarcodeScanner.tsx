import { useEffect, useRef, useState } from 'react';
import { Camera, Keyboard, X, Zap } from 'lucide-react';

interface BarcodeScannerProps { mode: 'entrata' | 'uscita'; demo?: boolean; onCode: (code: string) => void; onClose: () => void; }

export function BarcodeScanner({ mode, demo = false, onCode, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanLocked = useRef(false);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const acceptCode = (code: string) => {
    if (scanLocked.current || !code.trim()) return;
    scanLocked.current = true;
    controlsRef.current?.stop();
    if (navigator.vibrate) navigator.vibrate(80);
    onCodeRef.current(code.trim());
  };
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraName, setCameraName] = useState('Fotocamera anteriore');
  const [simulated, setSimulated] = useState(demo);

  useEffect(() => {
    if (simulated || !videoRef.current) return;
    let cancelled = false;
    const start = async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const preferred = devices.find((device) => /front|user|face|anteriore|facetime/i.test(device.label)) ?? devices.find((device) => !/back|rear|environment|post/i.test(device.label)) ?? devices[0];
        if (preferred) setCameraName(preferred.label || 'Fotocamera anteriore (preferita)');
        if (!preferred || cancelled || !videoRef.current) throw new Error('Nessuna fotocamera disponibile.');
        controlsRef.current = await reader.decodeFromVideoDevice(preferred.deviceId, videoRef.current, (result) => { if (result && !scanLocked.current) { scanLocked.current = true; controlsRef.current?.stop(); if (navigator.vibrate) navigator.vibrate(80); onCodeRef.current(result.getText()); } });
      } catch (error) {
        if (!cancelled) setCameraError(error instanceof Error ? error.message : 'La fotocamera non è disponibile. Usa l’inserimento manuale.');
      }
    };
    void start();
    return () => { cancelled = true; controlsRef.current?.stop(); controlsRef.current = null; };
  }, [simulated]);

  const submitManual = (event: React.FormEvent) => { event.preventDefault(); acceptCode(manualCode); };
  return <div className="scanner-overlay"><div className="scanner-panel">
    <header className="scanner-header"><div><span className="eyebrow">Modalità {mode === 'entrata' ? 'entrata' : 'uscita'}</span><h2><Camera size={23} /> Scanner prodotto</h2></div><button className="icon-button" onClick={onClose} aria-label="Chiudi scanner"><X /></button></header>
    <div className={`scanner-viewport ${simulated ? 'simulated' : ''}`}>{simulated ? <div className="simulated-scanner"><Zap size={46} /><strong>Scanner simulato</strong><span>Seleziona un codice demo per provare il flusso.</span></div> : <><video ref={videoRef} muted playsInline /><div className="scan-frame" /><div className="scanner-caption">Inquadra un codice EAN-13, EAN-8 o UPC-A</div></>}</div>
    <div className="scanner-toolbar"><button className={`button ${simulated ? 'primary' : 'secondary'}`} onClick={() => setSimulated((value) => !value)}><Zap size={17} /> {simulated ? 'Scansione reale' : 'Modalità demo'}</button><span className="camera-label">{cameraName}</span></div>
    {cameraError && !simulated && <div className="scanner-note">{cameraError}</div>}
    {simulated && <div className="demo-codes"><button onClick={() => acceptCode('8000500310427')}>Latte · 8000500310427</button><button onClick={() => onCode('8001250123456')}>Yogurt · 8001250123456</button><button onClick={() => onCode('8009999000001')}>Nuovo prodotto</button></div>}
    <form className="manual-code" onSubmit={submitManual}><Keyboard size={18} /><input inputMode="numeric" placeholder="Inserisci codice manualmente" value={manualCode} onChange={(event) => setManualCode(event.target.value)} /><button className="button dark" type="submit">Conferma</button></form>
    <p className="scanner-footnote">Il permesso fotocamera viene richiesto solo quando avvii la scansione reale. Le immagini non vengono inviate per la lettura.</p>
  </div></div>;
}
