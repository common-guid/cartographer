import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HumanifyService } from '../src/services/llm/humanify-service.js';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(),
  };
});

describe('HumanifyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully spawn humanify and capture output', async () => {
    const mockStdout = new EventEmitter();
    const mockStderr = new EventEmitter();
    const mockStdin = {
      write: vi.fn(),
      end: vi.fn(),
    };

    const mockChild = Object.assign(new EventEmitter(), {
      stdout: mockStdout,
      stderr: mockStderr,
      stdin: mockStdin,
    });

    vi.mocked(spawn).mockReturnValue(mockChild as any);

    const service = new HumanifyService();
    const renamePromise = service.rename('function a() {}');

    // Simulate stdout data
    mockStdout.emit('data', Buffer.from('function renamed() {}'));
    
    // Simulate exit code 0
    mockChild.emit('close', 0);

    const result = await renamePromise;
    expect(result).toBe('function renamed() {}');
    expect(mockStdin.write).toHaveBeenCalledWith('function a() {}');
    expect(mockStdin.end).toHaveBeenCalled();
  });

  it('should fallback to original code on exit code error', async () => {
    const mockStdout = new EventEmitter();
    const mockStderr = new EventEmitter();
    const mockStdin = {
      write: vi.fn(),
      end: vi.fn(),
    };

    const mockChild = Object.assign(new EventEmitter(), {
      stdout: mockStdout,
      stderr: mockStderr,
      stdin: mockStdin,
    });

    vi.mocked(spawn).mockReturnValue(mockChild as any);

    const service = new HumanifyService();
    const renamePromise = service.rename('function a() {}');

    // Simulate error output on stderr
    mockStderr.emit('data', Buffer.from('API Rate Limit Exceeded'));
    
    // Simulate exit code 1
    mockChild.emit('close', 1);

    const result = await renamePromise;
    expect(result).toBe('function a() {}');
  });
});
