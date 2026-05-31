/**
 * Creator Onboarding — Phase 15
 * 
 * Public-facing guides and onboarding flow for new creators.
 * Goal: Zero-onboarding — new user produces first artifact in <60 seconds.
 */

import { createHash } from 'crypto';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action: 'input' | 'select' | 'confirm' | 'generate';
  options?: string[];
  placeholder?: string;
  estimatedTime: number; // seconds
}

export interface OnboardingFlow {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
  totalTime: number; // seconds
}

export interface CreatorProfile {
  id: string;
  name: string;
  email: string;
  interests: string[];
  experience: 'beginner' | 'intermediate' | 'advanced';
  firstArtifact?: string;
  joinedAt: number;
  tutorialCompleted: boolean;
}

// ─── Onboarding Flows ────────────────────────────────────────────────────────

export const BEGINNER_FLOW: OnboardingFlow = {
  id: 'beginner',
  name: 'First Seed',
  description: 'Create your first seed in 60 seconds',
  totalTime: 60,
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to Paradigm',
      description: 'Paradigm is a deterministic creative platform. Every artifact you create is a seed that can be evolved, bred, and owned.',
      action: 'confirm',
      estimatedTime: 5,
    },
    {
      id: 'choose-domain',
      title: 'What do you want to create?',
      description: 'Pick a domain to start with',
      action: 'select',
      options: ['Game', 'Music', 'Character', 'World', 'Sprite', 'Card Game', 'Board Game'],
      estimatedTime: 10,
    },
    {
      id: 'name-seed',
      title: 'Name your seed',
      description: 'Give your creation a name',
      action: 'input',
      placeholder: 'My First Creation',
      estimatedTime: 5,
    },
    {
      id: 'describe',
      title: 'Describe what you want',
      description: 'A few words about your vision',
      action: 'input',
      placeholder: 'A peaceful floating island at sunset',
      estimatedTime: 15,
    },
    {
      id: 'generate',
      title: 'Generating your seed...',
      description: 'Paradigm is creating your artifact deterministically',
      action: 'generate',
      estimatedTime: 15,
    },
    {
      id: 'complete',
      title: 'Your seed is ready!',
      description: 'You can now evolve, breed, sign, and export your creation.',
      action: 'confirm',
      estimatedTime: 10,
    },
  ],
};

export const ADVANCED_FLOW: OnboardingFlow = {
  id: 'advanced',
  name: 'Power Creator',
  description: 'Full Paradigm workflow in 5 minutes',
  totalTime: 300,
  steps: [
    {
      id: 'welcome',
      title: 'Paradigm Power Setup',
      description: 'Full setup for experienced creators',
      action: 'confirm',
      estimatedTime: 5,
    },
    {
      id: 'wallet',
      title: 'Connect Wallet',
      description: 'Connect your wallet for on-chain sovereignty',
      action: 'input',
      placeholder: '0x...',
      estimatedTime: 30,
    },
    {
      id: 'preferences',
      title: 'Set Preferences',
      description: 'Configure your default domains and quality settings',
      action: 'select',
      options: ['All Domains', 'Games Only', 'Music Only', '3D Art'],
      estimatedTime: 20,
    },
    {
      id: 'corpus',
      title: 'Browse Seed Corpus',
      description: 'Explore the Great Library of 950+ seeds',
      action: 'select',
      estimatedTime: 60,
    },
    {
      id: 'first-composition',
      title: 'Compose Seeds',
      description: 'Combine two seeds into a new creation',
      action: 'generate',
      estimatedTime: 30,
    },
    {
      id: 'sign',
      title: 'Sign Your Seed',
      description: 'Cryptographically sign your creation for provenance',
      action: 'confirm',
      estimatedTime: 15,
    },
    {
      id: 'export',
      title: 'Export Artifact',
      description: 'Export in your preferred format (JSON, GLTF, WAV, PNG, .gseed)',
      action: 'select',
      options: ['JSON', 'GLTF', 'WAV', 'PNG', '.gseed', 'HTML'],
      estimatedTime: 10,
    },
    {
      id: 'complete',
      title: 'You are a Paradigm Creator',
      description: 'Your seeds are sovereign. Own what you create.',
      action: 'confirm',
      estimatedTime: 10,
    },
  ],
};

// ─── Onboarding Manager ──────────────────────────────────────────────────────

export class OnboardingManager {
  private creators: Map<string, CreatorProfile> = new Map();

  startOnboarding(name: string, email: string, experience: CreatorProfile['experience']): CreatorProfile {
    const id = createHash('sha256').update(`${email}:${Date.now()}`).digest('hex').slice(0, 12);
    const profile: CreatorProfile = {
      id,
      name,
      email,
      interests: [],
      experience,
      joinedAt: Date.now(),
      tutorialCompleted: false,
    };
    this.creators.set(id, profile);
    return profile;
  }

  completeStep(creatorId: string, stepId: string): void {
    const creator = this.creators.get(creatorId);
    if (!creator) return;
    if (stepId === 'complete') {
      creator.tutorialCompleted = true;
    }
  }

  setFirstArtifact(creatorId: string, seedHash: string): void {
    const creator = this.creators.get(creatorId);
    if (creator) creator.firstArtifact = seedHash;
  }

  getCreator(creatorId: string): CreatorProfile | undefined {
    return this.creators.get(creatorId);
  }

  getFlowForExperience(experience: CreatorProfile['experience']): OnboardingFlow {
    return experience === 'beginner' ? BEGINNER_FLOW : ADVANCED_FLOW;
  }
}
