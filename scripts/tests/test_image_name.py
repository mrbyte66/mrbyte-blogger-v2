import os
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

    def test_workflow_uses_the_same_name_for_build_scan_push_and_sign(self):
        workflow = (ROOT / ".github/workflows/images.yml").read_text()
        self.assertIn("bash scripts/image-name.sh", workflow)
        self.assertNotIn("/satir-${{ matrix.app }}", workflow)
        for use in ("tags: ${{ steps.name.outputs.image }}:scan", "image-ref: ${{ steps.name.outputs.image }}:scan", "${{ steps.name.outputs.image }}:sha-${{ env.SOURCE_SHA }}", "${{ steps.name.outputs.image }}@${{ steps.push.outputs.digest }}"):
            self.assertIn(use, workflow)
        self.assertIn("org.opencontainers.image.source=https://github.com/${{ github.repository }}", workflow)


if __name__ == "__main__":
    unittest.main()
