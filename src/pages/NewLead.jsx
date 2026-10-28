import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, CameraOff, CheckCircle2, Package, Plus, ScanBarcode, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLeads } from '../context/LeadsContext.jsx';
import { BannerHeader, Card } from '../components/ui.jsx';

// Same barcode types as the mobile app (expo-camera barcodeTypes): product
// barcodes only — no QR codes.
const DETECTOR_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'codabar', 'itf'];
const HAS_DETECTOR = typeof window !== 'undefined' && 'BarcodeDetector' in window;
const HAS_CAMERA = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;

/**
 * Product code from a scanned/typed value — same rule as the app: only plain
 * numeric barcodes are accepted. Returns '' when the value is not valid.
 */
export function extractSku(value) {
  const v = String(value ?? '').trim();
  return /^\d+$/.test(v) ? v.slice(0, 40) : '';
}

/**
 * Camera scanner. Uses the browser's BarcodeDetector where available (Chrome
 * on Android) and the ZXing library everywhere else (iPhone Safari, Firefox,
 * desktop), so scanning works on every device like the app.
 */
function Scanner({ onCode, onClose }) {
  const videoRef = useRef(null);
  const [err, setErr] = useState('');
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;

  useEffect(() => {
    let stopped = false;
    let stream;
    let raf;
    let zxingControls;
    let last = { code: '', at: 0 };

    // Ignore the same code seen again within 2 s (a barcode stays in view)
    const emit = (raw) => {
      const now = Date.now();
      if (raw === last.code && now - last.at < 2000) return;
      last = { code: raw, at: now };
      onCodeRef.current(raw);
    };

    const fail = (e) => {
      if (stopped) return;
      setErr(
        e?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow the camera for this site and try again.'
          : e?.name === 'NotFoundError'
            ? 'No camera found on this device. Type the product code below instead.'
            : 'Could not open the camera. The website needs HTTPS to use the camera.',
      );
    };

    (async () => {
      try {
        const video = videoRef.current;
        if (HAS_DETECTOR) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
          if (stopped) return;
          video.srcObject = stream;
          await video.play();
          const supported = (await window.BarcodeDetector.getSupportedFormats?.()) ?? DETECTOR_FORMATS;
          const detector = new window.BarcodeDetector({ formats: DETECTOR_FORMATS.filter((f) => supported.includes(f)) });
          let lastTick = 0;
          const tick = async (ts) => {
            if (stopped) return;
            if (ts - lastTick > 250 && video.readyState >= 2) {
              lastTick = ts;
              try {
                const codes = await detector.detect(video);
                if (codes[0]?.rawValue) emit(codes[0].rawValue);
              } catch {
                /* frame not ready */
              }
            }
            raf = requestAnimationFrame(tick);
          };
          raf = requestAnimationFrame(tick);
        } else {
          // Loaded only when needed, so it doesn't slow down the first page load
          const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
            import('@zxing/browser'),
            import('@zxing/library'),
          ]);
          if (stopped) return;
          const hints = new Map([
            [
              DecodeHintType.POSSIBLE_FORMATS,
              [
                BarcodeFormat.EAN_13,
                BarcodeFormat.EAN_8,
                BarcodeFormat.UPC_A,
                BarcodeFormat.UPC_E,
                BarcodeFormat.CODE_128,
                BarcodeFormat.CODE_39,
                BarcodeFormat.CODE_93,
                BarcodeFormat.CODABAR,
                BarcodeFormat.ITF,
              ],
            ],
            [DecodeHintType.TRY_HARDER, true],
          ]);
          const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 200 });
          zxingControls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            video,
            (result) => {
              if (result && !stopped) emit(result.getText());
            },
          );
          if (stopped) zxingControls.stop();
        }
      } catch (e) {
        fail(e);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="scanner">
      {err ? (
        <p className="scanner-err"><CameraOff size={28} /> {err}</p>
      ) : (
        <>
          <video ref={videoRef} muted playsInline />
          <span className="scan-frame" />
          <p className="scan-hint">Point the camera at the product barcode</p>
        </>
      )}
      <button type="button" className="btn btn--slate btn--block" onClick={onClose}>
        <X size={18} /> Close camera
      </button>
    </div>
  );
}

