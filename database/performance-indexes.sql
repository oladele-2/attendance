-- Run once against the Cloudways MariaDB database.
-- MariaDB supports IF NOT EXISTS, so this is safe to re-run.

CREATE INDEX IF NOT EXISTS idx_attendance_facility_time
  ON attendance (hospital_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_attendance_user_facility_time
  ON attendance (user_id, hospital_id, check_in_time);

CREATE INDEX IF NOT EXISTS idx_attendance_open_shift
  ON attendance (user_id, hospital_id, check_out_time, check_in_time);

CREATE INDEX IF NOT EXISTS idx_privilege_company_status_user
  ON privilege (company, status, user_id);

CREATE INDEX IF NOT EXISTS idx_privilege_user_company
  ON privilege (user_id, company);
