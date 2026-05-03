/**
 * Swarm Runtime — Multi-agent swarm intelligence
 * Phase II.2: Parallel agents collaborating on generative tasks
 *
 * Features:
 * - Multiple SeedAgents working in parallel
 * - Shared memory/state between agents
 * - Task distribution and coordination
 * - Emergent behavior from agent interactions
 * - Fault tolerance and agent recovery
 */

import { SeedAgent, type AgentConfig, type AgentState } from './seed-agent';
import type { Seed, Artifact } from './engines';

// Swarm configuration
export interface SwarmConfig {
  swarmId: string;
  maxAgents: number;
  minAgents: number;
  strategy: 'parallel' | 'sequential' | 'hierarchical' | 'mesh';
  taskTimeout: number; // ms
  retryFailed: boolean;
  verbose: boolean;
}

// Task definition
export interface SwarmTask {
  id: string;
  goal: string;
  priority: number;
  assignedAgent?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: SwarmTaskResult;
  dependencies?: string[]; // Task IDs that must complete first
  retries: number;
}

export interface SwarmTaskResult {
  success: boolean;
  artifacts: Artifact[];
  reasoning: string;
  agentId: string;
  executionTime: number;
}

// Agent status
export interface SwarmAgentStatus {
  agentId: string;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentTask?: string;
  tasksCompleted: number;
  totalTime: number;
  lastHeartbeat: number;
}

/**
 * SwarmRuntime — Main orchestrator
 */
export class SwarmRuntime {
  private config: SwarmConfig;
  private agents: Map<string, SeedAgent> = new Map();
  private agentStatus: Map<string, SwarmAgentStatus> = new Map();
  private taskQueue: SwarmTask[] = [];
  private completedTasks: SwarmTask[] = [];
  private sharedMemory: Map<string, any> = new Map();
  private running: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(config: Partial<SwarmConfig> = {}) {
    this.config = {
      swarmId: `swarm_${Date.now()}`,
      maxAgents: 5,
      minAgents: 1,
      strategy: 'parallel',
      taskTimeout: 60000, // 1 minute
      retryFailed: true,
      verbose: false,
      ...config,
    };
  }

  /**
   * Initialize the swarm with agents
   */
  async initialize(agentConfigs: Partial<AgentConfig>[]): Promise<void> {
    const count = Math.min(agentConfigs.length, this.config.maxAgents);

    for (let i = 0; i < count; i++) {
      const agentId = `agent_${i + 1}`;
      const agent = new SeedAgent({
        ...agentConfigs[i],
        verbose: this.config.verbose,
      });

      this.agents.set(agentId, agent);
      this.agentStatus.set(agentId, {
        agentId,
        status: 'idle',
        tasksCompleted: 0,
        totalTime: 0,
        lastHeartbeat: Date.now(),
      });
    }

    if (this.config.verbose) {
      console.log(`[Swarm ${this.config.swarmId}] Initialized with ${count} agents`);
    }
  }

  /**
   * Submit a task to the swarm
   */
  submitTask(goal: string, priority: number = 1, dependencies?: string[]): string {
    const task: SwarmTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      goal,
      priority,
      status: 'pending',
      dependencies,
      retries: 0,
    };

    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    if (this.config.verbose) {
      console.log(`[Swarm] Task submitted: ${task.id} - ${goal}`);
    }

