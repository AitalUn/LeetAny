# LeetAny

LeetAny opens coding exercises directly in Obsidian Desktop. Click a `.leetany` file to read the problem on the left, edit syntax-highlighted Python on the right and run the public tests. Solutions are saved inside the exercise file and travel with the course. In the file explorer, each exercise has its own ✅ when its current code passes its tests, or ❌ until then.

The Description tab shows the exercise difficulty and a link to its lesson when available. Open Solution to read the reference implementation without editing your own code. Controls are in English; the author writes the content in the language of the repository.

Under the editor, **Testcase** shows the fixed inputs and expected answer for each case. Running the code opens **Test Result** and selects the first failing case, with the actual and expected answers side by side. Editing the solution clears the previous report.

## Install

Install Obsidian Desktop and Python 3.10+. Open the target vault in Obsidian once so its `.obsidian` folder exists. [Download the source ZIP](https://github.com/AitalUn/LeetAny/archive/refs/heads/main.zip), extract it, and open a terminal in the extracted folder containing `scripts/`. Alternatively clone this repository and enter the checkout. Replace the example path below with the absolute path to your vault.

```sh
python3 scripts/install_leetany.py --vault "/path/to/your/vault" --enable
```

In Obsidian Settings → Community plugins, enable community plugins for this vault and reload Obsidian. Open **Courses → LLM → 01а Бюджет контекста.leetany**. Each of the 16 lessons has a neighboring exercise file. If your course lives in `Обучение/LLM/`, the installer uses that folder. Reinstalling adds missing difficulty, lesson links and editorials to exercises whose shipped contract still matches. Existing lessons and learner solutions are preserved. Vaults with an older combined practice file keep that course layout during a reinstall. Existing v0.1 Markdown solutions stay in their original files and can be copied into the new editor.

## Write a course

Keep lessons and exercises together. For example, a short course on search quality could contain:

```text
Courses/Search quality/
  01 Ranking documents.md
  01a Rank candidates.leetany
  02 Measuring recall.md
  02a Recall at k.leetany
```

In each lesson, work through a small example and link to the neighboring exercise file. Each file contains exactly one entry in its `exercises` array. Give the exercise a stable ID, a function signature, an unfinished starter and a precise contract. Store each public case as positional JSON arguments and exactly one expected result or exception type. For example, a recall function might have `{"args":[["A"],["A","B"]],"expected":0.5}`. Include boundary cases and specify the behavior for invalid inputs. Learners can inspect the cases before running their code. The [authoring skill](.agents/skills/leetany-course/SKILL.md) includes a complete exercise schema.

## Use your own agent

Open the vault as a project in Codex or Claude Code and ask for a LeetAny course on a topic. The installer places the [leetany-course skill](.agents/skills/leetany-course/SKILL.md) in the project skill directories for both agents. The installer also adds a short pointer in the vault’s AGENTS.md and CLAUDE.md and preserves other instructions. The description is used for discovery; the authoring instructions are loaded when selected. To explicitly invoke it, use `$leetany-course` in Codex or `/leetany-course` in Claude Code. In Obsidian, the command **Install course authoring skill** restores missing copies and preserves customized ones. Each course is independent of a central catalog. The desktop plugin runs local Python only when you click Run. Use code you trust; execution has your OS permissions.

## Develop

Install build dependencies with `npm ci`, edit the plugin sources, run `npm run build`, and reinstall. Run `node --test tests/leetany.test.cjs` and `python3 -m unittest discover -s tests`. MIT license.
