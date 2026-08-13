import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import { CloudSync, createCloudSync } from '../src/cloud-sync.js';
import type { Database } from '../src/database.types.js';

describe('Supabase cloud sync', () => {
  it('stays disabled unless all three public runtime values are present', () => {
    expect(createCloudSync({})).toBeNull();
    expect(
      createCloudSync({
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_PUBLISHABLE_KEY: 'x',
      }),
    ).toBeNull();
  });

  it('validates the user token before writing owner-scoped rows', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: { id: '3c8de675-9027-4e37-a1d8-47aa22598f00', email: 'test@example.com' } },
      error: null,
    });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn().mockReturnValue({ upsert });
    const client = { auth: { getUser }, from } as unknown as SupabaseClient<Database>;
    const sync = new CloudSync(client, 'user-token');

    await expect(sync.connect()).resolves.toEqual({ ok: true, detail: 'test@example.com' });
    await sync.createSession(
      '7bd33f04-d235-4315-b09d-4f8d36b8d017',
      'Test session',
      'gemini',
      'gemini-3.1-flash-lite',
    );

    expect(getUser).toHaveBeenCalledWith('user-token');
    expect(from).toHaveBeenCalledWith('fouad_ai_sessions');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: '3c8de675-9027-4e37-a1d8-47aa22598f00' }),
      { onConflict: 'id' },
    );
  });

  it('does not write when authentication fails', async () => {
    const from = vi.fn();
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'invalid token' },
        }),
      },
      from,
    } as unknown as SupabaseClient<Database>;
    const sync = new CloudSync(client, 'invalid');

    await expect(sync.connect()).resolves.toEqual({ ok: false, detail: 'invalid token' });
    await sync.createSession('id', 'name', 'gemini', 'model');
    expect(from).not.toHaveBeenCalled();
  });
});
