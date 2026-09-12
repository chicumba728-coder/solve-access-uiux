export const UNLIMITED_ACCESS = -1;

export type AccessPolicyInput = {
  clientActive: boolean;
  blocked: boolean;
  accessLimit: number;
  accessCount: number;
  tolerance: number;
  accessType: 'ENTRY' | 'EXIT';
};

export type AccessDecision = {
  authorized: boolean;
  nextAccessCount: number;
  blocked: boolean;
  result: 'AUTHORIZED' | 'DENIED';
  reason: string;
  extra: boolean;
};

export function decideAccess(input: AccessPolicyInput): AccessDecision {
  if (input.accessType === 'EXIT') {
    return { authorized: input.clientActive, nextAccessCount: input.accessCount, blocked: input.blocked, result: input.clientActive ? 'AUTHORIZED' : 'DENIED', reason: input.clientActive ? 'Saída autorizada' : 'Cliente inativo', extra: false };
  }
  if (!input.clientActive) return { authorized: false, nextAccessCount: input.accessCount, blocked: input.blocked, result: 'DENIED', reason: 'Cliente inativo', extra: false };
  if (input.blocked) return { authorized: false, nextAccessCount: input.accessCount, blocked: true, result: 'DENIED', reason: 'Acesso bloqueado', extra: false };
  if (input.accessLimit === UNLIMITED_ACCESS) return { authorized: true, nextAccessCount: input.accessCount + 1, blocked: false, result: 'AUTHORIZED', reason: 'Acesso ilimitado', extra: false };
  if (input.accessLimit < 0) return { authorized: false, nextAccessCount: input.accessCount, blocked: true, result: 'DENIED', reason: 'Limite de acesso inválido', extra: false };
  const next = input.accessCount + 1;
  const extra = next > input.accessLimit;
  const blocked = next > input.accessLimit + Math.max(0, input.tolerance);
  return { authorized: !blocked, nextAccessCount: next, blocked, result: blocked ? 'DENIED' : 'AUTHORIZED', reason: blocked ? 'Limite de entradas excedido' : extra ? 'Entrada extra autorizada por tolerância' : 'Entrada autorizada', extra };
}

export function renewedAccessLimit(planLessons: number, previousDebt: number): number {
  if (planLessons < 0) return UNLIMITED_ACCESS;
  return Math.max(0, planLessons + Math.min(0, previousDebt));
}