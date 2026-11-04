// Small validation helpers. Each returns an object of field -> message (empty when valid).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isBlank = (v) => v === undefined || v === null || String(v).trim() === '';

function required(body, fields) {
  const errors = {};
  for (const [field, label] of Object.entries(fields)) {
    if (isBlank(body[field])) errors[field] = `${label} is required.`;
  }
  return errors;
}

function respondIfErrors(res, errors) {
  if (Object.keys(errors).length) {
    res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });
    return true;
  }
  return false;
}

module.exports = { EMAIL_RE, isBlank, required, respondIfErrors };
