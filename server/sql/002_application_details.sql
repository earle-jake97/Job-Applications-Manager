BEGIN;

ALTER TABLE applications
  ADD COLUMN job_url text,
  ADD COLUMN date_applied date,
  ADD COLUMN notes text NOT NULL DEFAULT '',
  ADD COLUMN updated_at timestamptz;

-- Existing rows have no known update time. Defaults affect future inserts only.
ALTER TABLE applications
  ALTER COLUMN updated_at SET DEFAULT clock_timestamp();

CREATE FUNCTION set_application_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(NEW.company, NEW.position, NEW.status, NEW.job_url, NEW.date_applied, NEW.notes)
     IS DISTINCT FROM
     ROW(OLD.company, OLD.position, OLD.status, OLD.job_url, OLD.date_applied, OLD.notes) THEN
    NEW.updated_at = clock_timestamp();
  ELSE
    NEW.updated_at = OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER application_updated_at
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION set_application_updated_at();

COMMIT;
