# Event loop notes

A job appends its start event, calls `await asyncio.sleep(0)`, and appends its finish event. In this example each job yields exactly once.

With sequential awaits, A finishes before B starts. When both jobs are scheduled together with asyncio.gather on the default event loop, both start before either finishes.

**Source:** [Python documentation · Coroutines and Tasks](https://docs.python.org/3/library/asyncio-task.html)
