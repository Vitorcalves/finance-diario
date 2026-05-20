export interface Migration {
  id: number;
  name: string;
  sql: string;
  reverseSql?: string;
}
