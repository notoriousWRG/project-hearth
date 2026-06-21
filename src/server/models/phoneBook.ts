import type Database from 'better-sqlite3';
import type { PhoneBookEntry, NewPhoneBookEntry } from '../../shared/types.js';

type PhoneBookRow = {
  id: number;
  name: string;
  phone: string;
  emoji: string;
  position: number;
};

function toEntry(row: PhoneBookRow): PhoneBookEntry {
  return { id: row.id, name: row.name, phone: row.phone, emoji: row.emoji, position: row.position };
}

export function listPhoneBook(db: Database.Database): PhoneBookEntry[] {
  const rows = db
    .prepare('SELECT * FROM phone_book ORDER BY position ASC, id ASC')
    .all() as PhoneBookRow[];
  return rows.map(toEntry);
}

export function createPhoneBookEntry(
  db: Database.Database,
  data: NewPhoneBookEntry,
): PhoneBookEntry {
  const nextPos = (
    db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM phone_book').get() as {
      pos: number;
    }
  ).pos;
  const position = data.position ?? nextPos;
  const info = db
    .prepare('INSERT INTO phone_book (name, phone, emoji, position) VALUES (?, ?, ?, ?)')
    .run(data.name, data.phone, data.emoji ?? '', position);
  return toEntry(
    db.prepare('SELECT * FROM phone_book WHERE id = ?').get(info.lastInsertRowid) as PhoneBookRow,
  );
}

export function updatePhoneBookEntry(
  db: Database.Database,
  id: number,
  data: Partial<NewPhoneBookEntry>,
): PhoneBookEntry {
  const row = db.prepare('SELECT * FROM phone_book WHERE id = ?').get(id) as
    | PhoneBookRow
    | undefined;
  if (!row) throw new Error(`Phone book entry ${id} not found`);
  const updated = { ...row, ...data };
  db.prepare('UPDATE phone_book SET name = ?, phone = ?, emoji = ?, position = ? WHERE id = ?').run(
    updated.name,
    updated.phone,
    updated.emoji,
    updated.position,
    id,
  );
  return toEntry(db.prepare('SELECT * FROM phone_book WHERE id = ?').get(id) as PhoneBookRow);
}

export function deletePhoneBookEntry(db: Database.Database, id: number): void {
  db.prepare('DELETE FROM phone_book WHERE id = ?').run(id);
}
