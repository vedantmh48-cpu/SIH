"""Live end-to-end check of the before/after satellite comparison endpoint."""
import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = r"C:\Users\vedant\Downloads\test\test"
PORT = 8011
BASE = f"http://127.0.0.1:{PORT}"


def http(method, path, body=None, token=None, timeout=15):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(req, data=data, timeout=timeout) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


def wait_ready():
    for _ in range(60):
        try:
            with urllib.request.urlopen(BASE + "/api/health", timeout=2) as r:
                if r.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def main():
    env = dict(os.environ)
    env.update({
        "DB_MODE": "off",
        "AUTH_STORE": "compat",
        "MAIL_ENABLED": "off",
        "DEMO_MODE": "on",
        "PORT": str(PORT),
        "PYTHONPATH": ROOT + "\\backend",
    })
    email = f"compare-e2e-{int(time.time())}@orbitiq.ai"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PORT), "--log-level", "warning"],
        cwd=ROOT + "\\backend", env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT,
    )
    results = []
    try:
        if not wait_ready():
            results.append(("backend failed to boot", False))
            raise SystemExit(1)

        code, body = http("POST", "/api/v1/auth/register", {
            "account_type": "student", "full_name": "Compare E2E", "email": f"{email}",
            "password": "Password1", "confirm_password": "Password1",
            "institution": "Demo U", "course": "Remote Sensing", "year_of_study": 3,
        })
        results.append(("register", code == 201 and body.get("requires_email_verification") is True))
        demo_code = (body.get("demo_code") or "123456") if code == 201 else "123456"

        code, body = http("POST", "/api/v1/auth/verify-email", {"email": f"{email}", "code": demo_code})
        token = (body.get("access_token") or "") if code == 200 else ""
        results.append(("verify-email issues a session", code == 200 and bool(token)))

        code, body = http("GET", "/api/geospatial/compare?before=2023-01-01&after=2024-06-01&index=ndvi&location=Punjab", token=token)
        ok = code == 200 and body.get("simulated") is True and body.get("location") == "Punjab" \
            and len(body.get("before_geojson", {}).get("features", [])) > 0 \
            and len(body.get("change_geojson", {}).get("features", [])) > 0 \
            and body.get("stats", {}).get("percent_change") is not None
        results.append(("compare (gazetteer + ndvi)", ok))
        if code == 200:
            print("  sample stats:", json.dumps({k: body["stats"][k] for k in
                  ("changed_area_km2", "expansion_cells", "reduction_cells", "signal_before", "signal_after")}))

        code, body = http("GET", "/api/geospatial/compare?before=2023-01-01&after=2024-01-02&index=auto&lat=12.97&lng=77.59", token=token)
        results.append(("compare (lat/lng + auto)", code == 200 and body.get("index") == "AUTO"))

        code, _ = http("GET", "/api/geospatial/compare?before=2024-01-01&after=2023-01-01&location=Punjab", token=token)
        results.append(("reversed dates blocked (422)", code == 422))
        code, _ = http("GET", "/api/geospatial/compare?before=2023-01-01&after=2024-01-01", token=token)
        results.append(("missing location blocked (422)", code == 422))
        code, _ = http("GET", "/api/geospatial/compare?before=2023-01-01&after=2024-01-01&location=Punjab")
        results.append(("unauthenticated blocked (401/403)", code in (401, 403)))

        code, body = http("GET", "/api/geospatial/compare?before=2023-01-01&after=2024-01-01&index=ndbi&location=Kerala", token=token)
        ok = code == 200 and body["index"] == "NDBI" and len(body["after_geojson"]["features"]) > 0
        results.append(("compare determinism + ndbi", ok))
        code2, body2 = http("GET", "/api/geospatial/compare?before=2023-01-01&after=2024-01-01&index=ndbi&location=Kerala", token=token)
        results.append(("deterministic repeat", code2 == 200 and body2["stats"] == body["stats"]))
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=8)
        except subprocess.TimeoutExpired:
            proc.kill()

    print()
    failed = 0
    for name, ok in results:
        print(("PASS" if ok else "FAIL"), name)
        failed += 0 if ok else 1
    print(f"\n{len(results) - failed}/{len(results)} e2e checks passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()