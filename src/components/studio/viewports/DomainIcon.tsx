import { Dna, Music, Code2, FileText, Gamepad2, Activity } from 'lucide-react';

const ICONS: Record<string, any> = {
  music: Music, audio: Music,
  narrative: FileText, circuit: Code2, procedural: Code2,
  physics: Activity, ecosystem: Activity, alife: Activity,
  fullgame: Gamepad2, game: Gamepad2,
};

export default function DomainIcon({ domain, className }: { domain?: string; className?: string }) {
  const Icon = (domain && ICONS[domain]) || Dna;
  return <Icon className={className || 'w-6 h-6'} />;
}
