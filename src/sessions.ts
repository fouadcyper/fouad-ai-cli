import { DatabaseSync } from 'node:sqlite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { paths } from './paths.js';
export class Sessions {
  private db?: DatabaseSync;
  async open() {
    await mkdir(paths.data, { recursive: true });
    this.db = new DatabaseSync(path.join(paths.data, 'sessions.sqlite'));
    this.db.exec(
      'PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,session_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE);',
    );
  }
  list() {
    return this.db?.prepare('SELECT * FROM sessions ORDER BY created_at DESC').all() ?? [];
  }
  create(name: string) {
    const id = crypto.randomUUID();
    this.db?.prepare('INSERT INTO sessions VALUES(?,?,?)').run(id, name, new Date().toISOString());
    return id;
  }
  add(sessionId: string, role: string, content: string) {
    this.db
      ?.prepare('INSERT INTO messages(session_id,role,content,created_at) VALUES(?,?,?,?)')
      .run(sessionId, role, content, new Date().toISOString());
  }
  delete(id: string) {
    this.db?.prepare('DELETE FROM sessions WHERE id=?').run(id);
  }
  close() {
    this.db?.close();
  }
}
