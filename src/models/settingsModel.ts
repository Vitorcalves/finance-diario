import {getConnection} from './database';

const MONTHLY_INCOME_KEY = 'monthly_income';

type SettingRow = {
  value: string;
};

export const getMonthlyIncome = async (): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<SettingRow>('SELECT value FROM settings WHERE key = ?', [
    MONTHLY_INCOME_KEY,
  ]);

  if (!row?.value) {
    return 0;
  }

  const numeric = Number(row.value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const saveMonthlyIncome = async (value: number): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `,
    [MONTHLY_INCOME_KEY, String(value)],
  );
};
