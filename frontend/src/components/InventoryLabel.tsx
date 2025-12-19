import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface Props {
  sku: string;
  productName: string;
  onClose: () => void;
}

function InventoryLabel({ sku, productName, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `label-${sku}.png`;
    link.href = url;
    link.click();
  };

  return (
    <div className="modal-overlay">
      <div className="card" style={{ maxWidth: '350px', textAlign: 'center', padding: 'var(--space-xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-md)' }}>SKU Label</h2>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', display: 'inline-block', marginBottom: 'var(--space-md)' }}>
          <QRCodeCanvas ref={canvasRef} value={sku} size={180} />
        </div>
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ fontWeight: 800, fontSize: '20px' }}>{sku}</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>{productName}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-sm)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <button className="button" style={{ flex: 1 }} onClick={() => window.print()}>Print</button>
            <button className="button success" style={{ flex: 1 }} onClick={handleDownload}>Download</button>
          </div>
          <button className="button secondary" style={{ width: '100%' }} onClick={onClose}>Close</button>
        </div>
        
        <style>{`
          @media print {
            .navbar, .navbar *, .main-content > *:not(.modal-overlay), .modal-overlay > *:not(.print-label) {
              display: none !important;
            }
            body { background: white !important; }
            .modal-overlay { position: static; background: white; padding: 0; }
            .card { border: none; box-shadow: none; transform: none; padding: 0 !important; }
            .button { display: none; }
          }
        `}</style>
      </div>
    </div>
  );
}


export default InventoryLabel;
