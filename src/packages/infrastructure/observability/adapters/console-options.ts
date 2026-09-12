export interface ConsoleAdapterOptions {
  service?: string;
  environment?: string;
  write?: (line: string) => void;
}

export function getRuntimeEnvironment(): string {
  return typeof process === "undefined"
    ? "development"
    : process.env.NODE_ENV ?? "development";
}
