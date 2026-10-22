export interface MediaStorage {
  getPresignedUrl(input: {
    Key: string;
    ContentType: string;
    ContentLength: number;
  }): Promise<string>;
  putValidatedObject(
    key: string,
    bytes: Uint8Array,
    type: string,
  ): Promise<void>;
  headObject(
    key: string,
  ): Promise<{ size: number | undefined; type: string | undefined } | null>;
  readObject(key: string, maxBytes: number): Promise<Uint8Array>;
  deleteObjects(keys: readonly string[]): Promise<void>;
}
