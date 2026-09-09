export type SessionPayload = {
  company_id: number;
  company: string;
  user_id?: number;
  first?: string;
  last?: string;
  privilege?: string;
  privilege_id?: number;
  last_attempt?: number;
};

export type CompanyRow = {
  id: number;
  name: string;
  type: string;
  status: string;
  logo?: string | null;
  website?: string | null;
  house_no?: string | null;
  street?: string | null;
  city?: string | null;
  country?: string | null;
  about?: string | null;
};

export type UserRow = {
  user_id: number;
  first: string;
  last: string;
  email: string | null;
  pass: string | null;
  status: string;
  friendly: string | null;
  face_vector: string | null;
  gender: string | null;
  pre: string | null;
  phone: string | null;
  img?: string | null;
  staff_id?: string | null;
};

export type PrivilegeRow = {
  id: number;
  user_id: number;
  status: string;
  company: number;
  privilege: string;
};

export type AttendanceRow = {
  id: number;
  user_id: number;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  hospital_id: number;
  status: number | null;
  status_text?: string;
  hours_worked?: number | null;
  first_name?: string | null;
  last_name?: string | null;
};

export const COMPANY_OK_STATUSES = [
  "READY",
  "PAID",
  "Demo",
  "Order now",
  "PAY IN 4",
  "Request a Demo",
] as const;
