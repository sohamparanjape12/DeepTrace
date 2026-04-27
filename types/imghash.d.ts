declare module 'imghash' {
  export function hash(filepath: string | Buffer, bits?: number, format?: 'hex' | 'binary'): Promise<string>;
}
