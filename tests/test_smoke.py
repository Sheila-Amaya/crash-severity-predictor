from unittest.mock import patch


def test_health(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_all_routes_under_api_prefix(client):
    public_paths = {"/", "/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}

    api_paths = [
        route.path
        for route in client.app.routes
        if route.path not in public_paths
    ]

    assert api_paths
    assert all(path.startswith("/api/") for path in api_paths)


def test_catalogs_moved_under_api(client):
    data = [{"depto_ocu": 1, "nombre": "Guatemala"}]

    with patch(
        "core.controllers.catalogs_controller.get_departments",
        return_value=data,
    ):
        response = client.get("/api/catalogs/departamentos")

    assert response.status_code == 200
    assert response.json() == data


def test_old_catalog_route_removed(client):
    response = client.get("/catalogs/departamentos")

    assert response.status_code == 404


def test_cors_allows_configured_origin(client):
    response = client.options(
        "/",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_rejects_unknown_origin(client):
    response = client.options(
        "/",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert "access-control-allow-origin" not in response.headers
