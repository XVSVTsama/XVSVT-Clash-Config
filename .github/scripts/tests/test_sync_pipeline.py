"""Regression tests for the English sync and template generation pipelines.

Each test pins a concrete failure that shipped to main:

* the English YAML half of a combined JS+YAML update being skipped,
* generated English files being committed on a detached HEAD and never pushed,
* stale English files being published on top of a newer Chinese source,
* the template generator writing YAML that matches an outdated template.

The workflow shells are executed straight out of the workflow files, so the
tests fail if the YAML is edited in a way that reintroduces the bug.
"""

import os
from pathlib import Path
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest

import yaml

ROOT = Path(__file__).resolve().parents[3]
WORKFLOWS = ROOT / ".github" / "workflows"
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import sync_template_yaml  # noqa: E402  (needs the scripts directory on sys.path)
from translation_boundaries import yaml_signature  # noqa: E402

SOURCE_FILES = ("mihomo.yaml", "script_override.js", "README.md")
ENGLISH_FILES = ("mihomo_en.yaml", "script_override_en.js", "README_en.md")


def bash_path():
    found = shutil.which("bash")
    if found:
        return found
    git = shutil.which("git")
    if git:
        # Git for Windows ships a POSIX shell next to its own binaries.
        candidate = Path(git).resolve().parents[1] / "usr" / "bin" / "sh.exe"
        if candidate.exists():
            return str(candidate)
    return None


def workflow_steps(filename):
    document = yaml.safe_load((WORKFLOWS / filename).read_text(encoding="utf-8"))
    for job in document["jobs"].values():
        for step in job.get("steps", []):
            yield step


def step_run(filename, name):
    for step in workflow_steps(filename):
        if step.get("name") == name:
            if "run" not in step:
                raise AssertionError("step %r has no run script" % name)
            return step["run"]
    raise AssertionError("step %r not found in %s" % (name, filename))


class RepositoryArtifactTests(unittest.TestCase):
    """The committed English YAML must stay functionally identical to Chinese."""

    def test_english_yaml_matches_chinese(self):
        if os.environ.get("SKIP_REPOSITORY_ARTIFACT_TEST") == "1":
            self.skipTest("English artifacts are validated after translation")
        source = (ROOT / "mihomo.yaml").read_text(encoding="utf-8")
        english = (ROOT / "mihomo_en.yaml").read_text(encoding="utf-8")
        self.assertEqual(yaml_signature(source), yaml_signature(english))


class RenderScalarTests(unittest.TestCase):
    """A double-quoted scalar must survive a round trip through YAML."""

    def test_double_quoted_regex_keeps_backslashes(self):
        cases = (
            r"(?i)\bUS\b|Hong\s*Kong",
            r"\bU\.?S\.?(?:A\.?)?\b",
            'quote " and \\ slash',
        )
        for value in cases:
            with self.subTest(value=value):
                rendered = sync_template_yaml.render_scalar(value, '"美国|住宅"')
                parsed = yaml.safe_load("filter: " + rendered)
                self.assertEqual(parsed, {"filter": value})
                self.assertFalse(any(ord(char) < 32 for char in parsed["filter"]))


class WorkflowShapeTests(unittest.TestCase):
    """Static guards for the two pipelines that published broken results."""

    def test_sync_english_checks_out_a_real_branch(self):
        for step in workflow_steps("sync-english.yml"):
            if step.get("uses", "").startswith("actions/checkout@"):
                self.assertEqual(step.get("with", {}).get("ref"), "main")
                return
        self.fail("sync-english.yml has no checkout step")

    def test_sync_english_publishes_itself(self):
        uses = [step.get("uses", "") for step in workflow_steps("sync-english.yml")]
        self.assertFalse(
            [value for value in uses if value.startswith("stefanzweifel/")],
            "the publish step must push explicitly so it can retry and refuse stale sources",
        )
        publish = step_run("sync-english.yml", "Commit and push generated English files")
        self.assertIn("git push origin HEAD:main", publish)
        self.assertIn("SOURCE_HASH", publish)

    def test_sync_english_detection_includes_the_triggering_commit(self):
        detect = step_run("sync-english.yml", "Detect relevant changes")
        self.assertIn('"${HEAD_SHA}^"', detect)

    def test_template_generate_uses_the_freshest_template(self):
        generate = step_run("template-generate.yml", "Sync mihomo.yaml from script_override.js")
        self.assertNotIn(
            'git show "$TRIGGER_SHA:script_override.js"',
            generate,
            "restoring the triggering commit's JS can write YAML for a stale template",
        )
        self.assertIn("git checkout -B sync-work origin/main", generate)

    def test_template_sync_explains_a_yaml_only_edit(self):
        diagnose = step_run("template-sync.yml", "Explain how to fix template drift")
        self.assertIn("mihomo.yaml", diagnose)
        self.assertIn("script_override.js", diagnose)
        for step in workflow_steps("template-sync.yml"):
            if step.get("name") == "Explain how to fix template drift":
                self.assertIn("failure()", step.get("if", ""))
                return
        self.fail("the diagnostic step lost its failure() guard")


