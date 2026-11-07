"""Copy the versioned plugin into a local Obsidian vault; keep user settings."""
import hashlib
import argparse
import json
from pathlib import Path
import shutil
import sys

SOURCE=Path(__file__).resolve().parents[1]/'plugins/leetany'
FILES=['manifest.json','main.js','core.js','styles.css','runner.py','worker.py','agent-hint.md']

def install(vault,enable=False):
    vault=Path(vault).resolve()
    if not (vault/'.obsidian').is_dir():raise ValueError('Это не Obsidian vault: нет .obsidian/')
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
    target=vault/'.obsidian/plugins/leetany';target.mkdir(parents=True,exist_ok=True)
    for file in FILES:
        shutil.copy2(SOURCE/file,target/file)
    skill=SOURCE.parents[1]/'.agents/skills/leetany-course/SKILL.md'
    for destination in [target/'SKILL.md', *(vault/root/'skills/leetany-course/SKILL.md' for root in ('.agents','.claude'))]:
        destination.parent.mkdir(parents=True,exist_ok=True)
        if (destination == target/'SKILL.md' or not destination.exists()
                or hashlib.sha256(destination.read_bytes().replace(b'\r\n', b'\n')).hexdigest()
                == '938a1a1f6cf9b2fa20ee5559d6722ecfe47c9c0b138fca0dff70702bf2fb4f84'):
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
        if not isinstance(enabled,list):raise ValueError('Неизвестный формат community-plugins.json')
        if 'leetany' not in enabled:enabled.append('leetany')
        config.write_text(json.dumps(enabled,ensure_ascii=False,indent=2))
    return target

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--vault',type=Path,required=True);p.add_argument('--enable',action='store_true');a=p.parse_args()
    print(install(a.vault,a.enable))
    print('В Obsidian перезагрузи приложение/плагин и открой файл .leetany в папке курса.')
