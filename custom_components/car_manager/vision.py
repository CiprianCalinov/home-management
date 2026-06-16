"""Photo → structured data for Car Manager, via the user's Google Gemini.

Reuses the API key already configured in the Google Generative AI Conversation
integration (no extra key/config needed). The image bytes are sent straight to
Gemini from memory — nothing is written to disk, no media-source, no
allowlist_external_dirs. Gemini is asked to return strict JSON, which we parse
and hand back to the panel for review before saving.
"""

from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any

import aiohttp
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

_LOGGER = logging.getLogger(__name__)

GGAI_DOMAIN = "google_generative_ai_conversation"
DEFAULT_MODEL = "gemini-2.0-flash"

PROMPTS: dict[str, str] = {
    "fuel": (
        "Ești un asistent care extrage date dintr-un BON FISCAL de la o "
        "benzinărie din România. Întoarce DOAR un obiect JSON cu cheile:\n"
        "- date: data bonului în format YYYY-MM-DD (sau null)\n"
        "- liters: numărul de litri alimentați, ca număr cu punct zecimal (sau null)\n"
        "- price_total: suma totală plătită în RON, ca număr fără simbol valutar (sau null)\n"
        "- odometer: kilometrajul dacă apare, ca număr întreg (sau null)\n"
        "- fuel_type: 'motorină', 'benzină' sau 'GPL' (sau null)\n"
        "- station: numele benzinăriei (OMV, Petrom, Rompetrol, MOL, Lukoil...) (sau null)\n"
        "Folosește punct ca separator zecimal. Niciun text în afara JSON-ului."
    ),
    "cost": (
        "Extrage date dintr-o factură/bon/chitanță auto din România. "
        "Întoarce DOAR un obiect JSON cu cheile:\n"
        "- date: YYYY-MM-DD (sau null)\n"
        "- amount: suma totală în RON, ca număr (sau null)\n"
        "- category: una dintre 'service', 'combustibil', 'asigurare', 'taxe', "
        "'anvelope', 'altele' (alege cea mai potrivită)\n"
        "- note: descriere scurtă (furnizor / ce s-a plătit) (sau null)\n"
        "Punct ca separator zecimal. Niciun text în afara JSON-ului."
    ),
    "talon": (
        "Extrage date din TALONUL (certificatul de înmatriculare) unei mașini din "
        "România. Câmpuri standard: A = nr. înmatriculare, B = data primei "
        "înmatriculări, D.1 = marca, D.3 = model/denumire comercială, "
        "E = numărul de identificare (VIN). Întoarce DOAR un obiect JSON cu cheile:\n"
        "- plate: numărul de înmatriculare (ex. 'B 123 ABC') (sau null)\n"
        "- make: marca (ex. 'Dacia') (sau null)\n"
        "- model: modelul (ex. 'Logan') (sau null)\n"
        "- vin: seria de șasiu / VIN, 17 caractere (sau null)\n"
        "- year: anul primei înmatriculări (câmpul B), număr de 4 cifre (sau null)\n"
        "Niciun text în afara JSON-ului."
    ),
}


def _find_credentials(hass: HomeAssistant, override_model: str) -> tuple[str | None, str]:
    """Pull API key + model from the existing Google Generative AI entry."""
    for entry in hass.config_entries.async_entries(GGAI_DOMAIN):
        key = entry.data.get("api_key")
        if not key:
            continue
        model = (override_model or "").strip()
        if not model:
            for sub in getattr(entry, "subentries", {}).values():
                candidate = (getattr(sub, "data", None) or {}).get("chat_model")
                if not candidate:
                    continue
                name = candidate.split("/")[-1]
                # Skip TTS / image-generation models — they can't read photos.
                if "tts" in name.lower() or "image" in name.lower():
                    continue
                model = name
                break
        return key, (model or DEFAULT_MODEL)
    return None, DEFAULT_MODEL


def _decode_data_url(data_url: str) -> tuple[bytes, str]:
    mime = "image/jpeg"
    payload = data_url
    if data_url.startswith("data:"):
        header, payload = data_url.split(",", 1)
        mime = header[5:].split(";", 1)[0] or mime
    elif "," in data_url:
        payload = data_url.split(",", 1)[1]
    return base64.b64decode(payload), mime


