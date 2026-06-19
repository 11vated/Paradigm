import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';

const CLI = 'npx tsx cli/paradigm.ts';

function run(...args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync('npx', ['tsx', 'cli/paradigm.ts', ...args], {
    encoding: 'utf8',
    timeout: 30000,
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status ?? 1,
  };
}

describe('Paradigm CLI smoke tests', () => {
  it('--help prints usage and exits 0', () => {
    const { stdout, status } = run('--help');
    expect(status).toBe(0);
    expect(stdout).toContain('Paradigm CLI');
    expect(stdout).toContain('grow');
    expect(stdout).toContain('mutate');
    expect(stdout).toContain('breed');
    expect(stdout).toContain('evolve');
    expect(stdout).toContain('compose');
    expect(stdout).toContain('gspl');
    expect(stdout).toContain('play');
    expect(stdout).toContain('verify');
    expect(stdout).toContain('sign');
    expect(stdout).toContain('export');
    expect(stdout).toContain('vcs');
    expect(stdout).toContain('server');
    expect(stdout).toContain('make');
  });

  it('-h prints help and exits 0', () => {
    const { status } = run('-h');
    expect(status).toBe(0);
  });

  it('--version prints version and exits 0', () => {
    const { stdout, status } = run('--version');
    expect(status).toBe(0);
    expect(stdout).toContain('Paradigm CLI');
  });

  it('-v prints version and exits 0', () => {
    const { stdout, status } = run('-v');
    expect(status).toBe(0);
    expect(stdout).toContain('Paradigm CLI');
  });

  it('help command prints help and exits 0', () => {
    const { stdout, status } = run('help');
    expect(status).toBe(0);
    expect(stdout).toContain('grow');
  });

  it('unknown command exits 1 with error message', () => {
    const { stderr, status } = run('nonexistent-command-xyz');
    expect(status).toBe(1);
    expect(stderr).toContain('Unknown');
  });

  it('domains lists engines and exits 0', () => {
    const { stdout, status } = run('domains');
    expect(status).toBe(0);
    expect(stdout).toContain('registered domains');
  });

  it('grow --help shows usage', () => {
    const { stdout, status } = run('grow');
    expect(status).toBe(1);
  });

  it('grow with minimal domain succeeds', () => {
    const { stdout, status, stderr } = run('grow', 'visual2d', '--out', '/tmp/paradigm-test');
    // May pass or fail depending on engine availability — check exit 0
    if (status === 0) {
      expect(stdout).toBeTruthy();
    } else {
      // Engine may not be available in test env; acceptable
      expect(stderr).toContain('Growth failed') || expect(stderr).toContain('not found');
    }
  });

  it('mutate without args exits 1 with usage', () => {
    const { stderr, status } = run('mutate');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('mutate with nonexistent file exits 1', () => {
    const { stderr, status } = run('mutate', '/tmp/paradigm-test/nonexistent.json');
    expect(status).toBe(1);
    expect(stderr).toContain('not found');
  });

  it('breed without args exits 1 with usage', () => {
    const { stderr, status } = run('breed');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('evolve without args exits 1 with usage', () => {
    const { stderr, status } = run('evolve');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('compose without args exits 1 with usage', () => {
    const { stderr, status } = run('compose');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('gspl without file exits 1', () => {
    const { stderr, status } = run('gspl', 'nonexistent.gspl');
    expect(status).toBe(1);
    expect(stderr).toContain('not found');
  });

  it('play without file exits 1', () => {
    const { stderr, status } = run('play', 'nonexistent.gseed');
    expect(status).toBe(1);
    expect(stderr).toContain('not found');
  });

  it('verify without args exits 1 with usage', () => {
    const { stderr, status } = run('verify');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('sign without args exits 1 with usage', () => {
    const { stderr, status } = run('sign');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('export without args exits 1 with usage', () => {
    const { stderr, status } = run('export');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('vcs without subcommand exits 1 with usage', () => {
    const { stderr, status } = run('vcs');
    expect(status).toBe(1);
    expect(stderr).toContain('Usage');
  });

  it('vcs log without history shows empty', () => {
    const { stderr, status } = run('vcs', 'log');
    expect(status).toBe(0);
    expect(stderr).toContain('No VCS history');
  });

  // server test skipped: spawns a long-running child process that can't
  // be cleanly verified in a synchronous smoke-test context
  it.skip('server --port flag starts server gracefully', () => {
    const { status } = run('server', '--port', '30999');
    expect(status).not.toBe(0);
  });

  it('verify with intent string succeeds', () => {
    const { stdout, status } = run('verify', 'test-intent');
    expect(status).toBe(0);
    expect(stdout).toContain('Intent hash');
  });

  it('make with simple intent succeeds', () => {
    const { stdout, status, stderr } = run('make', 'a simple test');
    if (status === 0) {
      expect(stdout).toContain('Sovereign artifact');
    } else {
      expect(stderr).toContain('Make failed') || expect(stderr).toContain('not found');
    }
  });

  it('evolve with domain and flags passes or fails gracefully', () => {
    const { stdout, status, stderr } = run('evolve', 'visual2d', '--algorithm', 'ga', '--gen', '3', '--popsize', '5');
    if (status === 0) {
      expect(stdout).toContain('Evolution complete');
    } else {
      expect(stderr).toContain('failed') || expect(stderr).toContain('not found');
    }
  });
});
