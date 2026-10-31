interface ToastProps { message: string; tone?: 'success' | 'error' | 'info'; onClose: () => void; }
export function Toast({ message, tone = 'success', onClose }: ToastProps) { return <div className={`toast toast-${tone}`} role="status"><span>{message}</span><button onClick={onClose} aria-label="Chiudi messaggio">×</button></div>; }
