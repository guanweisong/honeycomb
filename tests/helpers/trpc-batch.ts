export interface TrpcBatchRequest {
  url: string;
  method: string;
  body: string | null;
}

export interface TrpcBatchCall {
  procedure: string;
  input: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapInput(value: unknown): unknown {
  return isRecord(value) && "json" in value ? value.json : value;
}

export function decodeTrpcBatchRequest(
  request: TrpcBatchRequest,
): TrpcBatchCall[] {
  const url = new URL(request.url);
  const procedures = (url.pathname.split("/").at(-1) ?? "").split(",");
  const rawInput =
    request.method === "GET" ? url.searchParams.get("input") : request.body;
  const parsed: unknown = rawInput ? JSON.parse(rawInput) : {};
  const inputs = isRecord(parsed) ? parsed : {};

  return procedures.map((procedure, index) => ({
    procedure,
    input: unwrapInput(inputs[String(index)]),
  }));
}
