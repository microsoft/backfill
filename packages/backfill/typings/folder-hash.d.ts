declare module "folder-hash" {
  export function hashElement(
    name: string,
    options: { [key: string]: any }
  ): Promise<{ hash: string }>;
}
