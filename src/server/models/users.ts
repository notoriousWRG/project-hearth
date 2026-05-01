import type Database from 'better-sqlite3';
import type { User, NewUser } from '../../shared/types.js';

type RawUser = {
  id: number;
  name: string;
  type: string;
  icon: string;
  display_order: number;
};

function mapUser(row: RawUser): User {
  return {
    id: row.id,
    name: row.name,
    type: row.type as User['type'],
    icon: row.icon,
    display_order: row.display_order,
  };
}

export function getAllUsers(db: Database.Database): User[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY display_order ASC').all() as RawUser[];
  return rows.map(mapUser);
}

export function getUserById(db: Database.Database, id: number): User | undefined {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as RawUser | undefined;
  return row ? mapUser(row) : undefined;
}

export function createUser(db: Database.Database, data: NewUser): User {
  const result = db
    .prepare('INSERT INTO users (name, type, icon, display_order) VALUES (?, ?, ?, ?) RETURNING *')
    .get(data.name, data.type, data.icon, data.display_order) as RawUser;
  return mapUser(result);
}

export function updateUser(
  db: Database.Database,
  id: number,
  data: Partial<NewUser>,
): User | undefined {
  const current = getUserById(db, id);
  if (!current) return undefined;
  const merged = { ...current, ...data };
  db.prepare('UPDATE users SET name = ?, type = ?, icon = ?, display_order = ? WHERE id = ?').run(
    merged.name,
    merged.type,
    merged.icon,
    merged.display_order,
    id,
  );
  return getUserById(db, id);
}

export function deleteUser(db: Database.Database, id: number): boolean {
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}

export function reorderUsers(db: Database.Database, orderedIds: number[]): void {
  const update = db.prepare('UPDATE users SET display_order = ? WHERE id = ?');
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id));
  });
  tx();
}
