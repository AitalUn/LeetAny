# LeetAny

LeetAny opens coding exercises directly in Obsidian Desktop. Click a `.leetany` file to read the problem on the left, edit Python on the right and run the public tests. Solutions are saved inside the exercise file and travel with the course. In the file explorer, ✅ means every exercise passed with its current code and tests. ❌ means at least one exercise still needs a passing run.

## Install

Clone the repo, then run the installer with Python 3.10+:

```sh
python3 scripts/install_leetany.py --vault "/path/to/your/vault" --enable
```

Reload Obsidian with community plugins enabled. Open **Courses → LLM → 99 Практикум.leetany**. The included Russian-language course has 16 numbered lessons and one final practice file with 16 exercises. The installer keeps existing lessons and solutions. Existing v0.1 Markdown solutions stay in their original files and can be copied into the new editor.

## Use your own agent

Open your vault with your usual agent and ask it to create lessons and a final practice file on a topic. The installer appends the [authoring instructions](CLAUDE.md) once to the vault's CLAUDE.md. The plugin command **Добавить инструкции в CLAUDE.md** can also add this block. For an agent with a different instructions filename, reference CLAUDE.md from its project instructions. Each course is independent of a central catalog. The desktop plugin runs local Python only when you click Run. Use code you trust; execution has your OS permissions.

## Develop

Edit plugins/leetany/main.src.js or core.js, run `node scripts/build_leetany.cjs`, and reinstall. Run `node --test tests/leetany.test.cjs` and `python3 -m unittest discover -s tests`. MIT license.
