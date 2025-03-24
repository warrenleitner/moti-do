import subprocess
import unittest

class TestNpmCommands(unittest.TestCase):

    def run_npm_command(self, command):
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, f"Command '{command}' failed with error: {result.stderr}")

    def test_npm_lint(self):
        self.run_npm_command("npm run lint")

    def test_npm_typecheck(self):
        self.run_npm_command("npm run type-check")

    def test_npm_build(self):
        self.run_npm_command("npm run build")

    def test_npm_test(self):
        self.run_npm_command("npm test")

if __name__ == '__main__':
    unittest.main()
