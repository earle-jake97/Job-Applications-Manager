export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
import type { ApplicationInput } from './applications.js';

export function parseApplicationInput(body: unknown): { data: ApplicationInput; error?: never } | { error: string; data?: never } {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'An application object is required' };
  }
  const { company, position, jobUrl, dateApplied, notes, location } = body as Record<string, unknown>;
  if (location != null && location !== '' && location !== 'In-office' && location !== 'Hybrid' && location !== 'Remote') {
    return { error: 'Location must be In-office, Hybrid, or Remote' };
  }
  if (typeof company !== 'string' || typeof position !== 'string' || !company.trim() || !position.trim()) {
    return { error: 'Company and position must be non-empty strings' };
  }
  if (jobUrl != null && (typeof jobUrl !== 'string' || (jobUrl.trim() !== '' && !isWebUrl(jobUrl.trim())))) {
    return { error: 'Job URL must use http:// or https://' };
  }
  if (dateApplied != null && (typeof dateApplied !== 'string' || (dateApplied !== '' && !isCalendarDate(dateApplied)))) {
    return { error: 'Date applied must be a valid YYYY-MM-DD date' };
  }
  if (notes != null && typeof notes !== 'string') {
    return { error: 'Notes must be text' };
  }
  return { data: {
    location: location === 'In-office' || location === 'Hybrid' || location === 'Remote' ? location : null,
    company: company.trim(),
    position: position.trim(),
    jobUrl: typeof jobUrl === 'string' ? jobUrl.trim() || null : null,
    dateApplied: typeof dateApplied === 'string' ? dateApplied || null : null,
    notes: typeof notes === 'string' ? notes.trim() : '',
  } };
}
