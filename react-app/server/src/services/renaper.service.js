// Adapter RENAPER - Mock por defecto, listo para SIDI real
// Ley 25.326: no loguear datos sensibles en claro, solo hashes para auditoría

export async function verifyRenaper({ dni, sexo, tramite, cuit }) {
  const provider = process.env.RENAPER_PROVIDER || 'mock';

  if (provider === 'mock') {
    return verifyMock({ dni, sexo, tramite });
  }

  if (provider === 'real') {
    return verifyReal({ dni, sexo, tramite, cuit });
  }

  throw new Error(`RENAPER_PROVIDER desconocido: ${provider}`);
}

async function verifyMock({ dni, sexo, tramite }) {
  // Simula latencia RENAPER 400-700ms
  await new Promise(r => setTimeout(r, 500));

  // Reglas mock:
  // - dni que termina en 0 => RECHAZADO (simula no encontrado)
  // - tramite 00000000000 => RECHAZADO
  // - resto => VERIFICADO
  const sDni = String(dni);
  const sTram = String(tramite);

  if (sDni.endsWith('0') || sTram === '00000000000') {
    return { verified: false, status: 'REJECTED', source: 'mock', reason: 'No coincide con RENAPER (mock)' };
  }

  // Validación extra: sexo debe ser M/F/X, dni 7-8 dígitos, tramite 11
  if (!/^[0-9]{7,8}$/.test(sDni) || !/^[0-9]{11}$/.test(sTram) || !['M','F','X'].includes(sexo)) {
    return { verified: false, status: 'REJECTED', source: 'mock', reason: 'Formato inválido' };
  }

  return {
    verified: true,
    status: 'VERIFIED',
    source: 'mock',
    // En real devolvería: nombre, apellido, fecha_nacimiento, etc. Aquí no devolvemos PII
    verified_at: new Date().toISOString(),
  };
}

async function verifyReal({ dni, sexo, tramite, cuit }) {
  // TODO cuando gestiones convenio SIDI:
  // POST https://sidi.renaper.gob.ar/api/validacion
  // Headers: Authorization: Bearer ${RENAPER_API_KEY}, Content-Type: json
  // Body: { dni, sexo, tramite, cuit }
  // Retorna { verified, ... }
  // Este código ya está preparado, solo completar RENAPER_API_URL y KEY en .env y cambiar PROVIDER a real

  const url = process.env.RENAPER_API_URL;
  const key = process.env.RENAPER_API_KEY;
  if (!url || !key) throw new Error('Falta RENAPER_API_URL o RENAPER_API_KEY para provider real');

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ dni, sexo, tramite, cuit }),
  });
  if (!res.ok) {
    const txt = await res.text();
    return { verified: false, status: 'REJECTED', source: 'real', reason: `RENAPER error ${res.status}: ${txt}` };
  }
  const data = await res.json();
  return { verified: !!data.verified, status: data.verified ? 'VERIFIED' : 'REJECTED', source: 'real', raw: data };
}
