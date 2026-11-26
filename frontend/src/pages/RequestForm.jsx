import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Alert, AuthImage, Field } from '../components';

const MAX = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const DEVICE_TYPES = ['Phone', 'Laptop', 'Tablet', 'Desktop', 'Smartwatch', 'Other'];

// Used for both "New Repair Request" and "Edit Request".
export default function RequestForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState({request_type: 'repair',device_type: '', brand_model: '',description: '',condition: '',imei_serial: '',seller_declared: false,});
  const [existing, setExisting] = useState([]); // photo ids already saved
  const [removed, setRemoved] = useState([]);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api.getRequest(id).then(({ request }) => {
      setForm({request_type: request.request_type || 'repair',device_type: request.device_type, brand_model: request.brand_model,description: request.description,condition: request.condition || '',imei_serial: request.imei_serial || '',seller_declared: Boolean(request.seller_declared),});
      setExisting(request.photo_ids);
      setLoaded(true);
    }).catch((e) => setMessage(e.message));
  }, [id, editing]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach(URL.revokeObjectURL), [previews]);

  const kept = existing.filter((p) => !removed.includes(p));
  const total = kept.length + files.length;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const addFiles = (e) => {
    const picked = Array.from(e.target.files);
    e.target.value = '';
    const bad = picked.find((f) => !['image/jpeg', 'image/png'].includes(f.type));
    const big = picked.find((f) => f.size > MAX_BYTES);
    if (bad) return setErrors({ ...errors, photos: 'Only JPG and PNG photos are allowed.' });
    if (big) return setErrors({ ...errors, photos: `"${big.name}" is larger than 5 MB.` });
    if (total + picked.length > MAX) return setErrors({ ...errors, photos: `You can add at most ${MAX} photos.` });
    setErrors({ ...errors, photos: undefined });
    return setFiles([...files, ...picked]);
  };

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!form.device_type) local.device_type = 'Device type is required.';
    if (!form.brand_model.trim()) local.brand_model = 'Brand / model is required.';
    if (!form.description.trim()) local.description = 'Problem description is required.';
    if (total < 1) local.photos = 'Add at least one photo.';
    if (form.request_type === 'trade_in') {
    if (!form.condition) local.condition = 'Device condition is required.';
    if (!form.imei_serial.trim()) local.imei_serial = 'IMEI or serial number is required.';
    if (!form.seller_declared) local.seller_declared = 'You must confirm the seller declaration.';
    }
    if (Object.keys(local).length) { setErrors(local); setMessage('Please fix the highlighted fields.'); return; }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    files.forEach((f) => fd.append('photos', f));
    if (editing && removed.length) fd.append('remove_photo_ids', removed.join(','));

    setBusy(true);
    setErrors({});
    setMessage('');
    try {
      if (editing) await api.updateRequest(id, fd);
      else await api.createRequest(fd);
      navigate('/requests');
    } catch (err) {
      setErrors(err.fields);
      setMessage(err.message);
    } finally { setBusy(false); }
  };

  if (!loaded) return message ? <Alert>{message}</Alert> : <p className="muted">Loading…</p>;

  return (
    <form className="panel" onSubmit={submit} noValidate>
      <h1>{editing ? 'Edit request' : 'New repair request'}</h1>
      <p className="muted">Describe the problem clearly and add photos so shops can give you an accurate quote.</p>
      <Alert>{message}</Alert>
      <Field label="Request type" error={errors.request_type}>
        <select value={form.request_type} onChange={set('request_type')}>
          <option value="repair">Repair</option>
          <option value="trade_in">Trade-in</option>
        </select>
      </Field>
      <div className="grid-2">
        <Field label="Device type" error={errors.device_type}>
          <select value={form.device_type} onChange={set('device_type')}>
            <option value="">Choose…</option>
            {DEVICE_TYPES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </Field>
        <Field label="Brand / model" error={errors.brand_model}>
          <input value={form.brand_model} onChange={set('brand_model')} placeholder="e.g. Samsung Galaxy A52" />
        </Field>
      </div>
      <Field label="What is wrong?" error={errors.description}>
        <textarea rows={4} value={form.description} onChange={set('description')} placeholder="e.g. Screen cracked after a fall; touch works only on the top half." />
      </Field>
      {form.request_type === 'trade_in' && (
        <>
          <div className="grid-2">
            <Field label="Condition" error={errors.condition}>
              <select value={form.condition} onChange={set('condition')}>
                <option value="">Choose…</option>
                <option value="working">Working</option>
                <option value="partly_working">Partly working</option>
                <option value="dead">Dead</option>
              </select>
            </Field>
            <Field label="IMEI or serial number" error={errors.imei_serial}>
              <input
                value={form.imei_serial}
                onChange={set('imei_serial')}
                placeholder="e.g. 356938035643809"
              />
            </Field>
          </div>
          <Field label="Seller declaration" error={errors.seller_declared}>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={form.seller_declared}
                onChange={(e) => setForm({ ...form, seller_declared: e.target.checked })}
              />
              I own this device and it is not stolen
            </label>
          </Field>
        </>
      )}
      <Field label={`Photos (${total}/${MAX})`} error={errors.photos} hint="JPG or PNG, up to 5 MB each, 1–5 photos">
        <input type="file" accept="image/jpeg,image/png" multiple onChange={addFiles} disabled={total >= MAX} />
      </Field>
      <div className="photo-grid">
        {kept.map((pid) => (
          <div key={`e${pid}`} className="photo-item">
            <AuthImage photoId={pid} alt="Saved photo" />
            <button type="button" className="remove" onClick={() => setRemoved([...removed, pid])} aria-label="Remove photo">×</button>
          </div>
        ))}
        {previews.map((src, i) => (
          <div key={src} className="photo-item">
            <img src={src} alt={`New photo ${i + 1}`} className="thumb" />
            <button type="button" className="remove" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="Remove photo">×</button>
          </div>
        ))}
      </div>
      <div className="actions">
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create request'}</button>
        <button type="button" className="btn ghost" onClick={() => navigate('/requests')}>Back</button>
      </div>
    </form>
  );
}
