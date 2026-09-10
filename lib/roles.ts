export function isAdminRole(privilege?: string | null) {
  const role = String(privilege ?? "").trim().toLowerCase();
  return role === "ceo" || role === "admin";
}
