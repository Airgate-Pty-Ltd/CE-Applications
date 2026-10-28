import { Router } from 'express';
import { chatHandler } from './chat_handler';

export function edcatAIRouter() {
  const r = Router();
  r.post('/api/ai/chat', chatHandler);
  return r;
}
