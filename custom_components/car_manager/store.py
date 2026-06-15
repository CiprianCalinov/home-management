"""Persistent storage layer for Car Manager.

All vehicle data, fuel logs and cost entries live in a single
Home Assistant Store (``.storage/car_manager_data``). The frontend panel and
the websocket API read/write through :class:`CarManagerStore`.
"""

from __future__ import annotations

import uuid
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION


def _new_id() -> str:
    return uuid.uuid4().hex[:12]


def _empty_data() -> dict[str, Any]:
    return {
        "cars": {},
        "fuel": [],
        "costs": [],
        "settings": {
            "notify_enabled": True,
            "notify_days": [30, 7, 1],
            "notify_service": "",
            "gemini_model": "",
        },
    }


class CarManagerStore:
    """Thin async wrapper around the HA Store with domain helpers."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, Any] = _empty_data()

    # ------------------------------------------------------------------ load
    async def async_load(self) -> None:
        loaded = await self._store.async_load()
        if loaded:
            data = _empty_data()
            data.update(loaded)
            # make sure nested defaults exist
            data.setdefault("cars", {})
            data.setdefault("fuel", [])
            data.setdefault("costs", [])
            settings = _empty_data()["settings"]
            settings.update(data.get("settings") or {})
            data["settings"] = settings
            self._data = data

    async def _async_save(self) -> None:
        await self._store.async_save(self._data)

    # ------------------------------------------------------------------ raw
    @property
    def data(self) -> dict[str, Any]:
        return self._data

    @property
    def cars(self) -> dict[str, Any]:
        return self._data["cars"]

    @property
    def settings(self) -> dict[str, Any]:
        return self._data["settings"]

    # ------------------------------------------------------------------ cars
    async def async_add_car(self, payload: dict[str, Any]) -> dict[str, Any]:
        car_id = payload.get("id") or _new_id()
        car = _default_car()
        _deep_update(car, payload)
        car["id"] = car_id
        self._data["cars"][car_id] = car
        await self._async_save()
        return car

    async def async_update_car(self, car_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
        car = self._data["cars"].get(car_id)
        if car is None:
            return None
        _deep_update(car, payload)
        car["id"] = car_id
        await self._async_save()
        return car

    async def async_delete_car(self, car_id: str) -> bool:
        if car_id not in self._data["cars"]:
            return False
        del self._data["cars"][car_id]
        # cascade delete logs
        self._data["fuel"] = [f for f in self._data["fuel"] if f.get("car_id") != car_id]
        self._data["costs"] = [c for c in self._data["costs"] if c.get("car_id") != car_id]
        await self._async_save()
        return True

    # ------------------------------------------------------------------ fuel
    async def async_add_fuel(self, payload: dict[str, Any]) -> dict[str, Any]:
        entry = {
            "id": _new_id(),
            "car_id": payload.get("car_id"),
            "date": payload.get("date"),
            "liters": _to_float(payload.get("liters")),
            "price_total": _to_float(payload.get("price_total")),
            "odometer": _to_int(payload.get("odometer")),
            "full": bool(payload.get("full", True)),
            "note": payload.get("note", ""),
        }
        self._data["fuel"].append(entry)
        # keep the car's current mileage in sync if this reading is newer
        if entry["odometer"] and entry["car_id"] in self._data["cars"]:
            car = self._data["cars"][entry["car_id"]]
            if entry["odometer"] > (car.get("mileage") or 0):
                car["mileage"] = entry["odometer"]
                car["mileage_date"] = entry["date"]
        await self._async_save()
        return entry

    async def async_delete_fuel(self, entry_id: str) -> bool:
        before = len(self._data["fuel"])
        self._data["fuel"] = [f for f in self._data["fuel"] if f.get("id") != entry_id]
        changed = len(self._data["fuel"]) != before
        if changed:
            await self._async_save()
        return changed

    # ------------------------------------------------------------------ costs
    async def async_add_cost(self, payload: dict[str, Any]) -> dict[str, Any]:
        entry = {
            "id": _new_id(),
            "car_id": payload.get("car_id"),
            "date": payload.get("date"),
            "category": payload.get("category", "altele"),
            "amount": _to_float(payload.get("amount")),
            "note": payload.get("note", ""),
        }
        self._data["costs"].append(entry)
        await self._async_save()
        return entry

    async def async_delete_cost(self, entry_id: str) -> bool:
        before = len(self._data["costs"])
        self._data["costs"] = [c for c in self._data["costs"] if c.get("id") != entry_id]
        changed = len(self._data["costs"]) != before
        if changed:
            await self._async_save()
        return changed

    # ------------------------------------------------------------------ settings
    async def async_update_settings(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._data["settings"].update(payload)
        await self._async_save()
        return self._data["settings"]

    # ------------------------------------------------------------------ merge import
    async def async_import_merge(self, incoming: dict[str, Any]) -> None:
        for car_id, car in (incoming.get("cars") or {}).items():
            existing = self._data["cars"].get(car_id, _default_car())
            _deep_update(existing, car)
            existing["id"] = car_id
            self._data["cars"][car_id] = existing
        existing_fuel_ids = {f.get("id") for f in self._data["fuel"]}
        for f in incoming.get("fuel") or []:
            if f.get("id") not in existing_fuel_ids:
                self._data["fuel"].append(f)
        existing_cost_ids = {c.get("id") for c in self._data["costs"]}
        for c in incoming.get("costs") or []:
            if c.get("id") not in existing_cost_ids:
                self._data["costs"].append(c)
        await self._async_save()


def _default_car() -> dict[str, Any]:
    return {
        "id": None,
        "name": "Mașina mea",
        "make": "",
        "model": "",
        "plate": "",
        "vin": "",
        "year": None,
        "mileage": 0,
        "mileage_date": None,
        "legal": {
            "rca": None,
            "itp": None,
            "rovinieta": None,
            "casco": None,
        },
        "service": {},
        "equipment": {
            "trusa_medicala": {"has": False, "expira": None},
            "stingator": {"has": False, "expira": None},
            "vesta": False,
            "triunghi": False,
        },
        "battery": {
            "has": False,
            "install_date": None,
            "warranty_months": 48,
        },
        "tires": {
            "season": "",
            "front_mm": None,
            "rear_mm": None,
            "change_date": None,
            "note": "",
        },
    }


def _deep_update(target: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    for key, value in source.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            _deep_update(target[key], value)
        else:
            target[key] = value
    return target


def _to_float(value: Any) -> float | None:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError):
        return None


def _to_int(value: Any) -> int | None:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None
