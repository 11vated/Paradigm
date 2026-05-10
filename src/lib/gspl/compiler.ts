export interface QFTCompileResult {
  field_type: string;
  grid_size: number[];
  seed_id: string;
  domain: string;
  parameters: Record<string, unknown>;
}

const FIELD_BY_DOMAIN: Record<string, string> = {
  character: 'DIRAC',
  vfx: 'QED',
  matter: 'QCD',
};

export class GSPLCompiler {
  static compileToQFT(seed: any): QFTCompileResult {
    const domain = String(seed?.$domain ?? seed?.domain ?? 'unknown');
    const override = seed?.genes?.field_type?.value;
    const field_type = typeof override === 'string' ? override : FIELD_BY_DOMAIN[domain] ?? 'SCALAR';
    return {
      field_type,
      grid_size: field_type === 'QCD' ? [8, 8, 8, 8] : [16, 16, 16],
      seed_id: String(seed?.id ?? seed?.$hash ?? 'seed'),
      domain,
      parameters: seed?.genes ?? {},
    };
  }
}
