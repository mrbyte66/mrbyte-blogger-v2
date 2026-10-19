import os
import re
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ImageNameTest(unittest.TestCase):
    def image(self, repository, app):
        env = {**os.environ, "GITHUB_REPOSITORY": repository, "REGISTRY": "ghcr.io"}
        return subprocess.run(["bash", str(ROOT / "scripts/image-name.sh"), app], env=env, capture_output=True, text=True)

    def test_both_apps_have_repository_scoped_names(self):
        for app in ("backend", "frontend"):
            result = self.image("MrByte66/MrByte-Blogger-V2", app)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(result.stdout.strip(), f"ghcr.io/mrbyte66/mrbyte-blogger-v2-{app}")

    def test_two_repositories_cannot_share_the_same_package(self):
        old = self.image("mrbyte66/mrbyte-blogger", "frontend")
        new = self.image("mrbyte66/mrbyte-blogger-v2", "frontend")
        self.assertNotEqual(old.stdout, new.stdout)
        self.assertNotIn("/satir-frontend", new.stdout)

    def test_invalid_app_or_repository_fails_instead_of_publishing_elsewhere(self):
        for repo, app in (("mrbyte66/project", "other"), ("project", "backend"), ("owner/repo/extra", "frontend"), ("", "backend")):
            self.assertNotEqual(self.image(repo, app).returncode, 0)

    def test_publish_gates_accept_only_successful_same_repo_main_push_or_manual_main(self):
        workflow = (ROOT / ".github/workflows/images.yml").read_text()
        publish = re.search(r"PUBLISH: \$\{\{ (.*) \}\}", workflow).group(1)
        image, manifest = re.findall(r"^    if: (.*)$", workflow, re.MULTILINE)
        base = {
            "github.event_name": "workflow_run", "github.repository": "mrbyte66/project",
            "github.event.workflow_run.conclusion": "success", "github.event.workflow_run.event": "push",
            "github.event.workflow_run.head_branch": "main", "github.event.workflow_run.head_repository.full_name": "mrbyte66/project",
            "github.ref": "refs/heads/main", "needs.image.result": "success",
        }
        def evaluate(expression, values):
            expression = re.sub(r"(?:github|needs)\.[a-zA-Z_.]+", lambda match: repr(values[match.group(0)]), expression)
            return eval(expression.replace("&&", " and ").replace("||", " or "), {"__builtins__": {}}, {})
        cases = [
            ({}, (True, True, True)),
            ({"github.event.workflow_run.event": "pull_request"}, (False, False, False)),
            ({"github.event.workflow_run.head_repository.full_name": "fork/project"}, (False, False, False)),
            ({"github.event.workflow_run.head_branch": "feature"}, (False, False, False)),
            ({"github.event.workflow_run.conclusion": "failure"}, (False, False, False)),
            ({"github.event_name": "pull_request"}, (False, True, False)),
            ({"github.event_name": "workflow_dispatch"}, (True, True, True)),
            ({"github.event_name": "workflow_dispatch", "github.ref": "refs/heads/feature"}, (False, True, False)),
            ({"needs.image.result": "failure"}, (True, True, False)),
        ]
        for overrides, expected in cases:
            with self.subTest(overrides=overrides):
                values = {**base, **overrides}
                self.assertEqual(tuple(evaluate(expression, values) for expression in (publish, image, manifest)), expected)

    def test_workflow_uses_the_same_name_for_build_scan_push_and_sign(self):
        workflow = (ROOT / ".github/workflows/images.yml").read_text()
        self.assertIn("bash scripts/image-name.sh", workflow)
        self.assertNotIn("/satir-${{ matrix.app }}", workflow)
        for use in ("tags: ${{ steps.name.outputs.image }}:scan", "image-ref: ${{ steps.name.outputs.image }}:scan", "${{ steps.name.outputs.image }}:sha-${{ env.SOURCE_SHA }}", "${{ steps.name.outputs.image }}@${{ steps.push.outputs.digest }}"):
            self.assertIn(use, workflow)
        self.assertIn("org.opencontainers.image.source=https://github.com/${{ github.repository }}", workflow)


if __name__ == "__main__":
    unittest.main()
