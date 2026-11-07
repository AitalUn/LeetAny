# ![LeetAny](docs/media/leetany-cover.jpg)

**Turn notes from your Karpathy-style vault into LeetCode-style exercises.**

Your coding agent writes a challenge from a lesson you already have. Open it in Obsidian, write your solution, and run the fixed tests. When a case fails, compare your output with the expected answer. When every case passes, the exercise earns a ✅ in your vault.

[Get LeetAny](https://github.com/AitalUn/LeetAny/releases/latest) · [Set up your vault](docs/wiki-quickstart.md)

![Codex turns a Python note into an exercise. The learner completes it in Obsidian and all three tests pass.](docs/media/generate-and-solve.gif)

## Install and try an exercise

You’ll need Obsidian Desktop 1.15+ and Python 3.10+. Exercises can use **Python, C++, Rust or Go**. Tests execute locally with your OS permissions, so open exercises from sources you trust.

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/AitalUn/LeetAny/releases/latest). Put them in `<vault>/.obsidian/plugins/leetany/`.
2. Reload Obsidian and enable **LeetAny** under **Settings → Community plugins**.
3. Run **LeetAny: Add sample LLM course** from the command palette. Open a `.leetany` file, edit the starter and click **Run tests**.

## Try it with your notes

Run **LeetAny: Install course authoring skill**, then open your vault in Codex or Claude Code and try this prompt.

> Turn my asyncio.gather lesson into one exercise with three fixed tests. Link it to the lesson and verify the reference solution.

[Watch the walkthrough](docs/async-python.md) · [Configure languages and dependencies](docs/reference.md#course-environments-and-languages) · [Build from source](docs/reference.md#develop)
