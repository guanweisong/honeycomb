// Playwright preloads this only in the guarded, local web-server process.
const siteverify = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Node preloads this fixture synchronously through --require.
const { turnstile } = require("./auth.json");

if (
  process.env.E2E_SEED === "1" &&
  process.env.TURSO_TOKEN === "e2e-local-only" &&
  process.env.TURSO_URL?.startsWith("file:/") &&
  process.env.TURNSTILE_SECRET_KEY === turnstile.secretKey &&
  /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(process.env.AUTH_URL ?? "")
) {
  const fetchFromNetwork = globalThis.fetch;
  globalThis.fetch = async (input, options) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== siteverify) return fetchFromNetwork(input, options);

    const request = new Request(input, options);
    if (request.method !== "POST") return new Response(null, { status: 405 });

    const json = request.headers
      .get("content-type")
      ?.includes("application/json");
    const values = json
      ? await request.json()
      : Object.fromEntries(await request.formData());
    const success =
      values?.secret === turnstile.secretKey &&
      values.response === turnstile.response;
    return Response.json(
      success
        ? { success }
        : {
            success,
            "error-codes": ["invalid-input-response"],
          },
    );
  };
}
