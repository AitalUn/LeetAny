---
name: leetany-course
description: Create or extend Obsidian LeetAny courses, write numbered lessons and individual .leetany Python exercises with difficulty, a tested reference solution and a link to an existing Obsidian lesson, or validate their JSON cases. Use for LeetAny course authoring and exercise maintenance.
---
## Authoring a LeetAny course

Create one course folder with numbered Markdown lessons and one UTF-8 JSON file per exercise, next to its lesson (e.g. `01 Context.md` and `01a Token budget.leetany`). Each file contains exactly one item in `exercises`. Add a wikilink from the lesson to the exercise. Obsidian opens this extension in LeetAny. Keep plugin controls in English. Write titles, statements, examples, lessons and editorial explanations in the repository’s content language. Infer it from project instructions and neighboring lessons; follow an explicitly requested course language. Keep Python identifiers idiomatic. Teach the concept in a lesson, then ask the student to implement a small, fully specified Python 3.10+ function. Include runnable examples in lessons when helpful. Leave the exercise starter unfinished.

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

Use unique stable IDs across the course. Tests call the named function with positional JSON arguments. Supply exactly one of `expected` (including JSON null) or `error` (exact Python exception class name, e.g. ValueError). Include normal, boundary and invalid cases appropriate to the contract. Results are compared recursively; floats use relative and absolute tolerance 1e-8. Arguments must remain unchanged. Use the Python standard library and deterministic fixtures. Check expected values before publishing.

When extending a course, read its existing files first. Preserve all existing IDs, tests, user edits and especially the optional `solution` string storing the student's own code. The plugin writes passedHash after tests pass. Leave this field to the plugin. Create a separate file for each new exercise. Never generate a student's solution unless explicitly asked.

Before finishing, parse each exercise file as JSON and validate it with the LeetAny parser when available. Exercise each new test against an independently checked example in a temporary directory. For every new task, set difficulty to easy, medium or hard according to the reasoning required. Put the runnable reference code and an explanation in editorial; run that code against every case. The Solution tab reads editorial only. The starter stays unfinished and solution belongs exclusively to the learner. Set lesson to the exact sibling Markdown filename or vault-relative Markdown path after checking the note exists. Omit lesson when there is no matching note.
