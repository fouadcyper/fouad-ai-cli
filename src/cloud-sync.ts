import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types.js';

export interface CloudEnvironment {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_ACCESS_TOKEN?: string;
}

export class CloudSync {
  private userId: string | null = null;
  constructor(
    private readonly client: SupabaseClient<Database>,
    private readonly accessToken: string,
  ) {}

  async connect(): Promise<{ ok: boolean; detail: string }> {
    const { data, error } = await this.client.auth.getUser(this.accessToken);
    if (error || !data.user)
      return { ok: false, detail: error?.message ?? 'No authenticated Supabase user' };
    this.userId = data.user.id;
    return { ok: true, detail: data.user.email ?? data.user.id };
  }

  get connected(): boolean {
    return this.userId !== null;
  }

  async createSession(id: string, name: string, provider: string, model: string): Promise<void> {
    if (!this.userId) return;
    const { error } = await this.client.from('fouad_ai_sessions').upsert(
      {
        id,
        user_id: this.userId,
        name,
        provider,
        model,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) throw error;
  }

  async addMessage(
    sessionId: string,
    role: 'system' | 'user' | 'assistant' | 'tool',
    content: string,
    provider?: string,
    model?: string,
  ): Promise<void> {
    if (!this.userId) return;
    const { error } = await this.client.from('fouad_ai_messages').insert({
      session_id: sessionId,
      user_id: this.userId,
      role,
      content,
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
    });
    if (error) throw error;
  }

  async listSessions() {
    if (!this.userId) return [];
    const { data, error } = await this.client
      .from('fouad_ai_sessions')
      .select('id,name,provider,model,updated_at')
      .is('archived_at', null)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data;
  }
}

export function createCloudSync(environment: CloudEnvironment): CloudSync | null {
  const {
    SUPABASE_URL: url,
    SUPABASE_PUBLISHABLE_KEY: key,
    SUPABASE_ACCESS_TOKEN: token,
  } = environment;
  if (!url || !key || !token) return null;
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  return new CloudSync(client, token);
}
