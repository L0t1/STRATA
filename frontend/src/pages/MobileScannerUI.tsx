import React, { useEffect, useState, useRef } from 'react';
import AccessibleButton from '../components/AccessibleButton';
import { useNotification } from '../context/NotificationContext';
import { Html5QrcodeScanner } from 'html5-qrcode';

function MobileScannerUI() {
  const { notify } = useNotification();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scannedQty, setScannedQty] = useState(1);
  const [isCameraActive, setIsCameraActive] = useState(false);

  useEffect(() => {
    if (!product && !isCameraActive) inputRef.current?.focus();
  }, [product, isCameraActive]);

  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    if (isCameraActive && !product) {
      scanner = new Html5QrcodeScanner("reader", { 
        fps: 20, 
        qrbox: { width: 250, height: 250 } 
      }, false);
      scanner.render((result) => {
        performLookup(result);
        setIsCameraActive(false);
        if (scanner) scanner.clear();
      }, (error) => {});
    }
    return () => {
      if (scanner) scanner.clear();
    };
  }, [isCameraActive, product]);

  const performLookup = async (targetSku?: string) => {
    const finalSku = (targetSku || sku).trim();
    if (!finalSku) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/scanner/lookup/${encodeURIComponent(finalSku.toUpperCase())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setProduct(data);
        setIsCameraActive(false);
      } else {
        notify(data.error || 'SKU not found', 'error');
        if (!targetSku) {
           setSku('');
           inputRef.current?.focus();
        }
      }
    } catch (err) {
      notify('Network error during lookup', 'error');
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') performLookup();
  };

  const handleConfirmAction = async (action: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/scanner/confirm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          sku: product.sku, 
          quantity: scannedQty, 
          action 
        }),
      });
      if (res.ok) {
        notify(`${action.toUpperCase()} operation successful: ${scannedQty} units`);
        setProduct(null);
        setSku('');
        setScannedQty(1);
      } else {
        const data = await res.json();
        notify(data.error || 'Operation failed', 'error');
      }
    } catch (err) {
      notify('Network error during confirmation', 'error');
    }
  };

  return (
    <div className="scanner-page" style={{ 
      padding: 'var(--space-lg)', 
      maxWidth: 600, 
      margin: '0 auto',
      minHeight: 'calc(100vh - 80px)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header className="flex-between" style={{ marginBottom: 'var(--space-xl)' }}>
        <div>
          <h1 style={{ fontSize: '24px' }}>Field Terminal</h1>
          <p className="text-muted" style={{ fontSize: '13px' }}>Asset identification & status sync</p>
        </div>
        <div className={`badge ${isOffline ? 'badge-danger' : 'badge-success'}`} style={{ height: 'fit-content' }}>
          {isOffline ? 'OFFLINE' : 'ONLINE'}
        </div>
      </header>

      {!product ? (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: 'var(--space-xl)',
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          gap: 'var(--space-lg)',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)'
        }}>
          {!isCameraActive ? (
            <>
              <div style={{ fontSize: '64px', filter: 'drop-shadow(0 0 20px var(--color-primary))' }}>📡</div>
              <div>
                <h2 style={{ marginBottom: 'var(--space-xs)' }}>Ready to Scan</h2>
                <p className="text-muted">Enter product SKU or enable camera for QR lookup</p>
              </div>
              
              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                <input 
                  ref={inputRef}
                  className="input"
                  type="text" 
                  value={sku} 
                  onChange={e => setSku(e.target.value.toUpperCase())} 
                  onKeyDown={handleKeyDown}
                  placeholder="SCAN OR TYPE SKU"
                  style={{ 
                    flex: 1, 
                    textAlign: 'center', 
                    fontWeight: 800, 
                    fontSize: '18px', 
                    letterSpacing: '3px',
                    margin: 0,
                    textTransform: 'uppercase'
                  }}
                />
                <button 
                  className="button" 
                  onClick={() => performLookup()} 
                  disabled={loading || isOffline}
                  style={{ padding: '0 24px' }}
                >
                  {loading ? '...' : 'GO'}
                </button>
              </div>

              <div style={{ position: 'relative', margin: 'var(--space-md) 0' }}>
                <hr style={{ borderColor: 'var(--color-border)', opacity: 0.3 }} />
                <span style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)',
                  background: 'var(--color-surface)',
                  padding: '0 12px',
                  fontSize: '12px',
                  color: 'var(--color-text-muted)'
                }}>OR</span>
              </div>

              <button 
                className="button secondary" 
                style={{ width: '100%', borderColor: 'var(--color-primary-light)' }}
                onClick={() => setIsCameraActive(true)}
              >
                🎥 Open Visual Scanner
              </button>
            </>
          ) : (
            <div style={{ width: '100%' }}>
              <div id="reader" style={{ 
                width: '100%', 
                borderRadius: 'var(--radius-lg)', 
                overflow: 'hidden', 
                background: '#000',
                border: '2px solid var(--color-primary)'
              }}></div>
              <button 
                className="button danger" 
                style={{ marginTop: 'var(--space-lg)', width: '100%' }} 
                onClick={() => setIsCameraActive(false)}
              >
                Terminate Scanner
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ 
          borderTop: '4px solid var(--color-primary)', 
          animation: 'slideUp 0.4s ease',
          padding: 'var(--space-lg)'
        }}>
          <div className="flex-between" style={{ alignItems: 'flex-start', marginBottom: 'var(--space-lg)' }}>
            <div>
              <p className="text-primary font-bold" style={{ fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Identified Asset</p>
              <h2 style={{ margin: 0, fontSize: '24px' }}>{product.product_name}</h2>
              <code className="text-muted" style={{ fontSize: '14px' }}>{product.sku}</code>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p className="text-muted" style={{ fontSize: '11px', marginBottom: '4px' }}>Location</p>
              <div className="badge badge-primary" style={{ fontSize: '14px', fontWeight: 800 }}>
                {product.zone}-{product.aisle}-{product.shelf}
              </div>
            </div>
          </div>
          
          <div className="flex-between" style={{ 
            background: 'var(--color-surface-alt)', 
            padding: 'var(--space-md)', 
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)'
          }}>
            <span className="text-muted">Available Inventory</span>
            <span style={{ fontWeight: 800, fontSize: '20px' }} className="text-primary">{product.quantity} <span style={{ fontSize: '12px' }}>{product.unit}</span></span>
          </div>

          {product.pending_tasks?.length > 0 && (
            <div style={{ 
              marginBottom: 'var(--space-lg)', 
              border: '1px solid var(--color-warning)', 
              borderRadius: 'var(--radius-md)', 
              padding: 'var(--space-md)',
              background: 'rgba(245, 158, 11, 0.05)'
            }}>
              <label style={{ 
                color: 'var(--color-warning)', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                fontSize: '13px',
                fontWeight: 700,
                marginBottom: '8px'
              }}>
                🚨 PENDING ALLOCATIONS ({product.pending_tasks.length})
              </label>
              {product.pending_tasks.map((t: any) => (
                <div key={t.id} style={{ 
                  fontSize: '12px', 
                  padding: '8px 0', 
                  borderBottom: '1px solid rgba(245,158,11,0.1)' 
                }} className="flex-between">
                  <span style={{ textTransform: 'uppercase', opacity: 0.8 }}>{t.type.replace('_', ' ')}</span>
                  <span className="font-bold">
                    {(() => {
                      const p = typeof t.payload === 'string' ? JSON.parse(t.payload) : t.payload;
                      return p.quantity ? `${p.quantity} units requested` : 'Action required';
                    })()}
                  </span>
                </div>
              ))}
            </div>
          )}
          
          <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
            <label className="font-bold" style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>TRANSACTION QUANTITY</label>
            <input 
              className="input"
              type="number" 
              value={scannedQty} 
              onChange={e => setScannedQty(parseInt(e.target.value))} 
              min="1"
              style={{ 
                fontSize: '32px', 
                textAlign: 'center', 
                fontWeight: 900, 
                height: '70px',
                background: 'var(--color-bg)',
                color: 'var(--color-primary)'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <button className="button success" style={{ height: 70, fontSize: '16px', fontWeight: 800 }} onClick={() => handleConfirmAction('receive')}>
              STOCK IN
            </button>
            <button className="button warning" style={{ height: 70, fontSize: '16px', fontWeight: 800 }} onClick={() => handleConfirmAction('pick')}>
              STOCK OUT
            </button>
          </div>
          
          <button 
            className="button secondary" 
            style={{ width: '100%', marginTop: 'var(--space-lg)', opacity: 0.6 }}
            onClick={() => { setProduct(null); setSku(''); }}
          >
            Reset Terminal
          </button>
        </div>
      )}
    </div>
  );
}

export default MobileScannerUI;
