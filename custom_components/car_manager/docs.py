"""Private document-photo storage for Car Manager.

Full images are written under ``<config>/car_manager_docs/<car_id>/<doc_id>.jpg``
— a private directory (NOT ``www``), so they are never served publicly. The
panel reads them back as base64 only over the authenticated websocket. A small
thumbnail (base64) is kept in the data store for instant display.
"""

from __future__ import annotations

import base64
import os
import re

from homeassistant.core import HomeAssistant

DOCS_DIR = "car_manager_docs"

# car_id / doc_id are generated server-side (uuid hex / car ids), so a strict
# allowlist both validates them and blocks any path-traversal payload that a
# malicious or buggy websocket client might send.
_ID_RE = re.compile(r"[A-Za-z0-9_-]{1,64}")


def _safe_id(value: str) -> str:
    if not isinstance(value, str) or not _ID_RE.fullmatch(value):
        raise ValueError(f"invalid id: {value!r}")
    return value


# Only accept genuine base64 image data URLs (blocks XSS payloads sneaking in as
# a "thumbnail" that later gets rendered into the panel's HTML).
_DATA_IMG_RE = re.compile(r"^data:image/(?:jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$")


def is_data_image(value: str) -> bool:
    return isinstance(value, str) and bool(_DATA_IMG_RE.match(value))


def _path(hass: HomeAssistant, car_id: str, doc_id: str) -> str:
    car_id = _safe_id(car_id)
    doc_id = _safe_id(doc_id)
    base = os.path.realpath(hass.config.path(DOCS_DIR))
    path = os.path.realpath(os.path.join(base, car_id, f"{doc_id}.jpg"))
    # defence in depth: never touch anything outside the docs directory
    if path != base and not path.startswith(base + os.sep):
        raise ValueError("path escapes documents directory")
    return path


def _decode(data_url: str) -> bytes:
    if data_url.startswith("data:") and "," in data_url:
        return base64.b64decode(data_url.split(",", 1)[1])
    return base64.b64decode(data_url)


def _save_sync(path: str, data: bytes) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as handle:
        handle.write(data)


def _read_sync(path: str) -> bytes | None:
    if not os.path.exists(path):
        return None
    with open(path, "rb") as handle:
        return handle.read()


def _delete_sync(path: str) -> None:
    try:
        os.remove(path)
    except OSError:
        pass


async def async_save_document(hass: HomeAssistant, car_id: str, doc_id: str, image: str) -> None:
    # doc_id is server-generated and car_id is validated against the store before
    # this is called; _path still re-validates as a hard guard.
    await hass.async_add_executor_job(_save_sync, _path(hass, car_id, doc_id), _decode(image))


async def async_read_document(hass: HomeAssistant, car_id: str, doc_id: str) -> str | None:
    try:
        path = _path(hass, car_id, doc_id)
    except ValueError:
        return None
    data = await hass.async_add_executor_job(_read_sync, path)
    if data is None:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(data).decode()


async def async_delete_document(hass: HomeAssistant, car_id: str, doc_id: str) -> None:
    try:
        path = _path(hass, car_id, doc_id)
    except ValueError:
        return
    await hass.async_add_executor_job(_delete_sync, path)
