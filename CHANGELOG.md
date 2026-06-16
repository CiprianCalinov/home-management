# Changelog

Toate noutățile, pe versiuni.

## v0.9.1
- Securitate: validare strictă a id-urilor de documente (anti path-traversal) și a
  pozelor (doar `data:image/...`), plus escapare la afișare (anti-XSS).

## v0.9.0
- **Poze documente per mașină** — atașezi poze (talon, RCA, ITP, rovinietă, CASCO)
  la fiecare mașină, le vezi în pagina ei și le deschizi mărite. Stocate **privat**
  (nu în folderul public `www`).
- **Planificator 90 de zile** — pe Acasă vezi tot ce urmează (RCA/ITP/rovinietă/revizii),
  sortat după dată, cu zile rămase.
- **Insight lunar cu Gemini** — în Statistici, un rezumat AI al cheltuielilor tale,
  folosind integrarea Google AI deja configurată.

## v0.8.0
- **Timeline / istoric per mașină** — în pagina mașinii, toate evenimentele
  (alimentări, intervenții, cheltuieli) într-un istoric cronologic, cu iconițe.
- **Cost pe km** — estimare automată (lei/km) din kilometrajul alimentărilor.

## v0.7.0
- **Fix alerte**: dotările expirate (trusă medicală, stingător) generează acum
  atenționări (critic dacă au expirat).
- **Navigație simplificată** — doar 5 taburi: Acasă, Mașini, Costuri, Statistici, Setări.
- **Pagină de mașină** — apeși pe o mașină și vezi tot: termene, revizii, combustibil,
  intervenții, dotări, baterie, anvelope și cheltuielile ei. Cu **adăugare rapidă** de
  combustibil și intervenții direct de aici (fără să editezi toată mașina).
- **Date unificate** — adaugi combustibil sau service/intervenție din Costuri SAU din
  pagina mașinii și apare peste tot (la mașină, în consum, în costuri).
- **Costuri pe mașină** — istoricul grupat pe fiecare mașină, cu dată.
- **Hero adaptiv** — pe Acasă vezi cheltuielile **lunii curente**; pe Mașini, lună + an.
- Badge de alertă pe fiecare card de mașină.

## v0.6.0
- Asigurare cu dată început + sfârșit (RCA/CASCO). Buton „Verifică pe aida.info.ro".
- Logo + pagină info pentru HACS + changelog.

## v0.5.0
- Redesign complet, stil Apple (light, elegant). Secțiune „Alte intervenții".

## v0.4.0
- Rework vizual + iconițe custom.

## v0.3.3
- Formular cu bife (progressive disclosure).

## v0.3.2
- Decodare VIN reală (NHTSA): marcă + model + an.

## v0.3.1
- Fix cache panou după update.

## v0.3.0
- Dropdown marcă/model, decodare VIN, scanare poze cu Gemini.

## v0.1.0
- Prima versiune.
