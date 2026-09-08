import { pool } from "./db.js";

type ApplicationRow = {
  id: number;
  company: string;
  position: string;
  status: string;
  jobUrl: string | null;
  dateApplied: string | null;
  notes: string;
  updatedAt: Date | null;
};

export type ApplicationDetails = {
  jobUrl?: string | null;
  dateApplied?: string | null;
  notes?: string;
};

export type ApplicationInput = {
  company: string;
  position: string;
  jobUrl: string | null;
  dateApplied: string | null;
  notes: string;
};

// Explicit formatting keeps a calendar date out of JavaScript timezone conversion.
const columns = `id, company, position, status,
  job_url AS "jobUrl", to_char(date_applied, 'YYYY-MM-DD') AS "dateApplied",
  notes, updated_at AS "updatedAt"`;

export async function listApplications() {
  const result = await pool.query<ApplicationRow>(
    `SELECT ${columns} FROM applications ORDER BY id`,
  );
  return result.rows;
}

export async function createApplication(company: string, position: string, details: ApplicationDetails = {}) {
  const result = await pool.query<ApplicationRow>(
    `INSERT INTO applications (company, position, job_url, date_applied, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${columns}`,
    [company, position, details.jobUrl ?? null, details.dateApplied ?? null, details.notes ?? ''],
  );

  return result.rows[0];
}

export async function updateApplicationStatus(id: number, status: string): Promise<ApplicationRow | undefined> {
  const result = await pool.query<ApplicationRow>(
    `UPDATE applications
       SET status = $1
       WHERE id = $2
       RETURNING ${columns}`,
    [status, id],
  );

  return result.rows[0];
}

export async function deleteApplication(id: number): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM applications WHERE id = $1",
    [id],
  );
  return result.rowCount === 1;
}

export async function updateApplicationDetails(id: number, details: ApplicationInput): Promise<ApplicationRow | undefined> {
  const result = await pool.query<ApplicationRow>(
    `UPDATE applications
     SET company = $1, position = $2, job_url = $3, date_applied = $4, notes = $5
     WHERE id = $6
     RETURNING ${columns}`,
    [details.company, details.position, details.jobUrl, details.dateApplied, details.notes, id],
  );
  return result.rows[0];
}
