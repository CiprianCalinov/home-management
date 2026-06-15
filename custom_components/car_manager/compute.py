"""Derived-value computation for Car Manager.

Pure functions that turn stored vehicle data into the numbers shown on the
dashboard and exposed as sensors: days remaining for legal obligations,
service intervals due, attention items, and cost rollups. Kept side-effect
free so both the coordinator and the websocket API can call them.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any

from .const import (
    ALERT_DAYS,
    ALERT_KM,
    LEGAL_FIELDS,
    LEGAL_LABELS,
    SERVICE_ITEMS,
)


def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def _days_until(value: Any, today: date) -> int | None:
    target = _parse_date(value)
    if target is None:
        return None
    return (target - today).days


def compute_legal(car: dict[str, Any], today: date) -> dict[str, Any]:
    """Days remaining for RCA / ITP / rovinietă / CASCO."""
    legal = car.get("legal") or {}
    result: dict[str, Any] = {}
    for field in LEGAL_FIELDS:
        expira = legal.get(field)
        days = _days_until(expira, today)
        result[field] = {
            "label": LEGAL_LABELS[field],
            "expira": _parse_date(expira).isoformat() if _parse_date(expira) else None,
            "zile_ramase": days,
            "configured": expira is not None,
            "alert": days is not None and days <= ALERT_DAYS,
            "expired": days is not None and days < 0,
        }
    return result


def compute_service(car: dict[str, Any], today: date) -> dict[str, Any]:
    """For each maintenance item, how many km / days until it is due."""
    mileage = car.get("mileage") or 0
    service = car.get("service") or {}
    result: dict[str, Any] = {}
    for key, defaults in SERVICE_ITEMS.items():
        item = service.get(key)
        if not item:
            continue
        interval_km = item.get("interval_km", defaults["interval_km"]) or 0
        interval_days = item.get("interval_days", defaults["interval_days"]) or 0
        last_km = item.get("last_km")
        last_date = item.get("last_date")

        km_remaining = None
        if interval_km and last_km is not None:
            km_remaining = (last_km + interval_km) - mileage

        days_remaining = None
        last = _parse_date(last_date)
        if interval_days and last is not None:
            due = last.toordinal() + interval_days
            days_remaining = due - today.toordinal()

        alert = (km_remaining is not None and km_remaining <= ALERT_KM) or (
            days_remaining is not None and days_remaining <= ALERT_DAYS
        )
        result[key] = {
            "label": defaults["label"],
            "interval_km": interval_km,
            "interval_days": interval_days,
            "last_km": last_km,
            "last_date": last.isoformat() if last else None,
            "km_remaining": km_remaining,
            "days_remaining": days_remaining,
            "alert": bool(alert),
            "overdue": (km_remaining is not None and km_remaining < 0)
            or (days_remaining is not None and days_remaining < 0),
        }
    return result


def compute_attention(car_view: dict[str, Any]) -> list[dict[str, Any]]:
    """Flatten everything that needs attention into a sorted alert list."""
    alerts: list[dict[str, Any]] = []
    for field, info in car_view["legal"].items():
        if info["alert"]:
            alerts.append(
                {
                    "type": "legal",
                    "key": field,
                    "label": info["label"],
                    "days": info["zile_ramase"],
                    "severity": "critic" if info["expired"] else "atentie",
                }
            )
    for key, info in car_view["service"].items():
        if info["alert"]:
            alerts.append(
                {
                    "type": "service",
                    "key": key,
                    "label": info["label"],
                    "days": info["days_remaining"],
                    "km": info["km_remaining"],
                    "severity": "critic" if info["overdue"] else "atentie",
                }
            )
    alerts.sort(key=lambda a: (a["severity"] != "critic", a.get("days") if a.get("days") is not None else 9999))
    return alerts


def compute_car_view(car: dict[str, Any], today: date) -> dict[str, Any]:
    view = {
        "id": car.get("id"),
        "name": car.get("name"),
        "make": car.get("make"),
        "model": car.get("model"),
        "plate": car.get("plate"),
        "mileage": car.get("mileage") or 0,
        "legal": compute_legal(car, today),
        "service": compute_service(car, today),
    }
    view["attention"] = compute_attention(view)
    view["status_ok"] = len(view["attention"]) == 0
    return view


def compute_costs(data: dict[str, Any], today: date) -> dict[str, Any]:
    """Cost rollups: current-year totals, per category, per car, fuel stats."""
    year = today.year
    costs = data.get("costs") or []
    fuel = data.get("fuel") or []

    by_car: dict[str, dict[str, float]] = {}
    by_category: dict[str, float] = {}
    total_year = 0.0

    def _entry_year(entry: dict[str, Any]) -> int | None:
        parsed = _parse_date(entry.get("date"))
        return parsed.year if parsed else None

    for entry in costs:
        amount = entry.get("amount") or 0
        car_id = entry.get("car_id")
        cat = entry.get("category", "altele")
        if _entry_year(entry) == year:
            total_year += amount
            by_category[cat] = by_category.get(cat, 0) + amount
            by_car.setdefault(car_id, {})
            by_car[car_id][cat] = by_car[car_id].get(cat, 0) + amount

    # per-vehicle "alte intervenții" count as costs in their year
    for car in (data.get("cars") or {}).values():
        car_id = car.get("id")
        for item in car.get("interventions") or []:
            amount = item.get("amount") or 0
            if amount and _entry_year(item) == year:
                total_year += amount
                by_category["interventie"] = by_category.get("interventie", 0) + amount
                by_car.setdefault(car_id, {})
                by_car[car_id]["interventie"] = by_car[car_id].get("interventie", 0) + amount

    # fuel as its own cost stream + consumption stats
    fuel_total_year = 0.0
    for entry in fuel:
        if _entry_year(entry) == year:
            fuel_total_year += entry.get("price_total") or 0

    consumption = _fuel_consumption(fuel)

    return {
        "year": year,
        "total_year": round(total_year, 2),
        "fuel_total_year": round(fuel_total_year, 2),
        "grand_total_year": round(total_year + fuel_total_year, 2),
        "by_category": {k: round(v, 2) for k, v in by_category.items()},
        "by_car": {k: {c: round(v, 2) for c, v in cats.items()} for k, cats in by_car.items()},
        "consumption": consumption,
    }


def _fuel_consumption(fuel: list[dict[str, Any]]) -> dict[str, Any]:
    """Average L/100km per car using consecutive full-tank odometer deltas."""
    per_car: dict[str, list[dict[str, Any]]] = {}
    for entry in fuel:
        if entry.get("odometer") and entry.get("liters"):
            per_car.setdefault(entry.get("car_id"), []).append(entry)

    result: dict[str, Any] = {}
    for car_id, entries in per_car.items():
        entries = sorted(entries, key=lambda e: e.get("odometer") or 0)
        total_liters = 0.0
        total_km = 0
        prev = None
        for entry in entries:
            if prev is not None and entry.get("full"):
                km = (entry["odometer"] or 0) - (prev["odometer"] or 0)
                if km > 0:
                    total_km += km
                    total_liters += entry["liters"] or 0
            prev = entry
        if total_km > 0:
            result[car_id] = round(total_liters / total_km * 100, 2)
    return result


def compute_fleet(cars_view: list[dict[str, Any]], costs: dict[str, Any]) -> dict[str, Any]:
    total_alerts = sum(len(c["attention"]) for c in cars_view)
    critical = sum(1 for c in cars_view for a in c["attention"] if a["severity"] == "critic")
    return {
        "cars": len(cars_view),
        "alerts": total_alerts,
        "critical": critical,
        "status": "OK" if total_alerts == 0 else "Atenție",
        "cost_year": costs["grand_total_year"],
    }


def build_full_view(data: dict[str, Any], today: date) -> dict[str, Any]:
    """The complete computed snapshot returned to the panel and sensors."""
    cars_view = [compute_car_view(car, today) for car in (data.get("cars") or {}).values()]
    costs = compute_costs(data, today)
    fleet = compute_fleet(cars_view, costs)
    return {
        "today": today.isoformat(),
        "fleet": fleet,
        "cars": cars_view,
        "costs": costs,
    }
