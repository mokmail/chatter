"""Code execution engine using isolated subprocess with Jupyter-style state management."""
import sys
import os
import json
import subprocess
import uuid
import shutil
import time
from pathlib import Path
from typing import Optional

BASE_DIR = Path.home() / ".cio-intelligence-hub" / "code_exec"
BASE_DIR.mkdir(parents=True, exist_ok=True)

_sessions: dict[str, dict] = {}
EXECUTION_TIMEOUT = 60
MAX_OUTPUT_SIZE = 1024 * 1024


def _get_session_dir(session_id: str) -> Path:
    d = BASE_DIR / session_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def create_session() -> str:
    session_id = str(uuid.uuid4())
    session_dir = _get_session_dir(session_id)
    _sessions[session_id] = {
        "created_at": time.time(),
        "session_dir": str(session_dir),
        "variables": {},
    }
    return session_id


def delete_session(session_id: str):
    shutil.rmtree(_get_session_dir(session_id), ignore_errors=True)
    _sessions.pop(session_id, None)


def _run_code_subprocess(code: str, session_dir: Path, timeout: int = EXECUTION_TIMEOUT) -> dict:
    """Execute Python code in an isolated subprocess and return captured output."""
    # Write user code to file to avoid escaping issues
    user_code_path = session_dir / f"user_code_{uuid.uuid4().hex}.py"
    user_code_path.write_text(code)

    script = (
        "import sys, json, base64, traceback, io, os\n"
        "os.chdir(os.path.dirname(os.path.abspath(__file__)))\n"
        "sys.path.insert(0, os.getcwd())\n"
        "try:\n"
        "    import matplotlib\n"
        "    matplotlib.use('Agg')\n"
        "    import matplotlib.pyplot as plt\n"
        "    _HAS_MPL = True\n"
        "except ImportError:\n"
        "    _HAS_MPL = False\n"
        "    plt = None\n"
        "\n"
        "output = {'stdout': '', 'stderr': '', 'images': [], 'error': None, 'result': None}\n"
        "try:\n"
        "    old_stdout = sys.stdout\n"
        "    old_stderr = sys.stderr\n"
        "    sys.stdout = mystdout = io.StringIO()\n"
        "    sys.stderr = mystderr = io.StringIO()\n"
        "\n"
        "    exec_globals = {}\n"
        "    if _HAS_MPL:\n"
        "        exec_globals['plt'] = plt\n"
        "    user_code_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '"
        + user_code_path.name
        + "')\n"
        "    with open(user_code_path) as f:\n"
        "        _user_code = f.read()\n"
        "    exec(_user_code, exec_globals)\n"
        "\n"
        "    sys.stdout = old_stdout\n"
        "    sys.stderr = old_stderr\n"
        "    output['stdout'] = mystdout.getvalue()\n"
        "    output['stderr'] = mystderr.getvalue()\n"
        "\n"
        "    if _HAS_MPL:\n"
        "        fig_nums = plt.get_fignums()\n"
        "        for fn in fig_nums:\n"
        "            fig = plt.figure(fn)\n"
        "            buf = io.BytesIO()\n"
        "            fig.savefig(buf, format='png', dpi=100, bbox_inches='tight')\n"
        "            buf.seek(0)\n"
        "            img_b64 = base64.b64encode(buf.read()).decode('utf-8')\n"
        "            output['images'].append(img_b64)\n"
        "            plt.close(fig)\n"
        "\n"
        "    if '_' in exec_globals and exec_globals['_'] is not None:\n"
        "        output['result'] = str(exec_globals['_'])\n"
        "except Exception as e:\n"
        "    sys.stdout = old_stdout\n"
        "    sys.stderr = old_stderr\n"
        "    output['error'] = traceback.format_exc()\n"
        "    output['stdout'] = mystdout.getvalue()\n"
        "    output['stderr'] = mystderr.getvalue()\n"
        "\n"
        "print('__CE_OUTPUT__' + json.dumps(output) + '__CE_OUTPUT__')\n"
    )

    script_path = session_dir / f"exec_{uuid.uuid4().hex}.py"
    script_path.write_text(script)

    try:
        result = subprocess.run(
            [sys.executable, str(script_path)],
            cwd=str(session_dir),
            capture_output=True,
            text=True,
            timeout=timeout,
            env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )

        full_stdout = result.stdout or ""
        full_stderr = result.stderr or ""

        marker = "__CE_OUTPUT__"
        idx = full_stdout.find(marker)
        if idx != -1:
            json_str = full_stdout[idx + len(marker):]
            # Strip trailing marker if present
            end_idx = json_str.rfind(marker)
            if end_idx != -1:
                json_str = json_str[:end_idx]
            parsed = json.loads(json_str)
            prefix = full_stdout[:idx]
            parsed["stdout"] = prefix + (parsed.get("stdout") or "")
            parsed["stderr"] = full_stderr + (parsed.get("stderr") or "")
            return parsed
        else:
            return {
                "stdout": full_stdout,
                "stderr": full_stderr,
                "images": [],
                "error": result.returncode != 0 and "Process exited with non-zero code" or None,
                "result": None,
            }

    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "", "images": [], "error": "Execution timed out", "result": None}
    except Exception as e:
        return {"stdout": "", "stderr": "", "images": [], "error": str(e), "result": None}
    finally:
        if script_path.exists():
            script_path.unlink()
        if user_code_path.exists():
            user_code_path.unlink()


def execute_code(session_id: str, code: str, timeout: int = EXECUTION_TIMEOUT) -> dict:
    """Execute code in a session and return results."""
    if session_id not in _sessions:
        session_id = create_session()
        _sessions[session_id]["session_id"] = session_id

    session = _sessions[session_id]
    session_dir = Path(session["session_dir"])

    result = _run_code_subprocess(code, session_dir, timeout)

    result["session_id"] = session_id
    return result


def execute_code_and_return_json(code: str, session_id: Optional[str] = None) -> dict:
    """Public API: execute code and return a JSON-serializable result."""
    if session_id and session_id in _sessions:
        return execute_code(session_id, code)
    return execute_code(code, code)


def get_session_ids() -> list[str]:
    return list(_sessions.keys())
