/**
 * Copyright © 2026 Conform-Edge Quality Consulting LLC. All rights reserved.
 */

import { sendEmail } from '../email';

describe('email delivery truthfulness', () => {
  const originalEnvironment = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnvironment };
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('disabled mode reports that nothing was delivered', async () => {
    process.env.HF_EMAIL_MODE = 'disabled';
    await expect(sendEmail({ to: 'learner@example.com', subject: 'Test', body: 'Body' })).resolves.toBe(false);
  });

  test('accepts delivery only after an HTTPS webhook returns success', async () => {
    process.env.HF_EMAIL_MODE = 'webhook';
    process.env.HF_EMAIL_WEBHOOK_URL = 'https://mail.example.test/send';
    process.env.HF_EMAIL_WEBHOOK_TOKEN = 'a'.repeat(32);
    process.env.HF_EMAIL_FROM = 'training@example.test';
    global.fetch = jest.fn().mockResolvedValue(new Response(null, { status: 202 })) as typeof fetch;

    await expect(sendEmail({ to: 'learner@example.com', subject: 'Test', body: 'Body' })).resolves.toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      new URL('https://mail.example.test/send'),
      expect.objectContaining({ method: 'POST', redirect: 'error' }),
    );
    const request = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({ to: 'learner@example.com', subject: 'Test', text: 'Body' });
  });

  test('rejects an insecure non-local provider endpoint without sending', async () => {
    process.env.HF_EMAIL_MODE = 'webhook';
    process.env.HF_EMAIL_WEBHOOK_URL = 'http://mail.example.test/send';
    process.env.HF_EMAIL_WEBHOOK_TOKEN = 'a'.repeat(32);
    global.fetch = jest.fn() as typeof fetch;

    await expect(sendEmail({ to: 'learner@example.com', subject: 'Test', body: 'Body' })).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
