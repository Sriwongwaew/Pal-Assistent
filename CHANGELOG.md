# Ändringar

Alla märkbara ändringar per version. Nyast överst.

Skriv nya rader under **Ej släppt** medan du jobbar. `npm version` flyttar dem automatiskt till
den nya versionen, och GitHub-utgåvan får exakt den texten – det är också den appen visar när den
säger att en uppdatering finns. Skriv därför för den som *använder* appen, inte för den som
skrivit koden: "avelsplanen räknar nu med delade kullar" säger något, "refaktorerade clutchEggs"
gör det inte.

## Ej släppt

- **Avelsplanen parar ihop bärarna två och två.** Tidigare lade den på en önskad passiv i taget
  på samma linje. Att i stället bygga två föräldrar med två passiver var och möta dem på mitten
  är billigare — sista steget kostar ändå lika mycket, men vägen dit blir kortare. Mot din egen
  box: oförändrat med två bärare, ~5 % färre ägg med tre och ~14 % med fyra, aldrig fler.
  Planen räknar nu också med vad **könet** kostar: en unge ur ett tidigare steg är 50/50, så
  behöver den ett bestämt kön tar den i snitt en kull till. Det står i steget det gäller.
- **Ihopslagningsordningen väljs på hela planen**, inte bara på fas 1: olika ordningar landar i
  olika arter, och en som kostar några ägg mer kan landa ett artsteg närmare målet. Väljer
  planen en sådan omväg står det varför, med vad den sparar totalt.
- **Rekommendationerna säger nu vad kondenseringen ger**, inte bara hur många stjärnor det blir:
  samma pal före och efter i HP, attack och försvar, vad du får tillbaka i boxplatser — och att
  det du matar är borta för alltid. En stjärna säger ingenting förrän man räknat om den.
- **Ranchen kröner inte längre den med högst siffra.** "Bäst i boxen på Farming" pekade ut den
  med högst arbetsnivå, men varje art lägger sin egen vara i ranchen och nivån styr bara takten —
  vilket gjorde att en pal såg oumbärlig ut för något du kanske inte ens vill ha. Ranchen visas
  fortfarande, med den förklaringen. Samma sak för sysslor där boxens "bästa" är en nivå 1:a:
  det står nu **enda i boxen**, inte bäst.
- **Rekommendationssidan är ombyggd till en arbetsordning.** Rutnätet av kort är ersatt av en
  rad per art — art, stjärnhopp, hur många som ska matas, hur många platser du får tillbaka —
  där du fäller ut den du håller på med. Sidan läses uppifrån: varning, **Spara dessa** (vad du
  inte ska mata), kön, och sist arterna som saknar några dubbletter till nästa stjärna.
- **Varning överst på sidan.** Kondensering går inte att ångra: det du matar är borta för
  alltid, råden bygger på sparfilen som den såg ut vid senaste inläsningen, och matningen gör du
  själv i spelet på egen risk.
- **Bas-dreamteamet tar inte längre med en ranch-pal.** Ranchen räknades som vilken syssla som
  helst, så den med högst Farming-siffra tog en lagplats — fast vad den lägger avgör om du vill
  ha den alls. Laget täcker nu de tolv riktiga sysslorna, och ranchen har fått en egen lista.
- **Laget släpper den som blivit överflödig.** Den som var bäst när laget var tomt satt kvar
  även efter att två bättre kommit in (Whalaska stannade kvar bredvid en starkare vattnare och
  en starkare kylare). Nu plockas den bort — laget lovar minsta gäng, inte åtta pals.
- **Ranchen – vem lägger vad** är en ny lista under Bäst för…: varan du behöver, vem som lägger
  den och hur snabbt. Arter vars vara vi inte har på tabell står som okända i stället för att
  gissas.
- **Basgänget säger var exemplaret står.** Laget väljer artens bästa individ, och den ligger
  oftast kvar i boxen fast en sämre redan är utplacerad – nu står det under porträttet.


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
