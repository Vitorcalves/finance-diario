import {getConnection} from './database';

export type Empresa = {
  id: string;
  nome: string;
  cnpj?: string;
  observacao?: string;
  created_at: string;
};

export const listEmpresas = async (): Promise<Empresa[]> => {
  const db = await getConnection();

  const rows = await db.getAllAsync<Empresa>(
    `
        SELECT id, nome, cnpj, observacao, created_at
        FROM empresas
        ORDER BY created_at DESC
    `,
  );

  return rows;
};

export const insertEmpresa = async (empresa: Empresa): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO empresas (id, nome, cnpj, observacao, created_at)
        VALUES (?, ?, ?, ?, ?)
    `,
    [
      empresa.id,
      empresa.nome,
      empresa.cnpj ?? null,
      empresa.observacao ?? null,
      empresa.created_at,
    ],
  );
};

export const deleteEmpresaById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM empresas WHERE id = ?', [id]);
};

export const getEmpresaById = async (id: string): Promise<Empresa | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Empresa>(
    `
        SELECT id, nome, cnpj, observacao, created_at
        FROM empresas
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};

export const updateEmpresa = async (empresa: Empresa): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE empresas
        SET nome = ?,
            cnpj = ?,
            observacao = ?
        WHERE id = ?
    `,
    [empresa.nome, empresa.cnpj ?? null, empresa.observacao ?? null, empresa.id],
  );
};