    return task.id;
  }

  /**
   * Submit multiple tasks as a batch
   */
  submitTasks(goals: string[], priority: number = 1): string[] {
    return goals.map(goal => this.submitTask(goal, priority));
  }

  /**
   * Start the swarm runtime
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    if (this.config.verbose) {
      console.log(`[Swarm ${this.config.swarmId}] Started`);
    }

    // Main loop - use setInterval for simplicity
    this.intervalId = setInterval(() => this.tick(), 100);
  }

  /**
   * Stop the swarm runtime
   */
  stop(): void {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.config.verbose) {
      console.log(`[Swarm ${this.config.swarmId}] Stopped`);
    }
  }

  /**
   * Main swarm tick - assign tasks to idle agents
   */
  private async tick(): Promise<void> {
    if (!this.running) return;

    // Update heartbeats
    const now = Date.now();
    for (const status of this.agentStatus.values()) {
      if (now - status.lastHeartbeat > 30000) {
        status.status = 'offline';
      }
    }

    // Find idle agents
    const idleAgents = Array.from(this.agentStatus.entries())
      .filter(([_, status]) => status.status === 'idle')
      .map(([id]) => id);

    if (idleAgents.length === 0) return;

    // Find pending tasks that can be executed
    const executableTasks = this.taskQueue
      .filter(task => task.status === 'pending')
      .filter(task => this.areDependenciesMet(task));

    if (executableTasks.length === 0) return;

    // Assign tasks to idle agents
    for (let i = 0; i < Math.min(idleAgents.length, executableTasks.length); i++) {
      const agentId = idleAgents[i];
      const task = executableTasks[i];

      this.executeTask(agentId, task);
    }
  }

  /**
   * Execute a task on an agent
   */
  private async executeTask(agentId: string, task: SwarmTask): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    task.status = 'running';
    task.assignedAgent = agentId;

    const status = this.agentStatus.get(agentId);
    if (status) {
      status.status = 'busy';
      status.currentTask = task.id;
      status.lastHeartbeat = Date.now();
    }

    if (this.config.verbose) {
      console.log(`[Swarm] Agent ${agentId} executing task ${task.id}: ${task.goal}`);
    }

    try {
      const startTime = Date.now();
      const result = await agent.execute(task.goal);
      const executionTime = Date.now() - startTime;

      task.status = result.success ? 'completed' : 'failed';
      task.result = {
        success: result.success,
        artifacts: result.artifacts,
        reasoning: result.reasoning,
        agentId,
        executionTime,
      };

      // Store in shared memory
      this.sharedMemory.set(`task_${task.id}`, task.result);

      if (status) {
        status.tasksCompleted++;
        status.totalTime += executionTime;
      }

      if (this.config.verbose) {
        console.log(`[Swarm] Task ${task.id} ${task.status} in ${executionTime}ms`);
      }
    } catch (e: any) {
      task.status = 'failed';
      task.retries++;

      if (status) {
        status.status = 'error';
      }

      if (this.config.verbose) {
        console.error(`[Swarm] Task ${task.id} failed:`, e.message);
      }

      // Retry logic
      if (this.config.retryFailed && task.retries < 3) {
        task.status = 'pending';
        task.assignedAgent = undefined;
        if (status) {
          status.status = 'idle';
          status.currentTask = undefined;
        }
      }
    } finally {
      if (status) {
        status.status = 'idle';
        status.currentTask = undefined;
        status.lastHeartbeat = Date.now();
      }

      // Move to completed
      if (task.status === 'completed' || task.status === 'failed') {
        this.taskQueue = this.taskQueue.filter(t => t.id !== task.id);
        this.completedTasks.push(task);
      }
    }
  }

  /**
   * Check if task dependencies are met
   */
  private areDependenciesMet(task: SwarmTask): boolean {
    if (!task.dependencies || task.dependencies.length === 0) return true;

    return task.dependencies.every(depId =>
      this.completedTasks.some(t => t.id === depId && t.status === 'completed')
    );
  }

  /**
   * Get swarm status
   */
  getStatus(): {
    swarmId: string;
    running: boolean;
    agents: SwarmAgentStatus[];
    pendingTasks: number;
    completedTasks: number;
    sharedMemoryKeys: string[];
  } {
    return {
      swarmId: this.config.swarmId,
      running: this.running,
      agents: Array.from(this.agentStatus.values()),
      pendingTasks: this.taskQueue.filter(t => t.status === 'pending').length,
      completedTasks: this.completedTasks.length,
      sharedMemoryKeys: Array.from(this.sharedMemory.keys()),
    };
  }

  /**
   * Get all artifacts produced by the swarm
   */
  getAllArtifacts(): Artifact[] {
    const artifacts: Artifact[] = [];
    for (const task of this.completedTasks) {
      if (task.result?.artifacts) {
        artifacts.push(...task.result.artifacts);
      }
    }
    return artifacts;
  }

  /**
   * Share knowledge between agents via shared memory
   */
  shareKnowledge(key: string, value: any): void {
    this.sharedMemory.set(key, value);

    if (this.config.verbose) {
      console.log(`[Swarm] Shared knowledge: ${key}`);
    }
  }

  /**
   * Retrieve shared knowledge
   */
  getSharedKnowledge(key: string): any {
    return this.sharedMemory.get(key);
  }

  /**
   * Wait for all tasks to complete
   */
  async waitForCompletion(timeout: number = 300000): Promise<void> {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        const pending = this.taskQueue.filter(t => t.status === 'pending' || t.status === 'running');
        if (pending.length === 0) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeout) {
          reject(new Error('Timeout waiting for task completion'));
          return;
        }

        setTimeout(check, 1000);
      };

      check();
    });
  }
}

/**
 * Helper: Create a swarm with default configuration
 */
export function createSwarm(
  agentCount: number,
  config: Partial<SwarmConfig> = {},
): SwarmRuntime {
  const swarm = new SwarmRuntime({
    maxAgents: agentCount,
    ...config,
  });

  return swarm;
}

/**
 * Helper: Example usage of swarm
 */
export async function exampleSwarmUsage(): Promise<void> {
  const swarm = createSwarm(3, { verbose: true });

  await swarm.initialize([
    { provider: 'mock', model: 'mock-v1' },
    { provider: 'mock', model: 'mock-v1' },
    { provider: 'mock', model: 'mock-v1' },
  ]);

  swarm.start();

  // Submit tasks
  swarm.submitTask('Generate a cyberpunk character', 2);
  swarm.submitTask('Generate background music', 1);
  swarm.submitTask('Generate a game level', 1, ['task_0']); // Depends on first task

  // Wait for completion
  await swarm.waitForCompletion();

  swarm.stop();

  console.log('Swarm status:', swarm.getStatus());
  console.log('Artifacts:', swarm.getAllArtifacts().length);
}
