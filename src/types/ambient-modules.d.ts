declare module 'wav';

declare module 'uuid' {
  export function v4(): string;
}

declare module '@/components/studio/PreviewViewport' {
  const PreviewViewport: any;
  export { PreviewViewport };
  export default PreviewViewport;
}

interface ImportMeta {
  readonly env: Record<string, string | boolean | undefined>;
}