class TemplateDriftMessageTests(unittest.TestCase):
    """The check must say what to change, not only what differs."""

    def setUp(self):
        if not shutil.which("node"):
            self.skipTest("node is required to evaluate the JavaScript template")
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.tree = Path(self.directory.name)
        scripts = self.tree / ".github" / "scripts"
        scripts.mkdir(parents=True)
        for name in ("check_template_sync.py",):
            shutil.copy2(ROOT / ".github" / "scripts" / name, scripts / name)
        shutil.copy2(ROOT / "script_override.js", self.tree / "script_override.js")
        document = yaml.safe_load((ROOT / "mihomo.yaml").read_text(encoding="utf-8"))
        document["mixed-port"] = (document.get("mixed-port") or 0) + 1
        (self.tree / "mihomo.yaml").write_text(
            yaml.safe_dump(document, allow_unicode=True, default_flow_style=False),
            encoding="utf-8",
        )

    def test_drift_failure_names_the_source_of_truth(self):
        result = subprocess.run(
            [sys.executable, str(self.tree / ".github" / "scripts" / "check_template_sync.py")],
            cwd=self.tree, text=True, encoding="utf-8", capture_output=True,
            env=dict(os.environ, PYTHONDONTWRITEBYTECODE="1"),
        )
        output = result.stdout + result.stderr
        self.assertEqual(result.returncode, 1, output)
        self.assertIn("Template sync failed", output)
        self.assertIn("source of truth", output)
        self.assertIn("sync_template_yaml.py", output)


class GitFixture(unittest.TestCase):
    """A local bare remote plus a clone, mirroring the runner's checkout."""

    def setUp(self):
        self.shell = bash_path()
        if not self.shell:
            self.skipTest("no POSIX shell available to run the workflow scripts")
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.remote = self.root / "remote.git"
        self.seed = self.root / "seed"
        self.work = self.root / "runner"
        self.env = dict(
            os.environ,
            GIT_CONFIG_NOSYSTEM="1",
            GIT_CONFIG_GLOBAL=os.devnull,
            PYTHONDONTWRITEBYTECODE="1",
        )
        self.git(self.root, "init", "--bare", "--initial-branch=main", str(self.remote))
        self.git(self.root, "init", "--initial-branch=main", str(self.seed))
        for name in SOURCE_FILES + ENGLISH_FILES:
            (self.seed / name).write_text("original %s\n" % name, encoding="utf-8")
        self.git(self.seed, "add", ".")
        self.git(self.seed, "commit", "-m", "source snapshot")
        self.git(self.seed, "remote", "add", "origin", self.remote.as_uri())
        self.git(self.seed, "push", "--set-upstream", "origin", "main")
        self.git(self.root, "clone", self.remote.as_uri(), str(self.work))

    def git(self, cwd, *args, check=True):
        result = subprocess.run(
            [
                "git", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test",
                "-c", "commit.gpgsign=false", *args,
            ],
            cwd=cwd, env=self.env, text=True, encoding="utf-8", capture_output=True,
        )
        if check and result.returncode:
            self.fail("git %s failed:\n%s%s" % (" ".join(args), result.stdout, result.stderr))
        return result

    def run_shell(self, script, cwd=None, env=None):
        script = script.replace("python ", '%s ' % shlex.quote(sys.executable))
        return subprocess.run(
            [self.shell, "-e", "-c", script],
            cwd=cwd or self.work,
            env=env or self.env,
            text=True, encoding="utf-8", capture_output=True,
        )

    def remote_file(self, name):
        return self.git(self.remote, "show", "main:" + name).stdout

    def commit_in_seed(self, name, text, message):
        (self.seed / name).write_text(text, encoding="utf-8")
        self.git(self.seed, "add", name)
        self.git(self.seed, "commit", "-m", message)
        self.git(self.seed, "push", "origin", "main")


