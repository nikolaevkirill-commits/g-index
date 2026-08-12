import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


def main() -> int:
    path = Path(sys.argv[1])
    payload = json.loads(path.read_text(encoding="utf-8"))
    zone = ZoneInfo(payload["timezone"])
    failures: list[str] = []

    for vector in payload["vectors"]:
        utc = datetime.fromisoformat(vector["utc"].replace("Z", "+00:00"))
        actual = utc.astimezone(zone).strftime("%Y-%m-%d %H:%M")
        if actual != vector["expected_local"]:
            failures.append(
                f'{vector["utc"]}: expected {vector["expected_local"]}, got {actual}'
            )

    if failures:
        print(json.dumps({"status": "FAIL", "failures": failures}, ensure_ascii=False))
        return 1

    print(
        json.dumps(
            {"status": "PASS", "timezone": payload["timezone"], "vectors": len(payload["vectors"])},
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
