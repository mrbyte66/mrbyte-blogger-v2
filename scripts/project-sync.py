#!/usr/bin/env python3
"""Project 3 Kayıt eşitlemesi. Status ve issue state hiçbir zaman yazılmaz."""
import argparse
import json
import subprocess

OWNER = "mrbyte66"
REPOSITORY = "mrbyte66/mrbyte-blogger-v2"
PROJECT_ID = "PVT_kwHOBJLPx84Bmr3d"
PROJECT_NUMBER = "3"


def gh_json(*args):
    result = subprocess.run(["gh", *args], check=True, capture_output=True,
                            text=True, timeout=60)
    data = json.loads(result.stdout)
    if data.get("errors"):
        raise RuntimeError("GitHub GraphQL işlemi başarısız")
    return data


def completion_updates(items, field):
    option = next(o["id"] for o in field["options"] if o["name"] == "Tamamlandı")
    updates = []
    for item in items:
        content = item.get("content", {})
        if (content.get("type") != "Issue"
                or content.get("repository") != REPOSITORY
                or item.get("status") != "Done"
                or item.get("kayıt") == "Tamamlandı"):
            continue
        updates.append({"projectId": PROJECT_ID, "itemId": item["id"],
                        "fieldId": field["id"],
                        "value": {"singleSelectOptionId": option}})
    return updates


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    project = gh_json("project", "view", PROJECT_NUMBER, "--owner", OWNER,
                      "--format", "json")
    if project["id"] != PROJECT_ID:
        raise RuntimeError("Project kimliği eşleşmiyor; hiçbir alan değiştirilmedi")
    fields = gh_json("project", "field-list", PROJECT_NUMBER, "--owner", OWNER,
                     "--format", "json", "--limit", "100")["fields"]
    field = next(f for f in fields if f["name"] == "Kayıt")
    data = gh_json("project", "item-list", PROJECT_NUMBER, "--owner", OWNER,
                   "--format", "json", "--limit", "1000")
    if data["totalCount"] != len(data["items"]):
        raise RuntimeError("Kart sınırı aşıldı; eksik listeyle eşitleme yapılmadı")
    updates = completion_updates(data["items"], field)
    for update in updates:
        if args.dry_run:
            continue
        query = """mutation($input:UpdateProjectV2ItemFieldValueInput!){
          updateProjectV2ItemFieldValue(input:$input){projectV2Item{id}}
        }"""
        result = subprocess.run(["gh", "api", "graphql", "--input", "-"],
                                input=json.dumps({"query": query,
                                                  "variables": {"input": update}}),
                                check=True, capture_output=True, text=True, timeout=60)
        if json.loads(result.stdout).get("errors"):
            raise RuntimeError("Kayıt eşitlemesi başarısız")
    if updates or args.dry_run:
        print(f"{'Dry run: ' if args.dry_run else ''}{len(updates)} Kayıt güncellemesi")


if __name__ == "__main__":
    main()
