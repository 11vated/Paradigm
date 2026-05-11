/**
 * Onboarding Tutorial Component
 * Interactive first-time user experience
 */

import { useState, useEffect } from 'react';

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  action?: () => void;
  target?: string;
}

interface OnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to Paradigm Absolute',
    description:
      'A deterministic synthetic evolution operating system where every digital artifact is a "seed" that can be bred, mutated, evolved, and composed across 27 domains.',
  },
  {
    id: 2,
    title: 'Create Your First Seed',
    description:
      'Seeds are the fundamental unit of creation. Each seed contains genes that define its characteristics. Start by creating a seed in any of the 27 available domains.',
    action: () => {
      // Could trigger seed creation modal
    },
  },
  {
    id: 3,
    title: 'Grow Artifacts',
    description:
      'Once you have a seed, you can "grow" it to produce an artifact. This could be a 3D character, a sprite sheet, a music composition, or any of the 27 domain outputs.',
  },
  {
    id: 4,
    title: 'Mutate and Evolve',
    description:
      'Mutate seeds to create variations, or evolve populations over generations to discover new forms. All operations are deterministic—same seed + same RNG = identical output.',
  },
  {
    id: 5,
    title: 'Breed and Compose',
    description:
      'Breed two seeds to combine their traits, or compose seeds across domains (e.g., turn a character into a sprite, or music into an ecosystem).',
  },
  {
    id: 6,
    title: 'Track Lineage',
    description:
      'Every seed has a complete ancestry chain. View the lineage graph to see how seeds are related, and track royalties through breeding.',
  },
  {
    id: 7,
    title: 'Ready to Create!',
    description:
      'You\'re all set! Start by creating a seed in the Studio tab, or explore the gallery to see examples from all 27 domains.',
  },
];

