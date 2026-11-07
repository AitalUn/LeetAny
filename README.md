# LeetAny

LeetAny opens coding exercises directly in Obsidian Desktop. Click a `.leetany` file to read the problem on the left, edit Python on the right and run the public tests. Solutions are saved inside the exercise file and travel with the course. In the file explorer, ✅ means every exercise passed with its current code and tests. ❌ means at least one exercise still needs a passing run.

## Install

Install Obsidian Desktop and Python 3.10+. Open the target vault in Obsidian once so its `.obsidian` folder exists. [Download the source ZIP](https://github.com/AitalUn/LeetAny/archive/refs/heads/main.zip), extract it, and open a terminal in the extracted folder containing `scripts/`. Alternatively clone this repository and enter the checkout. Replace the example path below with the absolute path to your vault.

```sh
python3 scripts/install_leetany.py --vault "/path/to/your/vault" --enable
```

In Obsidian Settings → Community plugins, enable community plugins for this vault and reload Obsidian. Open **Courses → LLM → 99 Практикум.leetany**. The included Russian-language course has 16 numbered lessons and one final practice file with 16 exercises. The installer keeps existing lessons and solutions. Existing v0.1 Markdown solutions stay in their original files and can be copied into the new editor.

## Use your own agent

Open the vault as a project in Codex or Claude Code and ask for a LeetAny course on a topic. The installer places the [leetany-course skill](.agents/skills/leetany-course/SKILL.md) in the project skill directories for both agents. The installer also adds a short pointer in the vault’s AGENTS.md and CLAUDE.md and preserves other instructions. The description is used for discovery; the authoring instructions are loaded when selected. To explicitly invoke it, use `$leetany-course` in Codex or `/leetany-course` in Claude Code. In Obsidian, the command **Установить skill для создания курсов** restores missing copies and preserves customized ones. Each course is independent of a central catalog. The desktop plugin runs local Python only when you click Run. Use code you trust; execution has your OS permissions.

## Develop

Edit plugins/leetany/main.src.js or core.js, run `node scripts/build_leetany.cjs`, and reinstall. Run `node --test tests/leetany.test.cjs` and `python3 -m unittest discover -s tests`. MIT license.
