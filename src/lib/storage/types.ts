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
  getSignedUrl(path: string): Promise<string>;
  delete(path: string): Promise<void>;
  // Where a browser should PUT file bytes directly — bypasses the app server
  // so large files clear serverless body-size limits.
  createUploadUrl(path: string, contentType: string): Promise<UploadTarget>;
  stat(path: string): Promise<{ size: number } | null>;
}
