import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/f'plugins/leetany/{name}.py')
    obj=importlib.util.module_from_spec(spec);spec.loader.exec_module(obj);return obj
runner=module('runner');worker=module('worker')

class WorkerTests(unittest.TestCase):
    def grade(self,code,cases): return worker.grade({'code':code,'entry':'solve','tests':cases})
    def test_returns_errors_and_float_tolerance(self):
        cases=[{'args':[2],'expected':2/3},{'args':[0],'error':'ValueError'}]
        result=self.grade('def solve(x):\n if x==0: raise ValueError("zero")\n return x/3',cases)
        self.assertEqual(result['verdict'],'PASSED')
    def test_no_bool_numeric_confusion(self):
        self.assertFalse(worker.equal(True,1));self.assertFalse(worker.equal(float('nan'),float('nan')))
    def test_detects_mutation_even_when_result_correct(self):
        result=self.grade('def solve(x):\n x.sort()\n return x',[{'args':[[2,1]],'expected':[1,2]}])
        self.assertEqual(result['verdict'],'FAILED');self.assertIn('mutation',result['cases'][0])
    def test_syntax_errors_and_missing_entry(self):
        self.assertEqual(self.grade('invalid python !!!',[])['verdict'],'ERROR')
        self.assertEqual(self.grade('x=1',[])['verdict'],'ERROR')
    def test_does_not_accept_unexpected_exception(self):
        self.assertEqual(self.grade('def solve(x): raise TypeError()',[{'args':[1],'error':'ValueError'}])['verdict'],'FAILED')
    def test_expected_none_is_a_real_result(self):
        self.assertEqual(self.grade('def solve(): return None',[{'args':[],'expected':None}])['verdict'],'PASSED')

class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.note=self.root/'задача с пробелами.md'
        (self.root/'catalog.json').write_text(json.dumps({'exercises':[{'id':'TEST-01','note':self.note.name,'entry':'solve','tests':[{'args':[2],'expected':4}]}]}))
    def tearDown(self):self.temp.cleanup()
    def write(self,code):self.note.write_text('<!-- solution:start -->\n```python\n'+code+'\n```\n<!-- solution:end -->')
    def test_process_handles_spaces_unicode_and_noise(self):
        self.write('print("debug")\ndef solve(x): return 2*x')
        result=runner.run(self.root,self.note.name,'catalog.json')
        self.assertEqual(result['verdict'],'PASSED');self.assertIn('debug',result['stdout']);self.assertEqual(len(result['code_hash']),64)
    def test_timeout(self):
        self.write('def solve(x):\n while True: pass')
        self.assertEqual(runner.run(self.root,self.note.name,'catalog.json',timeout=.15)['verdict'],'TIMEOUT')
    def test_rejects_outside_path_and_ambiguous_block(self):
        with self.assertRaises(ValueError):runner.inside(self.root,'../outside.md')
        self.write('def solve(x):return x')
        text=self.note.read_text()
        with self.assertRaises(ValueError):runner.extract_solution(text+'\n'+text)
    def test_source_edit_changes_fingerprint(self):
        self.write('def solve(x):return x*2');a=runner.run(self.root,self.note.name,'catalog.json')
        self.write('def solve(x):return 2*x');b=runner.run(self.root,self.note.name,'catalog.json')
        self.assertNotEqual(a['code_hash'],b['code_hash'])

class CatalogTests(unittest.TestCase):
    def test_catalog_notes_and_expected_results(self):
        folder=ROOT/'Courses/LLM'
        files=sorted(folder.glob('*.leetany'))
        self.assertEqual(len(files),16)
        tasks=[]
        for file in files:
            tasks_in_file=json.loads(file.read_text())['exercises']
            self.assertEqual(len(tasks_in_file),1)
            lesson,=folder.glob(file.name[:2]+' *.md')
            self.assertIn(f'[[{file.name}|',lesson.read_text())
            task, = tasks_in_file
            self.assertIn(task['difficulty'], ('easy', 'medium', 'hard'))
            self.assertEqual(task['lesson'], lesson.name)
            report = runner.execute(task['editorial']['code'], task, 10)
            self.assertEqual(report['verdict'], 'PASSED', (file.name, report))
            tasks.extend(tasks_in_file)
        self.assertEqual(len({e['id'] for e in tasks}),16)
        self.assertEqual(sum(len(e['tests']) for e in tasks),88)
        for e in tasks:
            code=e['starter'];compile(code,e['id'],'exec')
            self.assertIn('NotImplementedError',code)
            for c in e['tests']:
                self.assertEqual(int('expected'in c)+int('error'in c),1)
                self.assertIsInstance(c['args'],list)

if __name__=='__main__':unittest.main()
