"""LeetAny course setup and judge. Used by both the Obsidian button and the author."""
import argparse
import json
import math
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import tempfile

from runner import execute
from worker import equal

NATIVE = {
    "cpp": ("c++", "cpp", ["-std=c++17", "{driver}", "-o", "{exe}"]),
    "rust": ("rustc", "rs", ["--edition=2021", "{driver}", "-o", "{exe}"]),
    "go": ("go", "go", ["build", "-o", "{exe}", "{driver}", "{solution}"]),
}


def settings(course, language):
    if language not in {"python", *NATIVE}:
        raise ValueError(f"Unsupported language: {language}")
    options = {}
    for name in ("leetany.course.json", "leetany.local.json"):
        path = course / name
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or data.get("version") != 1:
                raise ValueError(f"Expected version 1 in {name}")
            entry = data.get(language, {})
            if not isinstance(entry, dict):
                raise ValueError(f"Expected an object for {language} in {name}")
            options.update(entry)
    return options


def environment(options):
    overrides = options.get("env", {})
    if not isinstance(overrides, dict) or not all(isinstance(v, str) for v in overrides.values()):
        raise ValueError("env must be an object of strings")
    return {**os.environ, **overrides}


def seconds(options, key, default):
    value = options.get(key, default)
    if type(value) not in (int, float) or not math.isfinite(value) or not 0 < value <= 600:
        raise ValueError(f"{key} must be between 0 and 600 seconds")
    return value


def interpreter(course, options):
    if "venv" in options:
        if not isinstance(options["venv"], str) or not options["venv"]:
            raise ValueError("venv must name an environment directory")
        env = course / options["venv"]
        return env / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if "requirements" in options:
        raise ValueError("Set python.venv to install course requirements")
    return Path(sys.executable)


def setup(course):
    course = course.resolve()
    opts = settings(course, "python")
    python = interpreter(course, opts)
    if "venv" in opts:
        env = (course / opts["venv"]).resolve()
        if env == course or not env.is_relative_to(course):
            raise ValueError("Use a venv directory inside the course")
        if not python.is_file():
            subprocess.run([sys.executable, "-m", "venv", str(env)], check=True)
        if not (env / "pyvenv.cfg").is_file():
            raise ValueError(f"{env} is not a virtual environment")
    if "requirements" in opts:
        subprocess.run([str(python), "-m", "pip", "install", "-r", opts["requirements"]],
                       cwd=course, env=environment(opts), check=True)
    print(f"Python: {python}")
    declared = set()
    for name in ("leetany.course.json", "leetany.local.json"):
        manifest = course / name
        if manifest.is_file():
            declared.update(json.loads(manifest.read_text(encoding="utf-8")))
    local_path = course / "leetany.local.json"
    local = json.loads(local_path.read_text(encoding="utf-8")) if local_path.exists() else {"version": 1}
    updated = False
    for language in NATIVE:
        if language not in declared:
            continue
        options = settings(course, language)
        env = environment(options)
        build = options.get("build", [options.get("compiler", NATIVE[language][0])])
        argv = command_args(build, "build")
        tool = argv[0]
        resolved = shutil.which(tool, path=env.get("PATH"))
        if not resolved and (course / tool).is_file():
            resolved = str(course / tool)
        if not resolved:
            raise ValueError(f"{language}: missing {tool}. Install the toolchain or set its path.")
        if "prepare" in options:
            subprocess.run(command_args(options["prepare"], "prepare"), cwd=course, env=env, check=True)
        # A desktop app may have a different PATH than the agent's terminal.
        if not os.path.isabs(tool):
            overrides = local.setdefault(language, {})
            if "build" in options:
                overrides["build"] = [str(Path(resolved).absolute()), *argv[1:]]
            else:
                overrides["compiler"] = str(Path(resolved).absolute())
            updated = True
        print(f"{language}: {resolved}")
    if updated:
        with tempfile.NamedTemporaryFile(dir=course, mode="w", encoding="utf-8", delete=False) as tmp:
            json.dump(local, tmp, indent=2)
            tmp.write("\n")
        Path(tmp.name).replace(local_path)


def command_args(value, field):
    if not isinstance(value, list) or not value or not all(isinstance(s, str) and s for s in value):
        raise ValueError(f"{field} must be a nonempty argv array")
    return list(value)


def run_process(command, cwd, timeout, work, env, stdin=""):
    # File-backed streams avoid a stdout/stderr pipe deadlock during compilation.
    out, err = work / "stdout", work / "stderr"
    with out.open("wb") as stdout, err.open("wb") as stderr:
        child = subprocess.Popen(command, cwd=cwd, env=env, stdin=subprocess.PIPE, stdout=stdout, stderr=stderr,
                                 start_new_session=os.name != "nt")
        try:
            child.communicate(stdin.encode("utf-8"), timeout=timeout)
        except subprocess.TimeoutExpired:
            if os.name == "nt":
                subprocess.run(["taskkill", "/F", "/T", "/PID", str(child.pid)], capture_output=True)
            else:
                os.killpg(child.pid, signal.SIGKILL)
            child.kill()
            child.wait()
            raise
    with out.open("rb") as f:
        output = f.read(1024 * 1024 + 1)
    if len(output) > 1024 * 1024:
        raise ValueError("Program output exceeds 1 MiB")
    with err.open("rb") as f:
        f.seek(max(0, err.stat().st_size - 8000))
        diagnostic = f.read().decode("utf-8", errors="replace")
    return child.returncode, output.decode("utf-8", errors="replace"), diagnostic


