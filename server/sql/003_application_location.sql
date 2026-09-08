BEGIN;

ALTER TABLE applications
  ADD COLUMN location text
    CHECK (location IN ('In-office', 'Hybrid', 'Remote'));

-- Include location when detecting meaningful changes to an application.
CREATE OR REPLACE FUNCTION set_application_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(NEW.company, NEW.position, NEW.status, NEW.job_url, NEW.date_applied, NEW.notes, NEW.location)
     IS DISTINCT FROM
     ROW(OLD.company, OLD.position, OLD.status, OLD.job_url, OLD.date_applied, OLD.notes, OLD.location) THEN
    NEW.updated_at = clock_timestamp();
  ELSE
    NEW.updated_at = OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