class PublishStepTests(GitFixture):
    def publish(self):
        return self.run_shell(step_run("sync-english.yml", "Commit and push generated English files"))

    def test_publishes_generated_english(self):
        (self.work / "mihomo_en.yaml").write_text("translated\n", encoding="utf-8")
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.remote_file("mihomo_en.yaml"), "translated\n")

    def test_no_changes_is_not_a_failure(self):
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("No generated English changes", result.stdout)

    def test_unrelated_concurrent_commit_is_preserved(self):
        (self.work / "mihomo_en.yaml").write_text("translated\n", encoding="utf-8")
        self.commit_in_seed("notes.txt", "concurrent\n", "concurrent unrelated change")
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.remote_file("mihomo_en.yaml"), "translated\n")
        self.assertEqual(self.remote_file("notes.txt"), "concurrent\n")

    def test_stale_translation_is_refused_when_source_moves(self):
        (self.work / "mihomo_en.yaml").write_text("stale translation\n", encoding="utf-8")
        self.commit_in_seed("mihomo.yaml", "new source\n", "concurrent source update")
        result = self.publish()
        self.assertNotEqual(result.returncode, 0, "stale English files must not be published")
        self.assertIn("refusing to publish stale English files", result.stdout + result.stderr)
        self.assertEqual(self.remote_file("mihomo.yaml"), "new source\n")
        self.assertEqual(self.remote_file("mihomo_en.yaml"), "original mihomo_en.yaml\n")

    def test_conflicting_concurrent_english_edit_is_refused(self):
        (self.work / "README_en.md").write_text("generated translation\n", encoding="utf-8")
        self.commit_in_seed("README_en.md", "manual English edit\n", "manual English update")
        result = self.publish()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.remote_file("README_en.md"), "manual English edit\n")


class DetectionStepTests(GitFixture):
    def detect(self, head_sha, event="workflow_run"):
        output = self.root / "github-output.txt"
        script = step_run("sync-english.yml", "Detect relevant changes")
        script = script.replace("${{ github.event.workflow_run.head_sha }}", head_sha)
        script = script.replace("${{ github.event.before }}", "")
        script = script.replace("${{ github.event.after }}", "")
        result = self.run_shell(
            script,
            env=dict(self.env, GITHUB_EVENT_NAME=event, GITHUB_OUTPUT=str(output)),
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        values = dict(
            line.split("=", 1)
            for line in output.read_text(encoding="utf-8").splitlines() if "=" in line
        )
        return values

    def test_combined_js_and_yaml_update_selects_both(self):
        (self.seed / "script_override.js").write_text("new template\n", encoding="utf-8")
        (self.seed / "mihomo.yaml").write_text("new yaml\n", encoding="utf-8")
        self.git(self.seed, "add", "script_override.js", "mihomo.yaml")
        self.git(self.seed, "commit", "-m", "combined js+yaml update")
        head = self.git(self.seed, "rev-parse", "HEAD").stdout.strip()
        self.git(self.seed, "push", "origin", "main")
        self.git(self.work, "fetch", "origin", "main")
        self.git(self.work, "checkout", "main")
        self.git(self.work, "reset", "--hard", "origin/main")
        values = self.detect(head)
        self.assertEqual(values.get("run"), "true")
        self.assertIn("mihomo.yaml", values.get("targets", ""))
        self.assertIn("script_override.js", values.get("targets", ""))

    def test_js_only_update_still_selects_yaml_when_it_is_out_of_sync(self):
        (self.seed / "script_override.js").write_text("new template\n", encoding="utf-8")
        self.git(self.seed, "add", "script_override.js")
        self.git(self.seed, "commit", "-m", "js only update")
        head = self.git(self.seed, "rev-parse", "HEAD").stdout.strip()
        self.git(self.seed, "push", "origin", "main")
        self.git(self.work, "fetch", "origin", "main")
        self.git(self.work, "checkout", "main")
        self.git(self.work, "reset", "--hard", "origin/main")
        values = self.detect(head)
        self.assertIn("mihomo.yaml", values.get("targets", ""))


if __name__ == "__main__":
    unittest.main()
