"""Private document-photo storage for Car Manager.

Full images are written under ``<config>/car_manager_docs/<car_id>/<doc_id>.jpg``
— a private directory (NOT ``www``), so they are never served publicly. The
panel reads them back as base64 only over the authenticated websocket. A small
thumbnail (base64) is kept in the data store for instant display.
"""

from __future__ import annotations

import base64
import os

from homeassistant.core import HomeAssistant

DOCS_DIR = "car_manager_docs"


def _path(hass: HomeAssistant, car_id: str, doc_id: str) -> str:
    return hass.config.path(DOCS_DIR, car_id, f"{doc_id}.jpg")


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
    await hass.async_add_executor_job(_save_sync, _path(hass, car_id, doc_id), _decode(image))


async def async_read_document(hass: HomeAssistant, car_id: str, doc_id: str) -> str | None:
    data = await hass.async_add_executor_job(_read_sync, _path(hass, car_id, doc_id))
    if data is None:
        return None
    return "data:image/jpeg;base64," + base64.b64encode(data).decode()


async def async_delete_document(hass: HomeAssistant, car_id: str, doc_id: str) -> None:
    await hass.async_add_executor_job(_delete_sync, _path(hass, car_id, doc_id))
