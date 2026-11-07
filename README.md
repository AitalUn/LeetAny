<picture>
  <source media="(max-width: 600px)" srcset="docs/media/leetany-header-mobile.png">
  <img src="docs/media/leetany-header.png" alt="LeetAny — Turn notes from your Karpathy-style vault into LeetCode-style exercises.">
</picture>

<p align="center">
  <strong>Example learning topics</strong><br>
  <img src="docs/media/topics/python.svg" alt="Python" width="92" height="28">
  <img src="docs/media/topics/react.svg" alt="React" width="86" height="28">
  <img src="docs/media/topics/docker.svg" alt="Docker" width="94" height="28">
  <img src="docs/media/topics/pytorch.svg" alt="PyTorch" width="104" height="28">
  <img src="docs/media/topics/rust.svg" alt="Rust" width="78" height="28">
</p>

Your coding agent turns a lesson in your Obsidian vault into a challenge. Open it in Obsidian, write your solution, and run the fixed tests. When a case fails, compare your output with the expected answer. When every case passes, the exercise earns a ✅ in your vault.

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
