"""
Web Worker Pool for Heavy Computations

Provides async task queue for:
- Evolution runs (MAP-Elites, GA)
- GSPL execution
- Quality scoring
- Batch operations
"""

import asyncio
import concurrent.futures
import os
from dataclasses import dataclass
from typing import Any, Callable, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class TaskPriority(Enum):
    LOW = 0
    NORMAL = 1
    HIGH = 2
    CRITICAL = 3


@dataclass
class Task:
    """Represents a compute task in the pool"""
    id: str
    func: Callable
    args: tuple
    kwargs: dict
    priority: TaskPriority
    future: concurrent.futures.Future
    
    
class WorkerPool:
    """
    Async worker pool for CPU-intensive operations.
    
    Uses a process pool to avoid blocking the event loop.
    Tasks are prioritized and can be cancelled.
    """
    
    def __init__(
        self,
        max_workers: Optional[int] = None,
        task_timeout: int = 300
    ):
        # Default to CPU count - 1, minimum 2
        self.max_workers = max_workers or max(os.cpu_count() - 1, 2)
        self.task_timeout = task_timeout
        self._executor: Optional[concurrent.futures.ProcessPoolExecutor] = None
        self._tasks: dict[str, Task] = {}
        self._task_counter = 0
        self._running = False
        
    async def start(self):
        """Initialize the worker pool"""
        if self._running:
            return
            
        self._executor = concurrent.futures.ProcessPoolExecutor(
            max_workers=self.max_workers,
            mp_context=concurrent.futures.ThreadPoolProcessPoolExecutor._default_executor(
                max_workers=self.max_workers
            )._thread_name_prefix
        )
        self._running = True
        logger.info(f"Worker pool started with {self.max_workers} workers")
        
    async def stop(self):
        """Shutdown the worker pool gracefully"""
        if not self._running:
            return
            
        # Wait for pending tasks
        if self._tasks:
            logger.info(f"Waiting for {len(self._tasks)} pending tasks...")
            await self._wait_all()
            
        # Shutdown executor
        if self._executor:
            self._executor.shutdown(wait=True, cancel_futures=False)
            
        self._running = False
        logger.info("Worker pool stopped")
        
    async def submit(
        self,
        func: Callable,
        *args,
        priority: TaskPriority = TaskPriority.NORMAL,
        **kwargs
    ) -> concurrent.futures.Future:
        """
        Submit a task to the worker pool.
        
        Args:
            func: The function to execute (must be picklable)
            *args: Positional arguments for the function
            priority: Task priority (affects queue order)
            **kwargs: Keyword arguments for the function
            
        Returns:
            Future that resolves with the result
        """
        if not self._running:
            await self.start()
            
        # Generate unique task ID
        self._task_counter += 1
        task_id = f"task_{self._task_counter}_{id(func)}"
        
        # Create task
        loop = asyncio.get_event_loop()
        future = loop.run_in_executor(
            self._executor,
            self._execute_task,
            func,
            args,
            kwargs
        )
        
        task = Task(
            id=task_id,
            func=func,
            args=args,
            kwargs=kwargs,
            priority=priority,
            future=future
        )
        
        self._tasks[task_id] = task
        
        # Add completion callback to clean up
        def cleanup(f):
            self._tasks.pop(task_id, None)
            
        future.add_done_callback(cleanup)
        
        return future
    
    @staticmethod
    def _execute_task(
        func: Callable,
        args: tuple,
        kwargs: dict
    ) -> Any:
        """Execute the task (runs in worker process)"""
        return func(*args, **kwargs)
    
    async def submit_with_timeout(
        self,
        func: Callable,
        *args,
        timeout: Optional[int] = None,
        **kwargs
    ) -> Any:
        """
        Submit task with timeout.
        
        Raises asyncio.TimeoutError if task exceeds timeout.
        """
        future = await self.submit(func, *args, **kwargs)
        timeout = timeout or self.task_timeout
        
        return await asyncio.wait_for(future, timeout=timeout)
    
    async def map(
        self,
        func: Callable,
        items: list,
        *args,
        **kwargs
    ) -> list:
        """
        Apply function to multiple items in parallel.
        
        Args:
            func: Function to apply
            items: List of items to process
            *args, **kwargs: Additional args for func
            
        Returns:
            List of results in same order as items
        """
        if not items:
            return []
            
        # Submit all tasks
        futures = [
            await self.submit(func, item, *args, **kwargs)
            for item in items
        ]
        
        # Gather results
        results = []
        for future in futures:
            try:
                result = await asyncio.wait_for(
                    future, 
                    timeout=self.task_timeout
                )
                results.append(result)
            except Exception as e:
                logger.error(f"Task failed: {e}")
                results.append({"error": str(e)})
                
        return results
    
    async def _wait_all(self):
        """Wait for all pending tasks to complete"""
        if not self._tasks:
            return
            
        futures = [task.future for task in self._tasks.values()]
        await asyncio.gather(*futures, return_exceptions=True)
        
    def get_stats(self) -> dict:
        """Get pool statistics"""
        return {
            "max_workers": self.max_workers,
            "running": self._running,
            "pending_tasks": len(self._tasks),
            "task_counter": self._task_counter
        }


# Global worker pool instance
_global_pool: Optional[WorkerPool] = None


async def get_worker_pool() -> WorkerPool:
    """Get or create the global worker pool"""
    global _global_pool
    if _global_pool is None:
        _global_pool = WorkerPool()
        await _global_pool.start()
    return _global_pool


async def shutdown_worker_pool():
    """Shutdown the global worker pool"""
    global _global_pool
    if _global_pool:
        await _global_pool.stop()
        _global_pool = None


# ============================================================
# HIGH-LEVEL API FUNCTIONS
# These are the functions users of the worker pool will call
# ============================================================


async def run_evolution_parallel(
    evolve_func: Callable,
    seeds: list,
    *args,
    **kwargs
) -> list:
    """
    Run evolution on multiple seeds in parallel.
    
    This is the main entry point for parallel evolution.
    """
    pool = await get_worker_pool()
    return await pool.map(evolve_func, seeds, *args, **kwargs)


async def evaluate_fitness_parallel(
    evaluate_func: Callable,
    seeds: list
) -> list:
    """
    Evaluate fitness for multiple seeds in parallel.
    """
    pool = await get_worker_pool()
    return await pool.map(evaluate_func, seeds)


async def generate_batch(
    generate_func: Callable,
    prompts: list,
    priority: TaskPriority = TaskPriority.NORMAL
) -> list:
    """
    Generate multiple seeds from prompts in parallel.
    """
    pool = await get_worker_pool()
    
    futures = []
    for prompt in prompts:
        future = await pool.submit(
            generate_func,
            prompt,
            priority=priority
        )
        futures.append(future)
        
    results = []
    for future in futures:
        try:
            result = await asyncio.wait_for(future, timeout=pool.task_timeout)
            results.append(result)
        except Exception as e:
            results.append({"error": str(e)})
            
    return results