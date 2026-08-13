/* global fetch, console */
import { createInterface } from 'node:readline/promises';
import process, { stdin, stdout } from 'node:process';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key)
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY only in the current shell.');
const io = createInterface({ input: stdin, output: stdout });
const email = (await io.question('Existing user email: ')).trim();
const confirm = (await io.question(`Type ${email} again to confirm: `)).trim();
io.close();
if (!email || email !== confirm) throw new Error('Confirmation did not match. No changes made.');
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
const users = await fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers });
if (!users.ok) throw new Error(`Unable to list users (${users.status}).`);
const body = await users.json();
const user = body.users?.find(
  (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
);
if (!user) throw new Error('User not found. Register the account first.');
const result = await fetch(`${url}/rest/v1/user_roles?on_conflict=user_id`, {
  method: 'POST',
  headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({ user_id: user.id, role: 'admin', updated_at: new Date().toISOString() }),
});
if (!result.ok) {
  const detail = await result.text();
  if (result.status === 404)
    throw new Error(
      'Table public.user_roles is missing. Apply supabase/schemas/platform.sql to this project, then run this command again.',
    );
  throw new Error(
    `Unable to assign admin role (${result.status})${detail ? `: ${detail.slice(0, 300)}` : '.'}`,
  );
}
console.log(`Admin role assigned to ${email}. No password was read or stored.`);
