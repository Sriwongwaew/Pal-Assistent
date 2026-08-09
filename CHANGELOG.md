# Ändringar

Alla märkbara ändringar per version. Nyast överst.

Skriv nya rader under **Ej släppt** medan du jobbar. `npm version` flyttar dem automatiskt till
den nya versionen, och GitHub-utgåvan får exakt den texten – det är också den appen visar när den
säger att en uppdatering finns. Skriv därför för den som *använder* appen, inte för den som
skrivit koden: "avelsplanen räknar nu med delade kullar" säger något, "refaktorerade clutchEggs"
gör det inte.

## Ej släppt

## 2.0.0 – 2026-08-09

Första publika utgåvan.

- **Boxen** – hela din box som brickor med level, IV och passiver, med sök, filter och sortering.
  Spelets egen Base Info-vy finns kvar för den valda palen.
- **Avelsplanerare** – välj målart, vad palen ska användas till och upp till fyra önskade
  passiver. Du får bärare ur din box, ihopslagningsordning och odds per ägg, plus en artkedja
  fram till målet. Planen räknas i förväntat antal ägg, inte i antal steg, vilket ofta gör en
  längre kedja med rena föräldrar billigare än en kort med en skräpig partner.
- **Perfekt 100/100/100** – söker kortaste vägen till maxade IV över flera generationer, och
  räknar med att kön kostar och att syskon ur samma kull delar ägg.
- **Rekommendationer** – vad du bör kondensera nu, rankat på störst vinst, med vad exemplaret du
  behåller är bra för så du inte matar bort din bästa arbetare.
- **Bäst för…** – attackteam, basteam, bästa arbetare per syssla, fiskepals och snabbaste riddjur.
- **Live-läget** – håller boxen uppdaterad medan du spelar. Mellan varven kollas bara sparfilens
  tidsstämpel, så det kostar i princip ingenting.
- **Ljust och mörkt läge** med tre paletter.
- Sparfilen öppnas alltid skrivskyddat och ingenting lämnar datorn.
