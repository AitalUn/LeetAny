# Running coroutines

Calling an async function creates a coroutine. Awaiting it gives the event loop a chance to run other work.

## Two jobs, one event loop

An async job can start, yield once, and finish. If you await each job inside a loop, the next job starts only after the previous one finishes.

```python
for label in labels:
    await job(label)
```

**Try to predict it.** For jobs A and B, can B start before A finishes? Read [[Sources/Event loop notes|the course notes]] and compare the two schedules.

## Schedule jobs together

`asyncio.gather` schedules the supplied coroutines together and waits for all of them. Here each job yields at `await asyncio.sleep(0)`, so A and B both start before either finishes. Their events are `['start A', 'start B', 'end A', 'end B']`.

Read [[Wiki/Cooperative scheduling|Cooperative scheduling]], then complete [[Course/01a Schedule jobs.leetany|Schedule two jobs]]. The exercise provides the job helper; complete the scheduling step.
