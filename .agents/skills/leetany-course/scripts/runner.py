"""Run one saved Markdown exercise in a separate local Python process.

This is a timeout boundary, not a security sandbox. Only run your own code.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile


def inside(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()):
        raise ValueError('Path is outside the vault')
    return path


def extract_solution(text):
    blocks = re.findall(r'<!-- solution:start -->\s*```python\s*\n(.*?)\n```\s*<!-- solution:end -->', text, re.S)
    if len(blocks) != 1:
        raise ValueError('Expected one Python block between solution:start and solution:end')
    return blocks[0]


def run(vault, note, catalog='Обучение/LLM/Практикум/catalog.json', timeout=10):
    root = Path(vault).resolve()
    note_path = inside(root, note)
    manifest = json.loads(inside(root, catalog).read_text())
    exercise = next((e for e in manifest['exercises'] if inside(root, e['note']) == note_path), None)
    if exercise is None:
        raise ValueError('Exercise not found in the catalog')
    if not exercise.get('tests'): raise ValueError('The exercise needs tests')
    code = extract_solution(note_path.read_text())
    return execute(code, exercise, timeout)

def execute(code, exercise, timeout, python=None, env=None):
    fingerprint = hashlib.sha256(code.encode()).hexdigest()
    with tempfile.TemporaryDirectory(prefix='leetany-') as directory:
        temp = Path(directory)
        (temp/'request.json').write_text(json.dumps({'code':code, 'entry':exercise['entry'], 'tests':exercise['tests']}, ensure_ascii=False))
        with (temp/'stdout.txt').open('w') as stdout, (temp/'stderr.txt').open('w') as stderr:
            process = subprocess.Popen([python or sys.executable, '-I', '-B', str(Path(__file__).with_name('worker.py')), str(temp/'request.json'), str(temp/'result.json')], cwd=temp, env=env, stdout=stdout, stderr=stderr, start_new_session=os.name!='nt')
            try:
                process.wait(timeout=timeout)
            except subprocess.TimeoutExpired:
                if os.name != 'nt': os.killpg(process.pid, signal.SIGKILL)
                else: process.kill()
                process.wait()
                return {'exercise_id':exercise['id'],'code_hash':fingerprint,'verdict':'TIMEOUT','passed':0,'total':len(exercise['tests']),'message':f'Time limit of {timeout} seconds exceeded'}
        if not (temp/'result.json').exists():
            return {'exercise_id':exercise['id'],'code_hash':fingerprint,'verdict':'ERROR','passed':0,'total':len(exercise['tests']),'message':(temp/'stderr.txt').read_text(errors='replace')[-4000:] or f'Python exited with code {process.returncode}'}
        result = json.loads((temp/'result.json').read_text())
        result.update(exercise_id=exercise['id'],code_hash=fingerprint)
        output = (temp/'stdout.txt').read_text(errors='replace')
        if output: result['stdout'] = output[-4000:]
        return result


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--vault')
    parser.add_argument('--note')
    parser.add_argument('--stdin',action='store_true')
    parser.add_argument('--catalog',default='Обучение/LLM/Практикум/catalog.json')
    parser.add_argument('--timeout',type=float,default=10)
    args=parser.parse_args()
    try:
        if not 0 < args.timeout <= 60: raise ValueError('Timeout must be greater than zero and at most 60 seconds')
        if args.stdin:
            payload=json.load(sys.stdin)
            result=execute(payload['code'],payload['exercise'],args.timeout)
        else:
            result=run(args.vault,args.note,args.catalog,args.timeout)
    except Exception as error:
        result={'verdict':'ERROR','passed':0,'total':0,'message':str(error)}
    print(json.dumps(result,ensure_ascii=False,allow_nan=False))
    sys.exit(0 if result['verdict']=='PASSED' else 1)
