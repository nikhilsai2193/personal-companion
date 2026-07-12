export type UploadTarget = {
  url: string;
  method: "PUT";
  headers: Record<string, string>;
};

export interface StorageAdapter {
  upload(
    path: string,
    data: Buffer | Uint8Array,
    contentType: string
  ): Promise<void>;
  // `opts.download`, if set, makes the URL trigger a file download with
  // that filename instead of opening inline (e.g. playing in a <video>).
  getSignedUrl(path: string, opts?: { download?: string }): Promise<string>;
  delete(path: string): Promise<void>;
  // Where a browser should PUT file bytes directly — bypasses the app server
  // so large files clear serverless body-size limits.
  createUploadUrl(path: string, contentType: string): Promise<UploadTarget>;
  stat(path: string): Promise<{ size: number } | null>;
}
