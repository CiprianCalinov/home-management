# Car Manager (Home Assistant)

Integrare personală pentru administrarea autovehiculelor în Home Assistant:
termene legale (RCA, ITP, rovinietă, CASCO), revizii & consumabile, costuri,
combustibil & consum, dotări obligatorii și baterie — toate într-un **panou
dedicat în bara laterală**, plus senzori pe care îi poți folosi în automatizări.

> Inspirată de „Car Manager România" (HAForgeLabs), dar 100% locală, fără
> licențe și fără dependență de portaluri externe. Rovinieta/RCA/ITP se
> introduc manual și primești remindere.

## Ce conține

- **Panou lateral** „Car Manager" cu tab-urile: Acasă, Mașini, Costuri,
  Statistici, Combustibil, Dotări, Baterie, Setări.
- **Senzori per mașină**: zile rămase RCA / ITP / rovinietă / CASCO,
  kilometraj, următoarea revizie + un `binary_sensor` „Necesită atenție".
- **Senzori de flotă**: stare flotă, nr. mașini, alerte, cost an curent.
- **Servicii**: `car_manager.add_fuel`, `car_manager.add_cost`,
  `car_manager.refresh`, `car_manager.notify_due`.
- **Backup**: export / import (merge) JSON din tab-ul Setări.

Datele se salvează local în `.storage/car_manager_data` (nu expun VIN sau
numere de înmatriculare în nicio cerere externă).

## Instalare

1. Copiază folderul `custom_components/car_manager/` în configul tău Home
   Assistant, astfel încât să arate așa:

   ```
   <config>/custom_components/car_manager/__init__.py
   <config>/custom_components/car_manager/manifest.json
   <config>/custom_components/car_manager/frontend/car-manager-panel.js
   ...
   ```

   Poți copia prin add-on-ul **Samba**, **File editor / Studio Code Server**,
   **SSH**, sau direct pe cardul SD / mașina unde rulează HA.

2. **Repornește Home Assistant** (Setări → Sistem → Repornire).

3. Mergi la **Setări → Dispozitive și servicii → + Adaugă integrare**, caută
   **Car Manager** și confirmă.

4. În bara laterală apare **Car Manager**. Dacă nu apare imediat, golește
   cache-ul browserului / repornește aplicația mobilă (Ctrl+F5 pe desktop).

## Instalare prin HACS (din GitHub)

Recomandat dacă vrei actualizări ușoare. Necesită [HACS](https://hacs.xyz)
instalat în Home Assistant.

1. Pune codul într-un **repo pe GitHub** (vezi „Publicare pe GitHub" mai jos).
   Poate fi **privat** — HACS îl accesează pentru că e autentificat cu contul
   tău GitHub (token cu scope `repo`). Structura trebuie să fie exact:

   ```
   home-management/                  (rădăcina repo-ului)
   ├─ hacs.json
   └─ custom_components/car_manager/ (integrarea)
   ```

2. În HA: **HACS → ⋮ (dreapta sus) → Custom repositories**.
3. Lipește URL-ul repo-ului, categorie **Integration**, apasă **Add**.
4. Caută **Car Manager** în HACS → **Download** → **Repornește HA**.
5. **Setări → Integrări → + Adaugă → Car Manager**.

Actualizări viitoare: dai un nou *release/tag* pe GitHub și HACS îți arată
butonul „Update".

### Publicare pe GitHub (o singură dată)

Pe calculatorul tău, în folderul proiectului:

```bash
git init
git add .
git commit -m "Car Manager v0.1.0"
git branch -M main
git remote add origin git@github.com:CiprianCalinov/home-management.git
git push -u origin main
git tag v0.1.0 && git push --tags
```

Înlocuiește `USERNAME` (și în `manifest.json`: `documentation`,
`issue_tracker`, `codeowners`) cu numele tău de GitHub. Repo-ul trebuie să fie
**public** ca HACS să-l poată accesa.

## Utilizare

- **Adaugă mașină**: tab *Mașini* → *Adaugă autovehicul*. Completează datele
  generale, termenele legale (date de expirare), reviziile (ultima dată / la ce
  km), dotările, bateria și anvelopele.
- **Termene**: introdu data de expirare pentru RCA / ITP / rovinietă / CASCO →
  panoul și senzorii calculează automat „zile rămase" și marchează alertele
  (≤ 30 zile = atenție, expirat = critic).
- **Combustibil**: tab *Combustibil* → adaugă bonuri. Cu cel puțin 2 alimentări
  „plin" se calculează consumul mediu (L/100km).
- **Costuri**: tab *Costuri* → adaugă cheltuieli pe categorii; statistici în
  tab-ul *Statistici*.

## Notificări (automatizare recomandată)

Setează un serviciu de notificare în *Setări* (ex. `notify.mobile_app_telefon`),
apoi creează o automatizare zilnică:

```yaml
alias: Car Manager - verifică termene
trigger:
  - platform: time
    at: "08:00:00"
action:
  - service: car_manager.notify_due
    data:
      days: 30
```

Alternativ, folosește direct senzorii (ex. `sensor.logan_rca`) în propriile
automatizări/dashboard-uri.

## Senzori expuși (exemple)

| Entitate | Descriere |
|---|---|
| `sensor.<masina>_rca` | Zile rămase RCA (attr: `expira`, `expirat`) |
| `sensor.<masina>_itp` | Zile rămase ITP |
| `sensor.<masina>_rovinieta` | Zile rămase rovinietă |
| `sensor.<masina>_casco` | Zile rămase CASCO |
| `sensor.<masina>_kilometraj` | Kilometraj curent |
| `sensor.<masina>_urmatoarea_revizie` | Zile până la prima revizie scadentă |
| `binary_sensor.<masina>_necesita_atentie` | `on` dacă există alerte |
| `sensor.stare_flota` | OK / Atenție |
| `sensor.cost_an_curent` | Cost total an curent (RON) |

## Note

- Integrarea este **single-instance** (o singură configurare, oricâte mașini).
- Pentru a actualiza panoul după modificări la `car-manager-panel.js`, golește
  cache-ul browserului (fișierul e servit fără cache-headers).
- Domeniul este `car_manager`. Dacă instalezi și „Car Manager România" oficial,
  redenumește acest folder + `DOMAIN` ca să eviți conflictul.
