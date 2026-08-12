export function getPasskeyConfig(authURL: string) {
  const url = new URL(authURL);

  return {
    rpID: url.hostname,
    rpName: "guanweisong.com",
    origin: url.origin,
  };
}
