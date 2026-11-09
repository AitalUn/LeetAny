# LeetAny reference

LeetAny opens coding exercises directly in Obsidian Desktop. Click a `.leetany` file to read the problem on the left, edit syntax-highlighted Python, C++, Rust or Go on the right and run the public tests. Solutions are saved inside the exercise file and travel with the course. In the file explorer, each exercise has its own ✅ when its current code passes its tests, or ❌ until then.

Drag the vertical divider to resize the description and editor. LeetAny remembers the width for future exercises. Double-click the divider to return to equal columns.

The Description tab shows the exercise difficulty and a link to its lesson when available. Open Solution to read the reference implementation without editing your own code. Controls are in English; the author writes the content in the language of the repository.

Under the editor, **Testcase** shows the fixed inputs and expected answer for each case. Running the code opens **Test Result** and selects the first failing case, with the actual and expected answers side by side. Editing the solution clears the previous report.

## Install and try an exercise

Requires Obsidian Desktop 1.15.0 or later and a local Python 3.10+ installation. For manual installation, download `main.js`, `manifest.json` and `styles.css` from the [GitHub release](https://github.com/AitalUn/LeetAny/releases/latest). Put all three files in `<vault>/.obsidian/plugins/leetany/`, reload Obsidian and enable LeetAny in Settings → Community plugins.

1. Run **LeetAny: Add sample LLM course** in the command palette. It creates course notes and exercises in your vault, preserving existing files.
2. Open **01а Бюджет контекста.leetany**, edit the starter and click **Run tests**. If Python is not on your PATH, enter its absolute executable path in the plugin settings.
3. To create more exercises with your own agent, run **LeetAny: Install course authoring skill**. This writes the skill and short project instructions into your vault on request.

LeetAny runs offline. When you click **Run tests**, the Python coordinator uses temporary files outside the vault, executes the Python worker or builds and runs the native exercise. Only run trusted course configurations, harnesses and solutions: they execute with your OS permissions. Dependencies and toolchains are prepared separately by the author or agent. The optional agent workflow uses the agent you configure separately.

### Install from source

Install Obsidian Desktop and Python 3.10+. Open the target vault in Obsidian once so its `.obsidian` folder exists. [Download the source ZIP](https://github.com/AitalUn/LeetAny/archive/refs/heads/main.zip), extract it, and open a terminal in the extracted folder containing `scripts/`. Alternatively clone this repository and enter the checkout. Replace the example path below with the absolute path to your vault.

```sh
python3 scripts/install_leetany.py --vault "/path/to/your/vault" --enable
```

In Obsidian Settings → Community plugins, enable community plugins for this vault and reload Obsidian. Open **Courses → LLM → 01а Бюджет контекста.leetany**. Each of the 16 lessons has a neighboring exercise file. If your course lives in `Обучение/LLM/`, the installer uses that folder. Reinstalling adds missing difficulty, lesson links and editorials to exercises whose shipped contract still matches. Existing lessons and learner solutions are preserved. Vaults with an older combined practice file keep that course layout during a reinstall. Existing v0.1 Markdown solutions stay in their original files and can be copied into the new editor.

## Course environments and languages

Install the authoring skill and ask your agent, for example: “Build a PyTorch course, prepare its environment and verify each reference solution.” The skill includes a setup/check CLI and runnable C++, Rust and Go exercise templates. Keep `leetany.course.json` in the same folder as the exercise files:

```json
{
  "version": 1,
  "python": {"venv": ".venv", "requirements": "requirements.txt", "timeoutSeconds": 60}
}
```

In a vault with the skill installed, an agent can run:

```sh
python3 .agents/skills/leetany-course/scripts/course_runner.py setup "Courses/DL"
python3 .agents/skills/leetany-course/scripts/course_runner.py check "Courses/DL/01a Tensor sum.leetany" --reference
```

Setup uses the Python that launches it to create the venv and install the course requirements. Run tests uses that venv; on a second device recreate it with setup. Commit dependency declarations. Ignore the environment directory and machine-specific `leetany.local.json`. A course without these files uses the configured Python as before. Python 3.10+ is also required to coordinate native builds.

For native tasks set `language` to `cpp`, `rust` or `go` inside the exercise and provide a `harness` that calls the student's function. Use the [working templates](../.agents/skills/leetany-course/examples). Each run compiles once, executes the binary per case and compares its JSON result against the existing tests. Compilation errors appear in Test Result. Native inputs are one JSON value per argument per line; the harness prints exactly one JSON object containing `value` or a named `error`. Set the ordered argument names in `parameters` for labeled inputs. Supply typed decoding for the exercise's signature in the harness; compare expected answers in LeetAny.

Default toolchains: `c++` (C++17), `rustc` (Rust 2021), and `go build`. Configure these in the language section of the course manifest. A native `prepare` argv runs **only** on explicit setup; a custom `build` argv supports libraries and build systems. It must create `{exe}` from `{driver}` and `{solution}`; `{course}` and `{work}` are also available. Example: `"go":{"prepare":["go","mod","download"]}`. Setup records native tool paths in the local manifest so the desktop app can find the same compilers as the agent. Use `env` for per-language SDK paths. `timeoutSeconds` and `buildTimeoutSeconds` control execution and compilation respectively (up to 600 seconds). See the [skill](../.agents/skills/leetany-course/SKILL.md) for the full authoring workflow.

## Write a course

Choose the exercise location in your vault’s `AGENTS.md`. The bundled example keeps tasks beside their lessons. The [wiki quickstart](wiki-quickstart.md) puts them in a separate practice folder. A course using the first layout might look like this:

```text
Courses/Search quality/
  01 Ranking documents.md
  01a Rank candidates.leetany
  02 Measuring recall.md
  02a Recall at k.leetany
```

In each lesson, work through a small example and link to its exercise file. Each file contains exactly one entry in its `exercises` array. Give the exercise a stable ID, a function signature, an unfinished starter and a precise contract. Store each public case as positional JSON arguments and exactly one expected result or exception type. For example, a recall function might have `{"args":[["A"],["A","B"]],"expected":0.5}`. Include boundary cases and specify the behavior for invalid inputs. Learners can inspect the cases before running their code. The [authoring skill](../.agents/skills/leetany-course/SKILL.md) includes a complete exercise schema.

## Use your own agent

Open the vault as a project in Codex or Claude Code and ask for a LeetAny course on a topic. The installer places the [leetany-course skill](../.agents/skills/leetany-course/SKILL.md) in the project skill directories for both agents. The installer also adds a short pointer in the vault’s AGENTS.md and CLAUDE.md and preserves other instructions. The description is used for discovery; the authoring instructions are loaded when selected. To explicitly invoke it, use `$leetany-course` in Codex or `/leetany-course` in Claude Code. In Obsidian, the command **Install course authoring skill** restores missing copies and preserves customized ones. Each course is independent of a central catalog. Opening an exercise displays its contents. **Run tests** writes the bundled runner scripts to a temporary folder inside the plugin directory using the vault API, starts the configured Python interpreter, and removes that folder when the run finishes. Python and native compilers use the system temporary directory for their work. Exercise code, native harnesses and course build commands run with your OS permissions and can access files outside the vault. Run courses you trust.

## Develop

Install build dependencies with `npm ci`, edit the plugin sources, run `npm run build`, and reinstall. Run `node --test tests/leetany.test.cjs` and `python3 -m unittest discover -s tests`. MIT license.

## Live course progress

Add a fenced block to a Markdown note in your vault:

```leetany-progress
folder: Courses
axes: [Python, ML, Statistics]
courseAxes:
  Forecasting: [Statistics, ML]
```

Set `skills` to an array of axis names on each exercise, for example `["Python", "ML"]`. Use unique exercise IDs across the selected folder. The radar counts each tagged exercise once per axis and once overall. An empty axis has no denominator. Current passing hashes are checked using the same function as the exercise view. In each course's numbered `00 ` route note, add one Markdown checkbox per lesson with its wikilink. Reading is self-reported. A chapter counts toward the 3/3 indicator when exactly three published tasks link to that chapter and all three currently pass.

Use the **Progress view** selector to switch between the whole folder, an individual course (its immediate subfolder), or a vacancy. A course chart includes skills on its own exercises plus any planned axes listed in `courseAxes`. A planned skill with no exercises shows **No data**.

Optionally set `vacancies` to the vault path of a Markdown note. Enclose a table in `<!-- leetany:requirements -->` and `<!-- /leetany:requirements -->`. Its columns are vacancy label, Markdown posting link, kind, requirement, course link, evidence, and skills (comma-separated). Six-column tables still display the evidence checklist. Each vacancy label identifies one posting. Kinds are `обязательно` (required), `желательно` (preferred), `опыт` (required experience), and `опыт+` (preferred experience). In the evidence column, use inline-code exercise IDs for an all-of check, an explicitly curated wikilink to a project or profile section for documented evidence, or a dash for unknown. Experience rows accept only documented evidence. Course links and generic skill tags alone do not satisfy requirements.

The vacancy chart counts **confirmed requirements / mapped requirements** for each skill on that posting. For example, if the only skills are Python and Linear algebra, only those two axes appear. A row can count toward both. Leave skills blank for a credential without a skill axis: it still counts in the checklist. Required and preferred rows are broken out below the chart. Exercise completion elsewhere in the vault is not proof unless its ID is linked to the requirement.
