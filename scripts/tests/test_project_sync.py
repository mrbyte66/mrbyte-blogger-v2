import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location(
    "project_sync", Path(__file__).resolve().parents[1] / "project-sync.py")
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class ProjectSyncTests(unittest.TestCase):
    def test_only_user_done_updates_record_without_status_or_issue_mutation(self):
        field = {"id": "record", "options": [{"name": "Tamamlandı", "id": "complete"}]}
        def item(status, record="Planlanan", repo=sync.REPOSITORY, state="OPEN"):
            return {"id": status + repo, "status": status, "kayıt": record,
                    "content": {"type": "Issue", "repository": repo, "state": state}}
        items = [item("Backlog"), item("Todo"), item("In Progress"),
                 item("Backlog", state="CLOSED"), item("Done", repo="other/repo"),
                 item("Done", "Tamamlandı"), item("Done", "Mevcut"), item("Done")]
        updates = sync.completion_updates(items, field)
        self.assertEqual(2, len(updates))
        for update in updates:
            self.assertEqual("record", update["fieldId"])
            self.assertEqual({"singleSelectOptionId": "complete"}, update["value"])
            self.assertEqual({"projectId", "itemId", "fieldId", "value"}, set(update))

    def test_completed_history_is_preserved_when_item_returns_to_backlog(self):
        item = {"id": "old", "status": "Backlog", "kayıt": "Tamamlandı",
                "content": {"type": "Issue", "repository": sync.REPOSITORY}}
        field = {"id": "record", "options": [{"name": "Tamamlandı", "id": "complete"}]}
        self.assertEqual([], sync.completion_updates([item], field))
