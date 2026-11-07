"""Copy the versioned plugin into a local Obsidian vault; keep user settings."""
import hashlib
import argparse
import json
from pathlib import Path
import shutil
import sys
import tempfile

SOURCE=Path(__file__).resolve().parents[1]/'plugins/leetany'
FILES=['manifest.json','main.js','core.js','styles.css','runner.py','worker.py','agent-hint.md']

def add_missing_metadata(source, target):
    # Upgrade only exercises that still have the shipped contract.
    raw = target.read_bytes()
    try:
        current = json.loads(raw)
        sample, = json.loads(source.read_bytes())['exercises']
        task, = current['exercises']
        contract = ('id', 'entry', 'starter', 'statement', 'tests')
        if any(task.get(key) != sample.get(key) for key in contract):
            return
        additions = {k: sample[k] for k in ('difficulty', 'lesson', 'editorial')
                     if k not in task and k in sample}
    except (ValueError, KeyError, TypeError, AttributeError):
        return
    if not additions:
        return
    task.update(additions)
    with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as stream:
        temp = Path(stream.name)
    try:
        temp.write_text(json.dumps(current, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
        shutil.copymode(target, temp)
        if target.read_bytes() == raw:
            temp.replace(target)
    finally:
        temp.unlink(missing_ok=True)


def install(vault,enable=False):
    vault=Path(vault).resolve()
    if not (vault/'.obsidian').is_dir():raise ValueError('Not an Obsidian vault: missing .obsidian/')
    bundled=SOURCE.parents[1]/'Courses'/'LLM'
    destination=vault/'Обучение'/'LLM'
    if not destination.is_dir():
        destination=vault/'Courses'/'LLM'
    legacy = destination/'99 Практикум.leetany'
    if legacy.is_file():
        print(f'Keeping existing practice file: {legacy}')
    for source_file in bundled.rglob('*'):
        if legacy.is_file() and source_file.suffix == '.leetany':
            continue
        if source_file.is_file():
            dest=destination/source_file.relative_to(bundled)
            if not dest.exists():
                dest.parent.mkdir(parents=True,exist_ok=True)
                shutil.copy2(source_file,dest)
            elif dest.suffix == '.leetany':
                add_missing_metadata(source_file, dest)
    target=vault/'.obsidian/plugins/leetany';target.mkdir(parents=True,exist_ok=True)
    for file in FILES:
        shutil.copy2(SOURCE/file,target/file)
    skill=SOURCE.parents[1]/'.agents/skills/leetany-course/SKILL.md'
    for destination in [target/'SKILL.md', *(vault/root/'skills/leetany-course/SKILL.md' for root in ('.agents','.claude'))]:
        destination.parent.mkdir(parents=True,exist_ok=True)
        if (destination == target/'SKILL.md' or not destination.exists()
                or hashlib.sha256(destination.read_bytes().replace(b'\r\n', b'\n')).hexdigest()
                in {'938a1a1f6cf9b2fa20ee5559d6722ecfe47c9c0b138fca0dff70702bf2fb4f84',
                    '15acb72848dfb6d5b20d951c2a17829450073cd5e77767e7a8e6967e7895732f'}):
            shutil.copy2(skill,destination)
        elif destination.read_bytes()!=skill.read_bytes():
            print(f'Keeping customized skill: {destination}')

    settings=target/'data.json'
    values=json.loads(settings.read_text()) if settings.exists() else {}
    values.setdefault('pythonPath',sys.executable)
    values.pop('codexPath',None)
    values.pop('catalog',None)
    settings.write_text(json.dumps(values,ensure_ascii=False,indent=2))
    instructions=vault/'CLAUDE.md'
    # Remove only the exact instruction block installed by v0.2.0.
    if instructions.exists():
        text=instructions.read_bytes()
        begin=text.find(b'<!-- leetany:begin -->')
        finish=text.find(b'<!-- leetany:end -->',begin)
        if begin>=0 and finish>=begin:
            end=finish+len(b'<!-- leetany:end -->')
            block=text[begin:end].replace(b'\r\n',b'\n')
            if hashlib.sha256(block).hexdigest()=='6dc6e7f5326cb8c107005449cda2be7327b4270dd0e1005d99dcd09ed72c0c42':
                remaining=text[:begin]+text[end:]
                if remaining.strip():
                    instructions.write_bytes(remaining)
                else:
                    instructions.unlink()
    hint=(target/'agent-hint.md').read_bytes()
    marker=hint.splitlines()[0]
    for filename in ('AGENTS.md','CLAUDE.md'):
        file=vault/filename
        existing=file.read_bytes() if file.exists() else b''
        if marker not in existing.splitlines():
            with file.open('ab') as stream:
                stream.write((b'\n\n' if existing else b'')+hint)
    if enable:
        config=vault/'.obsidian/community-plugins.json'
        enabled=json.loads(config.read_text()) if config.exists() else []
        if not isinstance(enabled,list):raise ValueError('Invalid community-plugins.json format')
        if 'leetany' not in enabled:enabled.append('leetany')
        config.write_text(json.dumps(enabled,ensure_ascii=False,indent=2))
    return target

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--vault',type=Path,required=True);p.add_argument('--enable',action='store_true');a=p.parse_args()
    print(install(a.vault,a.enable))
    print('Reload the plugin in Obsidian and open a .leetany exercise in the course folder.')
