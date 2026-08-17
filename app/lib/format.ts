export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatDate(value?: string | null) {
  if (!value) return "No date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function relativeDay(value: string, reference: number) {
  const days = Math.max(
    -30,
    Math.round((new Date(value).getTime() - reference) / 86_400_000),
  );
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    days,
    "day",
  );
}
