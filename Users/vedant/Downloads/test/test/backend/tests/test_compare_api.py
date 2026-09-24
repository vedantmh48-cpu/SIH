"""Tests for the before/after satellite comparison endpoint."""
from app.services.processing import compare_before_after


def test_compare_with_gazetteer_location(client, auth_headers):
    """A gazetteer location runs a full comparison: scenes + change + stats."""
    r = client.get(
        "/api/geospatial/compare",
        params={"before": "2023-01-01", "after": "2024-01-01", "location": "Punjab"},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["simulated"] is True
    assert body["location"] == "Punjab"
    assert body["before"] == "2023-01-01" and body["after"] == "2024-01-01"
    assert body["before_geojson"]["features"]
    assert body["after_geojson"]["features"]
    assert body["change_geojson"]["features"]
    assert body["stats"]["changed_area_km2"] >= 0
    assert body["stats"]["expansion_cells"] + body["stats"]["reduction_cells"] > 0
    assert isinstance(body["charts"], dict)


def test_compare_is_deterministic(client, auth_headers):
    a = client.get(
        "/api/geospatial/compare",
        params={"before": "2023-06-01", "after": "2024-06-01", "lat": 12.97, "lng": 77.59},
        headers=auth_headers,
    ).json()
    b = client.get(
        "/api/geospatial/compare",
        params={"before": "2023-06-01", "after": "2024-06-01", "lat": 12.97, "lng": 77.59},
        headers=auth_headers,
    ).json()
    assert a["stats"] == b["stats"]
    assert len(a["before_geojson"]["features"]) == len(b["before_geojson"]["features"])


def test_compare_indexes_and_counts(client, auth_headers):
    for idx in ("auto", "sar", "ndvi", "ndwi", "ndbi"):
        r = client.get(
            "/api/geospatial/compare",
            params={"before": "2023-01-01", "after": "2024-01-01", "location": "Kerala", "index": idx},
            headers=auth_headers,
        )
        assert r.status_code == 200, (idx, r.text)
        assert r.json()["index"] == idx.upper()


def test_compare_validation(client, auth_headers):
    assert client.get("/api/geospatial/compare", params={"before": "2024-01-01", "after": "2023-01-01", "location": "Punjab"}, headers=auth_headers).status_code == 422
    assert client.get("/api/geospatial/compare", params={"before": "not-a-date", "after": "2024-01-01", "location": "Punjab"}, headers=auth_headers).status_code == 422
    assert client.get("/api/geospatial/compare", params={"before": "2023-01-01", "after": "2024-01-01", "index": "bogus", "location": "Punjab"}, headers=auth_headers).status_code == 422
    assert client.get("/api/geospatial/compare", params={"before": "2023-01-01", "after": "2024-01-01", "lat": 999, "lng": 77}, headers=auth_headers).status_code == 422
    assert client.get("/api/geospatial/compare", params={"before": "2023-01-01", "after": "2024-01-01"}, headers=auth_headers).status_code == 422


def test_compare_requires_auth(client):
    assert client.get("/api/geospatial/compare", params={"before": "2023-01-01", "after": "2024-01-01", "location": "Punjab"}).status_code in (401, 403)