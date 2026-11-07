# LeetAny

A local coding practice plugin for Obsidian Desktop. Write Python in a Markdown note, run test cases and ask Codex for a review or a new exercise. Includes a Russian-language LLM workbook with 16 exercises, 88 public checks and four mini-projects.

## Install

Clone this repository. With Python 3.10+ installed, run the following command from the checkout, replacing the path with the path to an existing Obsidian vault.

```sh
python3 scripts/install_leetany.py --vault "/path/to/vault" --enable
```

Reload Obsidian with community plugins enabled. Open the command palette and select **LeetAny: Открыть практикум**. Choose an exercise, edit its Python block, then select **Запустить тесты**. The installer preserves existing workbook files and local settings. The workbook uses the folders Обучение and Знания.

Tests run local Python with your OS permissions and a timeout. Run solutions you trust. For optional generation and review, install and authenticate Codex CLI and set its executable path in plugin settings. These buttons send the exercise context to your configured provider. Generated exercises are drafts.

## Development

Edit `plugins/leetany/main.src.js` and `core.js`. Build and test using:

```sh
node scripts/build_leetany.cjs
node --test tests/leetany.test.cjs
python3 -m unittest discover -s tests
```

Tested on macOS with Obsidian Desktop. Licensed under MIT.
