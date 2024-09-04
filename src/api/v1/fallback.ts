import { commonHeaders } from "../../utils";

export function fallbackRoute({
  path,
  set,
}: {
  path: string;
  set: { status: number; headers: Record<string, string> };
}) {
  set.headers = commonHeaders;
  set.status = 404;
  return `Route ${path} not found\nHeaders : ${JSON.stringify(set)}`;
}
