import { redirect } from "next/navigation";

export default async function DutyRedirect({
  searchParams,
}: {
  searchParams: Promise<{ hours?: string; notice?: string; error?: string }>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  if (params.hours) q.set("hours", params.hours);
  if (params.notice) q.set("notice", params.notice);
  if (params.error) q.set("error", params.error);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  redirect(`/onduty${suffix}`);
}
