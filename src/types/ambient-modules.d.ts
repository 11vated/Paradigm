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

declare module '../gspl/compiler.js' {
  export class GSPLCompiler {
    compile(...args: any[]): any;
  }
  export const compile: any;
}

declare module '../gspl/compiler' {
  export class GSPLCompiler {
    compile(...args: any[]): any;
  }
}
