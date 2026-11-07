import json
from pathlib import Path
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

SKILL = Path(__file__).resolve().parents[1] / ".agents/skills/leetany-course"
sys.path.insert(0, str(SKILL / "scripts"))
from course_runner import check, setup


class CourseRuntimeTests(unittest.TestCase):
    def test_python_course_environment_is_used_and_isolated(self):
        task = dict(id="probe", entry="solve", tests=[dict(args=[], expected=42)])
        code = "from course_only import answer\ndef solve(): return answer"
        with tempfile.TemporaryDirectory() as temp:
            course = Path(temp)
            (course / "leetany.course.json").write_text(json.dumps({"version":1,"python":{"venv":".venv"}}))
            self.assertIn("Missing", check(course, task, code)["message"])
            setup(course)
            py = course / (".venv/Scripts/python.exe" if os.name == "nt" else ".venv/bin/python")
            site = Path(subprocess.check_output([str(py), "-c", "import sysconfig;print(sysconfig.get_path('purelib'))"], text=True).strip())
            (site / "course_only.py").write_text("answer=42")
            self.assertEqual(check(course, task, code)["verdict"], "PASSED")
            self.assertEqual(check(course.parent, task, code)["verdict"], "ERROR")

    def test_native_examples_and_wrong_solutions(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for language, tool in [("cpp", "c++"), ("rust", "rustc"), ("go", "go")]:
                if not shutil.which(tool):
                    continue
                with self.subTest(language=language):
                    task, = json.loads((SKILL / "examples" / f"{language}-double.leetany").read_text())["exercises"]
                    code = task["editorial"]["code"]
                    passed = check(root, task, code)
                    self.assertEqual(passed["verdict"], "PASSED", passed)
                    wrong = check(root, task, code.replace("2 * n", "n"))
                    self.assertEqual(wrong["passed"], 1, wrong)
                    self.assertEqual(check(root, task, "invalid syntax")["verdict"], "COMPILE_ERROR")

    def test_setup_prepares_only_on_explicit_request(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            marker = root / "prepared.txt"
            (root / "leetany.course.json").write_text(json.dumps({"version":1,"cpp":{
                "build":[sys.executable], "prepare":[sys.executable, "-c",
                "from pathlib import Path;Path('prepared.txt').write_text('ok')"]}}))
            task, = json.loads((SKILL / "examples/cpp-double.leetany").read_text())["exercises"]
            # The build command is deliberately invalid, but must never install anything.
            self.assertEqual(check(root, task, task["starter"])["verdict"], "COMPILE_ERROR")
            self.assertFalse(marker.exists())
            setup(root)
            self.assertEqual(marker.read_text(), "ok")

    def test_bad_manifest_does_not_silently_use_global_python(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "leetany.local.json").write_text('{"version":2}')
            self.assertEqual(check(root, {"id":"x","tests":[]}, "")["verdict"], "ERROR")
