# Cooperative scheduling

Coroutines share an event loop and yield control when they suspend at an await. In this example, each job records its start, yields once with `await asyncio.sleep(0)`, then records its end.

Sequential awaits finish A before starting B. Scheduling both jobs with `asyncio.gather` lets both start before either finishes, producing `['start A', 'start B', 'end A', 'end B']`.

Source: [[Sources/Event loop notes|Event loop notes]].

Lesson: [[Course/01 Running coroutines|Running coroutines]]. Practice: [[Course/01a Schedule jobs.leetany|Schedule two jobs]].