def _blocking_call(key: str, model: str, prompt: str, image: bytes, mime: str) -> str:
    # Imported lazily: the google-genai package ships with the Google
    # Generative AI integration, so it's only present if that's installed.
    from google.genai import Client, types

    client = Client(api_key=key)
    response = client.models.generate_content(
        model=model,
        contents=[
            types.Part.from_bytes(data=image, mime_type=mime),
            prompt,
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.0,
        ),
    )
    return response.text or ""


def _parse_json(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned[:4].lower() == "json":
            cleaned = cleaned[4:]
    try:
        return json.loads(cleaned)
    except (ValueError, TypeError):
        match = re.search(r"\{.*\}", cleaned, re.S)
        if match:
            try:
                return json.loads(match.group(0))
            except (ValueError, TypeError):
                return None
    return None


INSIGHT_PROMPT = (
    "Ești un asistent auto prietenos. Pe baza datelor de cheltuieli de mai jos "
    "(sume în RON, consum în L/100km), scrie un rezumat SCURT în limba română, "
    "3-4 fraze, cu 1-2 observații utile (ex. categoria pe care s-a cheltuit cel "
    "mai mult, dacă consumul pare mare, o sugestie). Nu inventa date care nu "
    "există. Răspunde DOAR cu textul rezumatului, fără markdown. Date:\n"
)


def _insight_call(key: str, model: str, prompt: str) -> str:
    from google.genai import Client

    client = Client(api_key=key)
    response = client.models.generate_content(model=model, contents=[prompt])
    return response.text or ""


async def async_insight(hass: HomeAssistant, summary: dict[str, Any]) -> dict[str, Any]:
    """Ask Gemini for a short human summary of the spending data."""
    key, model = _find_credentials(hass, "")
    if not key:
        return {"ok": False, "error": "Google Generative AI (Gemini) nu este configurat în HA."}
    prompt = INSIGHT_PROMPT + json.dumps(summary, ensure_ascii=False, indent=2)
    try:
        text = await hass.async_add_executor_job(_insight_call, key, model, prompt)
    except Exception as err:  # noqa: BLE001
        _LOGGER.exception("Car Manager: insight Gemini a eșuat")
        return {"ok": False, "error": f"Eroare Gemini: {err}"}
    return {"ok": True, "text": (text or "").strip(), "model": model}


async def async_decode_vin(hass: HomeAssistant, vin: str) -> dict[str, Any]:
    """Decode a VIN to make/model/year via the free NHTSA vPIC API."""
    code = (vin or "").strip().upper()
    if len(code) != 17:
        return {"ok": False, "error": "VIN invalid (trebuie să aibă 17 caractere)."}

    session = async_get_clientsession(hass)
    url = f"https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/{code}?format=json"
    try:
        async with session.get(url, timeout=aiohttp.ClientTimeout(total=12)) as resp:
            payload = await resp.json()
    except Exception as err:  # noqa: BLE001
        return {"ok": False, "error": f"Serviciul de decodare VIN nu a răspuns: {err}"}

    results = (payload.get("Results") or [{}])[0]
    make = (results.get("Make") or "").strip() or None
    model = (results.get("Model") or "").strip() or None
    year = (results.get("ModelYear") or "").strip() or None
    return {"ok": True, "make": make, "model": model, "year": year}


async def async_scan(
    hass: HomeAssistant, kind: str, data_url: str, override_model: str = ""
) -> dict[str, Any]:
    """Scan a photo of kind 'fuel' | 'cost' | 'talon' → structured fields."""
    prompt = PROMPTS.get(kind)
    if not prompt:
        return {"ok": False, "error": f"Tip de scanare necunoscut: {kind}"}

    key, model = _find_credentials(hass, override_model)
    if not key:
        return {
            "ok": False,
            "error": "Google Generative AI (Gemini) nu este configurat în HA. "
            "Adaugă integrarea și apoi reîncearcă.",
        }

    try:
        image, mime = _decode_data_url(data_url)
    except Exception as err:  # noqa: BLE001
        return {"ok": False, "error": f"Imagine invalidă: {err}"}

    try:
        text = await hass.async_add_executor_job(
            _blocking_call, key, model, prompt, image, mime
        )
    except Exception as err:  # noqa: BLE001
        _LOGGER.exception("Car Manager: scanarea Gemini a eșuat")
        return {"ok": False, "error": f"Eroare Gemini: {err}"}

    data = _parse_json(text)
    if data is None:
        return {"ok": False, "error": "Răspuns ne-parsabil de la Gemini.", "raw": text}

    return {"ok": True, "kind": kind, "model": model, "data": data}
