"""Child process for deterministic exercise checks, not a security sandbox."""
import copy
import json
import math
from pathlib import Path
import sys
import traceback


def equal(a,b):
    if isinstance(a,bool) or isinstance(b,bool): return type(a) is type(b) and a==b
    if type(a) is int and type(b) is int: return a==b
    if isinstance(a,(int,float)) and isinstance(b,(int,float)):
        return math.isfinite(a) and math.isfinite(b) and math.isclose(a,b,rel_tol=1e-8,abs_tol=1e-8)
    if isinstance(a,dict) and isinstance(b,dict):
        return a.keys()==b.keys() and all(equal(a[k],b[k]) for k in a)
    if isinstance(a,list) and isinstance(b,list):
        return len(a)==len(b) and all(equal(x,y) for x,y in zip(a,b))
    return type(a) is type(b) and a==b


def grade(request):
    namespace={'__name__':'student_solution'}
    try:
        exec(compile(request['code'],'<solution>','exec'),namespace)
        function=namespace[request['entry']]
        if not callable(function): raise TypeError('Entry point must be callable')
    except BaseException as error:
        return {'verdict':'ERROR','passed':0,'total':len(request['tests']),'message':''.join(traceback.format_exception_only(type(error),error)).strip()}
    results=[]
    for index,case in enumerate(request['tests'],1):
        args=copy.deepcopy(case['args'])
        before=json.dumps(args,ensure_ascii=False,sort_keys=True)
        item={'case':index,'args':case['args']}
        try:
            actual=function(*args)
            if 'error' in case:
                item.update(passed=False,expected_error=case['error'],actual=repr(actual)[:2000])
            else:
                item.update(passed=equal(actual,case['expected']),expected=case['expected'],actual=repr(actual)[:2000])
        except BaseException as error:
            item.update(passed=type(error).__name__==case.get('error'),error=type(error).__name__,message=str(error)[:1000])
        if json.dumps(args,ensure_ascii=False,sort_keys=True)!=before:
            item.update(passed=False,mutation='Solution modified the input arguments')
        results.append(item)
    passed=sum(r['passed'] for r in results)
    return {'verdict':'PASSED' if passed==len(results) else 'FAILED','passed':passed,'total':len(results),'cases':results}


if __name__=='__main__':
    request=json.loads(Path(sys.argv[1]).read_text())
    result=grade(request)
    Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,allow_nan=False))
