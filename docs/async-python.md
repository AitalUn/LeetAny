# Add tests to an existing async Python course

This walkthrough starts with a lesson, a source note and a wiki index in Obsidian Desktop. By the end, the lesson links to a runnable exercise and the wiki explains why its two-job test fails under sequential scheduling.

https://github.com/user-attachments/assets/e8e2f06d-8069-4ece-8f65-b31c525cba51

[Download the MP4](media/async-python.mp4?raw=true) · [English captions](media/async-python.en.vtt) · [Starter vault](media/async-python-before.zip?raw=true) · [Generated course](../examples/async-python)

## Follow along

1. Extract the starter ZIP and open its **Async Python** folder as an Obsidian vault. Follow the [installation instructions](../README.md#install-and-try-an-exercise) to install LeetAny and enable it in **Settings → Community plugins**. The example uses Python 3.10+ and its standard library.
2. In the command palette, run **LeetAny: Install course authoring skill**. Add the following course rules to `AGENTS.md`. For Claude Code, put the same project rules in `CLAUDE.md`.

   ```text
   Use the leetany-course skill. Keep source notes unchanged.
   Give each concept one page in Wiki/ and link it back to Sources/.
   Put one .leetany exercise beside the lesson. Link all three pages.
   Use fixed inputs and expected results. Verify the reference solution.
   Leave the learner's code unfinished.
   ```

3. Open the same vault as the working directory in your coding agent and send the prompt below. The agent runs separately from the plugin. In the recording, Codex generated the files and checked the reference and starter using the installed skill. The session excerpt is shortened for the video.

   > Use leetany-course to turn the existing Running coroutines lesson into one Python exercise about asyncio.gather. Add a linked wiki page, three fixed tests, and an unfinished starter. Verify the reference solution and show the results.

   To reproduce the recorded cases, specify three inputs: no jobs, one job named A, and jobs A and B. Each job appends its start event, awaits `asyncio.sleep(0)` and appends its end event. Use a synchronous `run_jobs(labels)` entry that calls `asyncio.run()`. Ask the agent to leave the inner `schedule()` body for the learner.

4. Follow **Wiki → Cooperative scheduling → Schedule two jobs**. Under **Testcase**, choose **Case 3**. Try a loop that awaits each job individually, then click **Run tests**. Compare the two event sequences:

   | | Two jobs |
   | --- | --- |
   | Output from sequential awaits | `start A, end A, start B, end B` |
   | Expected in this exercise | `start A, start B, end A, end B` |

5. Inside `schedule()`, replace that loop with the line below and run the same tests again. **Test Result** shows **Accepted · 3 of 3 passed**. The green check belongs to that exercise and its saved code.

   ```python
   await asyncio.gather(*(job(label, events) for label in labels))
   ```

The event ordering here refers to this example on the default event loop: both jobs yield exactly once. For the underlying scheduling behavior, see [Python's asyncio task documentation](https://docs.python.org/3/library/asyncio-task.html#running-tasks-concurrently). The vault's separation of sources, wiki pages and project instructions adapts [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

## Video transcript

**0:00 · Existing course.** Start with an existing Python course. This lesson already explains what happens when you await one job at a time.

**0:08 · Enable LeetAny.** Install LeetAny in the course vault and enable it under Community plugins. The demo uses the files from the GitHub release.

**0:16 · Install the skill.** Open the command palette and choose Install course authoring skill. LeetAny adds the skill and a pointer for your agent.

**0:23 · Write the rules.** In AGENTS.md, tell the agent to preserve source notes, maintain a linked wiki, and give each exercise fixed tests.

**0:32 · Ask the agent.** Ask Codex to turn this lesson into an exercise about scheduling two coroutines. It checks the reference and leaves the starter unfinished.

**0:41 · Follow the wiki.** The agent adds a wiki page with links to the source, the original lesson, and the new exercise. Open the exercise from that page.

**0:50 · Inspect the cases.** Select the third case. With jobs A and B, both start events should appear before either end event.

**0:57 · Try sequential awaits.** First, try awaiting each job inside a loop. Run the tests and look at the first failure.

**1:04 · Read the failure.** Two cases pass. For the two-job case, A finishes before B starts. Compare that output with the expected event order.

**1:13 · Schedule together.** Replace the loop with asyncio.gather. This schedules both jobs together. Run the same three tests again.

**1:20 · Verify the result.** All three cases pass. The green check marks this exercise as solved, and the solution stays in the course vault.
