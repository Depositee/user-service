export function fallbackRoute({
  path,
  set,
}: {
  path: string;
  set: { status: number };
}) {
  set.status = 404;
  return `Route ${path} not found\nHeaders : ${JSON.stringify(set)}`;
}
