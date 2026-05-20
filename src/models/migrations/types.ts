import { SQLiteDatabase } from 'expo-sqlite';

export interface Migration {
  id: number;
  name: string;
  up: (db: SQLiteDatabase) => Promise<void>;
  down?: (db: SQLiteDatabase) => Promise<void>;
}
