import { useEffect, useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  MessageSquare,
  FileCode,
  Dna,
  Image as ImageIcon,
  Library,
  GitBranch,
  Network,
  Shuffle,
  TrendingUp,
  Heart,
  Download,
  Coins,
  Bot,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (tab: string) => void;
  onBottomNavigate: (tab: string | null) => void;
}

const PANEL_ACTIONS = [
  { id: 'chat', label: 'Open Chat', icon: MessageSquare, category: 'panels' },
  { id: 'editor', label: 'Open GSPL Editor', icon: FileCode, category: 'panels' },
  { id: 'genes', label: 'Open Gene Editor', icon: Dna, category: 'panels' },
  { id: 'gallery', label: 'Open Gallery', icon: ImageIcon, category: 'panels' },
  { id: 'library', label: 'Open Library', icon: Library, category: 'panels' },
  { id: 'lineage', label: 'Open Lineage', icon: GitBranch, category: 'panels' },
  { id: 'topology', label: 'Open Topology', icon: Network, category: 'panels' },
];

const BOTTOM_ACTIONS = [
  { id: 'compose', label: 'Open Compose', icon: Shuffle, category: 'tools' },
  { id: 'evolve', label: 'Open Evolve', icon: TrendingUp, category: 'tools' },
  { id: 'breed', label: 'Open Breed', icon: Heart, category: 'tools' },
  { id: 'export', label: 'Open Export', icon: Download, category: 'tools' },
  { id: 'mint', label: 'Open Mint', icon: Coins, category: 'tools' },
  { id: 'agent', label: 'Open Agent', icon: Bot, category: 'tools' },
];

export function CommandPalette({ open, onOpenChange, onNavigate, onBottomNavigate }: CommandPaletteProps) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from props; effect is correct
    if (!open) setSearch('');
  }, [open]);

  const handleSelect = (id: string, category: string) => {
    if (category === 'panels') {
      onNavigate(id);
    } else {
      onBottomNavigate(id);
    }
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search panels, tools…"
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Panels">
          {PANEL_ACTIONS.map((action) => (
            <CommandItem
              key={action.id}
              onSelect={() => handleSelect(action.id, action.category)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Tools">
          {BOTTOM_ACTIONS.map((action) => (
            <CommandItem
              key={action.id}
              onSelect={() => handleSelect(action.id, action.category)}
            >
              <action.icon className="mr-2 h-4 w-4" />
              <span>{action.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
