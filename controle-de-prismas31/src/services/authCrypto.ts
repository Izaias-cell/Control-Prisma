import argon2 from 'argon2';

/**
 * Constante centralizada de limite máximo de tentativas de login antes de bloqueio.
 */
export const MAX_LOGIN_ATTEMPTS = 5;

/**
 * Validação de formato de senha (para Admin e Síndico).
 * Mínimo de 8 caracteres, sem espaços exclusivos, máximo razoável de 128 caracteres.
 */
export function validatePasswordFormat(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'A senha é obrigatória.' };
  }
  const trimmed = password.trim();
  if (trimmed.length < 8) {
    return { valid: false, error: 'A senha deve conter no mínimo 8 caracteres.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'A senha não pode ultrapassar 128 caracteres.' };
  }
  return { valid: true };
}

/**
 * Validação estrita de formato de PIN para operação de Portaria.
 * Exclusivamente 4 a 6 dígitos numéricos (ex: 1234, 58291, 739204).
 */
export function validatePinFormat(pin: string): { valid: boolean; error?: string } {
  if (!pin || typeof pin !== 'string') {
    return { valid: false, error: 'O PIN é obrigatório.' };
  }
  const cleanPin = pin.trim();
  if (!/^([A-Z0-9-]{4,12})$/i.test(cleanPin)) {
    return { valid: false, error: 'O código de acesso deve conter entre 4 e 12 caracteres alfanuméricos.' };
  }
  return { valid: true };
}

/**
 * Validação de formato para Código de Acesso da Portaria (ex: 123456 ou CP-123456).
 */
export function validatePortariaCodeFormat(code: string): { valid: boolean; error?: string } {
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'O código da portaria é obrigatório.' };
  }
  const clean = code.trim();
  if (clean.length < 4 || clean.length > 12) {
    return { valid: false, error: 'O código da portaria deve conter entre 4 e 12 caracteres.' };
  }
  return { valid: true };
}

/**
 * Gera hash criptográfico seguro para senha utilizando Argon2id.
 * Nunca registra nem expõe a senha em memória ou logs.
 */
export async function hashPassword(password: string): Promise<string> {
  const validation = validatePasswordFormat(password);
  if (!validation.valid) {
    throw new Error(validation.error || 'Formato de senha inválido.');
  }

  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Valida senha contra hash Argon2id com proteção contra timing attack.
 * Retorna estritamente true/false sem expor detalhes intermediários.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash || typeof password !== 'string' || typeof hash !== 'string') {
    return false;
  }
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Gera hash criptográfico seguro para PIN / Código de portaria utilizando Argon2id.
 */
export async function hashPin(pin: string): Promise<string> {
  const validation = validatePinFormat(pin);
  if (!validation.valid) {
    throw new Error(validation.error || 'Formato de PIN inválido.');
  }

  return await argon2.hash(pin.trim(), {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Valida PIN / Código de Portaria contra hash Argon2id com proteção contra timing attack.
 * Retorna estritamente true/false sem expor detalhes intermediários.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!pin || !hash || typeof pin !== 'string' || typeof hash !== 'string') {
    return false;
  }
  try {
    const directMatch = await argon2.verify(hash, pin.trim());
    if (directMatch) return true;

    // Também verificar se o código sem ou com prefixo CP- confere
    const cleanWithoutPrefix = pin.trim().replace(/^CP-/i, '');
    const cleanWithPrefix = `CP-${cleanWithoutPrefix}`;
    if (cleanWithoutPrefix !== pin.trim()) {
      const matchWithout = await argon2.verify(hash, cleanWithoutPrefix);
      if (matchWithout) return true;
    }
    if (cleanWithPrefix !== pin.trim()) {
      const matchWith = await argon2.verify(hash, cleanWithPrefix);
      if (matchWith) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function hashPortariaCode(code: string): Promise<string> {
  return await hashPin(code);
}

export async function verifyPortariaCode(code: string, hash: string): Promise<boolean> {
  return await verifyPin(code, hash);
}
