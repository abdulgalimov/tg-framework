import type { ContextAny } from './types';

export function clearCtxBackPayload(ctx: ContextAny) {
  if (ctx.payload && typeof ctx.payload === 'object' && 'back' in ctx.payload) {
    delete (ctx.payload as Record<string, unknown>).back;
  }
}
