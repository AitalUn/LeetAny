"""Copy the versioned plugin into a local Obsidian vault; keep user settings."""
import argparse
import json
from pathlib import Path
import shutil
import sys

SOURCE=Path(__file__).resolve().parents[1]/'plugins/leetany'
FILES=['manifest.json','main.js','core.js','styles.css','runner.py','worker.py']

def install(vault,enable=False):
    vault=Path(vault).resolve()
    if not (vault/'.obsidian').is_dir():raise ValueError('Это не Obsidian vault: нет .obsidian/')
    for folder in ('Courses',):
        for source_file in (SOURCE.parents[1]/folder).rglob('*'):
            if source_file.is_file():
                dest=vault/source_file.relative_to(SOURCE.parents[1])
                if not dest.exists():
                    dest.parent.mkdir(parents=True,exist_ok=True)
                    shutil.copy2(source_file,dest)
    target=vault/'.obsidian/plugins/leetany';target.mkdir(parents=True,exist_ok=True)
    for file in FILES:
        shutil.copy2(SOURCE/file,target/file)
    shutil.copy2(SOURCE.parents[1]/'CLAUDE.md',target/'CLAUDE.md')
    settings=target/'data.json'
    values=json.loads(settings.read_text()) if settings.exists() else {}
    values.setdefault('pythonPath',sys.executable)
    values.pop('codexPath',None)
    values.pop('catalog',None)
    settings.write_text(json.dumps(values,ensure_ascii=False,indent=2))
    instructions=vault/'CLAUDE.md'
    guide=(SOURCE.parents[1]/'CLAUDE.md').read_text()
    existing=instructions.read_text() if instructions.exists() else ''
    if '<!-- leetany:begin -->' not in existing:
        with instructions.open('a') as stream: stream.write(('\n\n' if existing else '')+guide)
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
