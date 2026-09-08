CREATE TABLE applications (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company text NOT NULL CHECK (btrim(company) <> ''),
  position text NOT NULL CHECK (btrim(position) <> ''),
  status text NOT NULL DEFAULT 'Applied'
    CHECK (status IN ('Applied', 'Interview', 'Rejected', 'Offer'))
);
