---
name: leetany-course
description: Create LeetAny courses and exercises in Python, C++, Rust or Go. Configure course environments, dependencies and compilers, and verify reference solutions with the same runner as Obsidian.
---
## Authoring a LeetAny course

Create one course folder with numbered Markdown lessons and one UTF-8 JSON file per exercise, next to its lesson (e.g. `01 Context.md` and `01a Token budget.leetany`). Each file contains exactly one item in `exercises`. Add a wikilink from the lesson to the exercise. Obsidian opens this extension in LeetAny. Keep plugin controls in English. Write titles, statements, examples, lessons and editorial explanations in the repository’s content language. Infer it from project instructions and neighboring lessons; follow an explicitly requested course language. Use idiomatic identifiers in the requested language. Teach the concept in a lesson, then ask the student to implement a small, fully specified function. Include runnable examples in lessons when helpful. Leave the exercise starter unfinished.

A working file has this structure:

```json
{
  "version": 1,
  "exercises": [{
    "id": "sum-01",
    "title": "Sum a list",
    "statement": "Return the sum of a list of integers. An empty list has sum zero. Do not mutate the input.",
    "example": "total([2, 3]) returns 5",
    "difficulty": "easy",
    "lesson": "01 Sums.md",
    "editorial": {"explanation": "Add the numbers. The sum of an empty list is zero.", "code": "def total(numbers):\n    return sum(numbers)"},
    "entry": "total",
    "starter": "def total(numbers):\n    raise NotImplementedError()",
    "tests": [
      {"args": [[2, 3]], "expected": 5},
      {"args": [[]], "expected": 0}
    ]
  }]
}
```

Use unique stable IDs across the course. Tests call the named function with positional JSON arguments. Supply exactly one of `expected` (including JSON null) or `error` (an exact exception/error name, e.g. ValueError). Include normal, boundary and invalid cases appropriate to the contract. Results are compared recursively; floats use relative and absolute tolerance 1e-8. Arguments must remain unchanged. Use deterministic fixtures and declare any third-party dependencies in the course. Check expected values before publishing.

When extending a course, read its existing files first. Preserve all existing IDs, tests, user edits and especially the optional `solution` string storing the student's own code. The plugin writes passedHash after tests pass. Leave this field to the plugin. Create a separate file for each new exercise. Never generate a student's solution unless explicitly asked.

Before finishing, parse each exercise file as JSON and validate it with the LeetAny parser when available. Exercise each new test against an independently checked example in a temporary directory. For every new task, set difficulty to easy, medium or hard according to the reasoning required. Put the runnable reference code and an explanation in editorial; run that code against every case. The Solution tab reads editorial only. The starter stays unfinished and solution belongs exclusively to the learner. Set lesson to the exact sibling Markdown filename or vault-relative Markdown path after checking the note exists. Omit lesson when there is no matching note.

## Prepare and verify the course environment

Treat a request to create a course as including environment setup. Select the requested language and check that the interpreter/compiler works on this device. The plugin uses Python 3.10+ as its local test coordinator for all four languages. From this skill directory run `python3 scripts/course_runner.py setup "/path/to/course"`, then run `python3 scripts/course_runner.py check "/path/to/course/task.leetany" --reference` for every task. Also run the starter without `--reference` and confirm it fails the intended checks. Fix setup/test failures before handing off. Do not put the reference code in the learner's solution field.

Use `leetany.course.json` beside the exercises. Keys are `python`, `cpp`, `rust` and `go`. An exercise chooses its own `language` from these keys; omitted means Python. Example:

```json
{"version":1,"python":{"venv":".venv","requirements":"requirements.txt","timeoutSeconds":45},"cpp":{"buildTimeoutSeconds":90}}
```

For Python, record compatible package versions in requirements.txt and run setup with the Python version you want the course to use. Setup creates/reuses the venv and installs requirements only on explicit setup. Run tests only runs code. When using torch, select wheels matching this machine and test a real tensor operation. For portable tests represent inputs and return values as JSON (e.g. return tensor.tolist()). Commit the manifest, requirements and lockfiles. Ignore .venv/, build artifacts and leetany.local.json. Recreate environments on other devices. A course without a manifest continues to use the configured Python. Communicate actual validation results.

For C++, Rust or Go, adapt the corresponding complete single-task file under examples/ (cpp-double.leetany, rust-double.leetany, go-double.leetany). Keep the test harness inside the task, separate from the student's starter. Each test invokes the compiled executable with one JSON value per argument, one per line on stdin. The harness decodes those types, calls entry on the supplied values, and writes exactly one JSON object to stdout: {"value": result} or {"error": "name"}. Do not put expected outputs, case IDs or hardcoded answers into a harness. Send debug output to stderr. For rich input types use a real JSON decoder and declare its dependency. Specify `parameters` as the ordered argument names for the UI.

A C++ driver includes "solution.cpp"; default compilation is C++17. Rust uses include!("solution.rs") and edition 2021. Go solutions and drivers are separate files in package main. For native dependencies prepare headers, Go modules, Rust crates or a build wrapper before testing; record a native dependency preparation command in e.g. `"prepare":["go","mod","download"]` or `["cargo","fetch","--locked"]` and run setup explicitly. Run tests does not invoke prepare. By default the course directory is the build and execution working directory. Set `compiler` to an executable or `build` to an argument array; no shell interpolation. Placeholders: {course}, {work}, {driver}, {solution}, {exe}. Build once to {exe}; test cases run that binary. Override buildTimeoutSeconds and timeoutSeconds (seconds, 1–600) as needed. If a toolchain is missing, install/provision it for the machine or report exactly what is missing. Setup records resolved native tool paths for Obsidian even when its PATH differs from the terminal. Record other device-specific paths, SDK settings or environment overrides under the language in an ignored leetany.local.json with version 1; its fields override the shared configuration. Never commit credentials.