export default function NewLead() {
  const { user } = useAuth();
  const { createLead } = useLeads();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [remarks, setRemarks] = useState('');
  const [products, setProducts] = useState([]);
  const [manual, setManual] = useState('');
  const [scanning, setScanning] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 'sent' | 'queued'
  const [flash, setFlash] = useState(null); // { tone: 'ok' | 'warn' | 'error', text }

  // Same messages as the app: Product Added / Already Added / Invalid Barcode
  const addSku = useCallback((raw) => {
    const sku = extractSku(raw);
    if (!sku) {
      setFlash({ tone: 'error', text: 'Invalid barcode — please scan the product barcode properly.' });
      return;
    }
    setProducts((p) => {
      if (p.includes(sku)) {
        setFlash({ tone: 'warn', text: `Already added — ${sku} is already in this lead.` });
        return p;
      }
      navigator.vibrate?.(60);
      setFlash({ tone: 'ok', text: `Product added — ${sku}` });
      return [...p, sku];
    });
  }, []);

  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 2200);
    return () => clearTimeout(t);
  }, [flash]);

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Enter the customer name.';
    if (!/^[6-9]\d{9}$/.test(mobile)) e.mobile = 'Enter a valid 10-digit mobile number.';
    if (products.length === 0) e.products = 'Add at least one product.';
    if (!user.storeId) e.form = 'Your store is not set on your profile, so a lead cannot be created.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const status = await createLead({
        mobile,
        customerName: name.trim(),
        // Same as the app: store code as text (siteCode, e.g. "6036")
        storeId: String(user.storeId),
        storeName: user.storeName ?? '',
        salesmanId: user.employeeId,
        salesmanName: user.name ?? '',
        salesmanEmail: user.email ?? '',
        products,
        remarks: remarks.trim(),
        submittedAt: new Date().toISOString(),
        status: 'SUBMITTED',
        origin: 'QR_WALKIN',
      });
      setScanning(false);
      setDone(status);
    } catch (e) {
      setErrors({ form: e.message });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setName('');
    setMobile('');
    setRemarks('');
    setProducts([]);
    setManual('');
    setErrors({});
    setDone(null);
  }

  if (done) {
    return (
      <>
        <BannerHeader eyebrow="WALK-IN" title="New Lead" subtitle="Capture a store enquiry" />
        <div className="page page--narrow">
          <Card className="result">
            <CheckCircle2 size={64} className="ok" />
            <h2>{done === 'sent' ? 'Lead created' : 'Saved on this device'}</h2>
            <p className="muted">{done === 'sent' ? 'The lead has been sent to the CRM.' : "You're offline. It will be sent automatically when you're back online."}</p>
            <div className="result-actions">
              <button type="button" className="btn btn--outline" onClick={reset}>Add another</button>
              <button type="button" className="btn btn--primary" onClick={() => navigate('/leads')}>View leads</button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <BannerHeader eyebrow="WALK-IN" title="New Lead" subtitle="Scan product barcodes and capture the customer" />
      <form className="page page--narrow" onSubmit={submit} noValidate>
        <Card>
          <h2 className="card-title">Customer</h2>
          <label className="label" htmlFor="cn">Customer name</label>
          <input id="cn" className={`input ${errors.name ? 'input--err' : ''}`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" maxLength={80} />
          {errors.name && <p className="form-error">{errors.name}</p>}

          <label className="label" htmlFor="cm">Mobile number</label>
          <input id="cm" className={`input ${errors.mobile ? 'input--err' : ''}`} inputMode="numeric" value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} autoComplete="off" placeholder="10-digit number" />
          {errors.mobile && <p className="form-error">{errors.mobile}</p>}

          <label className="label" htmlFor="cr">Remarks (optional)</label>
          <textarea id="cr" className="input" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} maxLength={300} />
        </Card>

        <Card>
          <h2 className="card-title with-count">
            Products <span className="count">{products.length}</span>
          </h2>

          {scanning ? (
            <Scanner onCode={addSku} onClose={() => setScanning(false)} />
          ) : (
            <button type="button" className="btn btn--primary btn--block btn--lg" onClick={() => setScanning(true)} disabled={!HAS_CAMERA}>
              <Camera size={22} /> <ScanBarcode size={22} /> Scan product barcode
            </button>
          )}
          {!HAS_CAMERA && <p className="small muted">This browser can't use the camera. Type the product code below instead.</p>}
          {flash && (
            <p className={`note ${flash.tone === 'ok' ? 'note--ok' : flash.tone === 'warn' ? 'note--orange' : 'note--red'}`} role="status">
              {flash.text}
            </p>
          )}

          <div className="sku-add">
            <input className="input" inputMode="numeric" placeholder="Enter product code (SKU)" value={manual} onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSku(manual); setManual(''); } }} aria-label="Product code" />
            <button type="button" className="btn btn--outline" onClick={() => { addSku(manual); setManual(''); }} disabled={!manual.trim()}>
              <Plus size={18} /> Add
            </button>
          </div>
          {errors.products && <p className="form-error">{errors.products}</p>}

          <ul className="sku-list">
            {products.map((s) => (
              <li key={s}>
                <Package size={20} /> <span>{s}</span>
                <button type="button" className="icon-btn icon-btn--dark" aria-label={`Remove ${s}`} onClick={() => setProducts((p) => p.filter((x) => x !== s))}>
                  <Trash2 size={18} />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {errors.form && <p className="form-error" role="alert">{errors.form}</p>}
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={busy}>
          {busy ? 'Submitting…' : 'Create Lead'}
        </button>
      </form>
    </>
  );
}
