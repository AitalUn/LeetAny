<!-- leetany:begin -->
## Authoring a LeetAny course

Create one course folder with numbered Markdown lessons and one final UTF-8 JSON file named `99 Practice.leetany`. Obsidian opens this extension in LeetAny. Use the language of the course. Teach the concept in a lesson, then ask the student to implement a small, fully specified Python 3.10+ function. Include runnable examples in lessons when helpful. Leave the exercise starter unfinished.

A working file has this structure:

```json
{
  "version": 1,
  "exercises": [{
    "id": "sum-01",
    "title": "Sum a list",
    "statement": "Return the sum of a list of integers. An empty list has sum zero. Do not mutate the input.",
    "example": "total([2, 3]) returns 5",
    "entry": "total",
    "starter": "def total(numbers):\n    raise NotImplementedError()",
    "tests": [
      {"args": [[2, 3]], "expected": 5},
      {"args": [[]], "expected": 0}
    ]
  }]
}
```

Use unique stable IDs within each file. Tests call the named function with positional JSON arguments. Supply exactly one of `expected` (including JSON null) or `error` (exact Python exception class name, e.g. ValueError). Include normal, boundary and invalid cases appropriate to the contract. Results are compared recursively; floats use relative and absolute tolerance 1e-8. Arguments must remain unchanged. Use the Python standard library and deterministic fixtures. Check expected values before publishing.

When extending a course, read its existing files first. Preserve all existing IDs, tests, user edits and especially the optional `solution` string storing the student's own code. The plugin writes passedHash after tests pass. Leave this field to the plugin. Add exercises to the existing final file. Never generate a student's solution unless explicitly asked.
<!-- leetany:end -->
