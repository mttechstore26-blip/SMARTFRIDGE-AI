import { Snowflake } from 'lucide-react';
export function BrandMark({ compact = false }: { compact?: boolean }) { return <div className={`brand-mark ${compact ? 'compact' : ''}`}><span className="brand-icon"><Snowflake size={compact ? 18 : 21} /></span><span><strong>SmartFridge</strong><small>AI</small></span></div>; }