def native(course, options, language, task, code, work):
    tool, suffix, flags = NATIVE[language]
    source, driver = work / f"solution.{suffix}", work / f"driver.{suffix}"
    exe = work / ("exercise.exe" if os.name == "nt" else "exercise")
    harness = task.get("harness")
    if not isinstance(harness, str) or not harness.strip():
        raise ValueError(f"The course author must provide a {language} harness for {task['id']}")
    source.write_text(code, encoding="utf-8")
    driver.write_text(harness, encoding="utf-8")
    build = options.get("build", [options.get("compiler", tool), *flags])
    paths = {"driver": driver, "solution": source, "exe": exe, "course": course, "work": work}
    command = command_args(build, "build")
    for i, arg in enumerate(command):
        for key, path in paths.items():
            arg = arg.replace("{"+key+"}", str(path))
        command[i] = arg
    env = environment(options)
    env.update(GOPROXY="off", GOTOOLCHAIN="local", CARGO_NET_OFFLINE="true")
    status, out, err = run_process(command, course, seconds(options, "buildTimeoutSeconds", 90), work, env)
    total = len(task["tests"])
    if status or not exe.is_file():
        return dict(verdict="COMPILE_ERROR", passed=0, total=total,
                    message=err or out or "Build did not produce the executable")
    results = []
    for i, test in enumerate(task["tests"], 1):
        args = test["args"]
        stdin = "".join(json.dumps(x, ensure_ascii=False, allow_nan=False)+"\n" for x in args)
        item = dict(case=i, args=args, passed=False)
        try:
            status, out, err = run_process([str(exe)], course, seconds(options, "timeoutSeconds", 10), work, env, stdin)
            if status:
                raise ValueError(err or f"Executable exited with code {status}")
            reply = json.loads(out)
            if isinstance(reply, dict) and set(reply) == {"error"} and isinstance(reply["error"], str):
                item.update(error=reply["error"], passed=test.get("error") == reply["error"])
            elif isinstance(reply, dict) and set(reply) == {"value"}:
                actual = reply["value"]
                item.update(actual=json.dumps(actual, ensure_ascii=False)[:2000],
                            passed="expected" in test and equal(test["expected"], actual))
            else:
                raise ValueError('Harness must print {"value": ...} or {"error": "name"}')
        except (ValueError, OverflowError) as error:
            item.update(error="HarnessError", message=str(error))
        results.append(item)
    passed = sum(x["passed"] for x in results)
    return dict(verdict="PASSED" if passed == total else "FAILED", passed=passed, total=total, cases=results)


def check(course, task, code):
    language = task.get("language", "python")
    total = len(task["tests"])
    try:
        options = settings(course, language)
        if language == "python":
            python = interpreter(course, options)
            if not python.is_file():
                raise ValueError(f"Missing {python}. Run course_runner.py setup for this course.")
            return execute(code, task, seconds(options, "timeoutSeconds", 10), str(python), environment(options))
        with tempfile.TemporaryDirectory(prefix="leetany-build-") as temp:
            return native(course, options, language, task, code, Path(temp))
    except subprocess.TimeoutExpired as error:
        return dict(verdict="TIMEOUT", passed=0, total=total, message=f"Command exceeded {error.timeout} seconds")
    except (OSError, ValueError, TypeError) as error:
        return dict(verdict="ERROR", passed=0, total=total, message=str(error))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("setup").add_argument("course", type=Path)
    verify = sub.add_parser("check")
    verify.add_argument("file", type=Path)
    verify.add_argument("--reference", action="store_true")
    verify.add_argument("--id")
    sub.add_parser("stdin").add_argument("course", type=Path)
    args = parser.parse_args()
    if args.action == "setup":
        try:
            setup(args.course)
        except (OSError, ValueError, TypeError, subprocess.CalledProcessError) as error:
            parser.exit(1, f"Course setup failed: {error}\n")
        sys.exit()
    if args.action == "stdin":
        data = json.load(sys.stdin)
        report = check(args.course.resolve(), data["exercise"], data["code"])
    else:
        tasks = json.loads(args.file.read_text(encoding="utf-8"))["exercises"]
        selected = [e for e in tasks if args.id is None or e["id"] == args.id]
        if len(selected) != 1:
            parser.error("Select one exercise with --id")
        task = selected[0]
        code = task["editorial"]["code"] if args.reference else task.get("solution", task["starter"])
        report = check(args.file.resolve().parent, task, code)
    print(json.dumps(report, ensure_ascii=False, allow_nan=False))
    sys.exit(0 if report["verdict"] == "PASSED" else 1)
