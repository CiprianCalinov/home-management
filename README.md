<p align="center">
  <img src="custom_components/car_manager/logo.svg" width="120" alt="Car Manager"/>
</p>

<h1 align="center">Car Manager</h1>

<p align="center">
  Administrarea mașinilor tale în Home Assistant — termene, revizii, costuri, consum, dotări.<br/>
  <b>Local · elegant · stil Apple</b>
</p>

---

Panou dedicat în bara laterală Home Assistant pentru administrarea uneia sau mai
multor mașini: termene legale, revizii & consumabile, alte intervenții, costuri,
combustibil & consum, dotări, baterie și anvelope. Plus scanare de bonuri/talon cu
Gemini și decodare VIN.

## Caracteristici

- **Termene legale** — RCA (început + sfârșit), ITP, rovinietă, CASCO: zile rămase și alerte.
- **Revizii & consumabile** — interval pe km și pe timp.
- **Alte intervenții** — istoric reparații/piese (nume, descriere, cost, dată, km), incluse în costuri.
- **Combustibil & consum** — bonuri + L/100km.
- **Costuri & statistici** — pe an, categorii, mașină.
- **Dotări & baterie** — progressive disclosure: bifezi ce ai, apar doar câmpurile relevante.
- **Scanare foto (Gemini)** — bonuri și talon → completare automată, prin integrarea Google Generative AI deja configurată (fără cheie nouă).
- **Decodare VIN** — marcă/model/an automat (NHTSA, cu fallback offline).
- **Senzori** per mașină + flotă, **servicii** pentru automatizări, **backup** JSON.

## Instalare prin HACS

1. HACS → ⋮ → **Custom repositories** → adaugă `https://github.com/CiprianCalinov/home-management`, tip **Integration**.
2. Caută **Car Manager** → **Download** → repornește HA.
3. **Setări → Integrări → + Adaugă → Car Manager**.

Detalii complete: [`custom_components/car_manager/README.md`](custom_components/car_manager/README.md) ·
Noutăți: [`CHANGELOG.md`](CHANGELOG.md)
