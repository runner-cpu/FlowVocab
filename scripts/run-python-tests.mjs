import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Cross-platform runner: Windows npm scripts execute through cmd.exe, where a
// quoted shell glob for `unittest -p` silently matches nothing and reports
// "Ran 0 tests". Passing argv directly avoids shell quoting entirely.
const root = fileURLToPath(new URL('../', import.meta.url))
const python = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3')
const result = spawnSync(python, ['-m', 'unittest', 'discover', '-s', 'scripts', '-p', '*_test.py'], { cwd: root, stdio: 'inherit', shell: false })
if (result.error) {
  console.error('Python validation tests could not start:', result.error.message)
  process.exit(1)
}
if (result.status !== 0) process.exit(result.status ?? 1)