export function Onboarding({ onComplete, onSkip }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding before
    const seen = localStorage.getItem('paradigm_onboarding_seen');
    if (seen) {
      setHasSeenOnboarding(true);
      onComplete();
    }
  }, [onComplete]);

  const step = STEPS[currentStep];
  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      localStorage.setItem('paradigm_onboarding_seen', 'true');
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('paradigm_onboarding_seen', 'true');
    if (onSkip) onSkip();
    onComplete();
  };

  if (hasSeenOnboarding) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={handleSkip}
    >
      <div
        className="bg-[#1a1a1a] rounded-xl p-8 max-w-lg w-full mx-4 border border-[#333]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-[#888] mb-2">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 bg-[#333] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00E5FF] to-[#00B8D4] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#fff] mb-4">
            {step.title}
          </h2>
          <p className="text-[#ccc] leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              currentStep === 0
                ? 'text-[#444] cursor-not-allowed'
                : 'text-[#888] hover:text-[#fff] hover:bg-[#333]'
            }`}
          >
            ← Previous
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-[#888] hover:text-[#fff] transition-colors"
            >
              Skip Tutorial
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-2 bg-[#00E5FF] text-[#000] rounded-lg font-medium hover:bg-[#00B8D4] transition-colors"
            >
              {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'} →
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        {currentStep === STEPS.length - 1 && (
          <div className="mt-6 pt-6 border-t border-[#333]">
            <p className="text-xs text-[#666] mb-3">Quick Start Shortcuts:</p>
            <div className="flex gap-4 text-xs text-[#888]">
              <kbd className="px-2 py-1 bg-[#333] rounded">N</kbd>
              <span>Create new seed</span>
              <kbd className="px-2 py-1 bg-[#333] rounded">G</kbd>
              <span>Grow selected seed</span>
              <kbd className="px-2 py-1 bg-[#333] rounded">?</kbd>
              <span>Show all shortcuts</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Example Gallery Component
 * Showcase of seeds from all 27 domains
 */

interface ExampleSeed {
  id: string;
  $domain: string;
  $name: string;
  $hash: string;
  preview?: string;
  description: string;
}

const EXAMPLE_SEEDS: ExampleSeed[] = [
  {
    id: 'example-character',
    $domain: 'character',
    $name: 'Warrior Hero',
    $hash: 'abc123...',
    description: 'A battle-hardened warrior with enhanced strength and agility',
  },
  {
    id: 'example-sprite',
    $domain: 'sprite',
    $name: 'Animated Hero',
    $hash: 'def456...',
    description: '16-frame walk cycle with bilateral symmetry',
  },
  {
    id: 'example-music',
    $domain: 'music',
    $name: 'Epic Theme',
    $hash: 'ghi789...',
    description: 'Orchestral composition in D minor, 120 BPM',
  },
  {
    id: 'example-visual2d',
    $domain: 'visual2d',
    $name: 'Fractal Dreams',
    $hash: 'jkl012...',
    description: 'Mandelbrot set with custom color palette',
  },
  {
    id: 'example-geometry3d',
    $domain: 'geometry3d',
    $name: 'Crystalline Structure',
    $hash: 'mno345...',
    description: 'Procedurally generated crystal mesh, 50K tris',
  },
  {
    id: 'example-fullgame',
    $domain: 'fullgame',
    $name: 'Dungeon Crawler',
    $hash: 'pqr678...',
    description: 'Complete HTML5 game with 5 levels and boss battles',
  },
];

interface GalleryProps {
  onSeedSelect: (seedId: string) => void;
}

export function ExampleGallery({ onSeedSelect }: GalleryProps) {
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const filteredSeeds = selectedDomain === 'all'
    ? EXAMPLE_SEEDS
    : EXAMPLE_SEEDS.filter((s) => s.$domain === selectedDomain);

  const domains = ['all', ...Array.from(new Set(EXAMPLE_SEEDS.map((s) => s.$domain)))];

  const handleLoadExample = async (seedId: string) => {
    setLoading(true);
    try {
      // In production, this would fetch and load the example seed
      onSeedSelect(seedId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#fff] mb-2">Example Gallery</h2>
        <p className="text-[#888]">
          Explore examples from all 27 domains. Click "Load" to import any example into your workspace.
        </p>
      </div>

      {/* Domain Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {domains.map((domain) => (
          <button
            key={domain}
            onClick={() => setSelectedDomain(domain)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              selectedDomain === domain
                ? 'bg-[#00E5FF] text-[#000]'
                : 'bg-[#2a2a2a] text-[#888] hover:text-[#fff] hover:bg-[#333]'
            }`}
          >
            {domain === 'all' ? 'All Domains' : domain.charAt(0).toUpperCase() + domain.slice(1)}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSeeds.map((seed) => (
          <div
            key={seed.id}
            className="bg-[#2a2a2a] rounded-xl overflow-hidden border border-[#333] hover:border-[#00E5FF] transition-colors"
          >
            {/* Preview Placeholder */}
            <div className="aspect-video bg-[#1a1a1a] flex items-center justify-center">
              <div className="text-[#444] text-sm">
                {seed.$domain} preview
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs px-2 py-1 bg-[#00E5FF]/20 text-[#00E5FF] rounded">
                  {seed.$domain}
                </span>
                <span className="text-xs text-[#666] font-mono">
                  {seed.$hash.substring(0, 8)}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-[#fff] mb-2">
                {seed.$name}
              </h3>

              <p className="text-sm text-[#888] mb-4">
                {seed.description}
              </p>

              <button
                onClick={() => handleLoadExample(seed.id)}
                disabled={loading}
                className="w-full py-2 bg-[#00E5FF] text-[#000] rounded-lg font-medium hover:bg-[#00B8D4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load Example'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="mt-8 p-4 bg-[#2a2a2a] rounded-xl border border-[#333]">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-[#00E5FF]">27</div>
            <div className="text-sm text-[#888]">Domains</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#00E5FF]">17</div>
            <div className="text-sm text-[#888]">Gene Types</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[#00E5FF]">∞</div>
            <div className="text-sm text-[#888]">Possibilities</div>
          </div>
        </div>
      </div>
    </div>
  );
}
