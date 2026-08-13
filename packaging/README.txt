PalAssistent
============

En box- och avelsplanerare för Palworld. Den läser din egen sparfil och visar
boxen, föreslår vilka pals du ska behålla eller kondensera, och räknar ut hur du
avlar fram en pal med rätt passiver och 100/100/100 i IV.


Komma igång
-----------

1. Starta PalAssistent från Startmenyn eller skrivbordet.
2. Klicka "Läs in från spelet" uppe till höger.
3. Klart. Boxen fylls med dina egna pals.

Programmet hittar själv din senaste sparfil under
%LOCALAPPDATA%\Pal\Saved\SaveGames. Ligger saven någon annanstans – en dedikerad
server, en molnmapp, en kopia – klickar du "Mapp" bredvid och pekar ut den.


Live-läget
----------

Kryssa i "Live" i Mapp-panelen så håller programmet koll på när spelet sparar och
uppdaterar boxen av sig själv. Fånga en pal, alt-tabba, och den är redan i listan.

Mellan varven kollas bara sparfilens tidsstämpel, så det kostar i princip
ingenting förrän något faktiskt hänt.


Är det säkert?
--------------

Sparfilen öppnas alltid skrivskyddat. Programmet skriver aldrig in i spelets
mapp, så du kan låta Palworld ligga kvar och köra medan du läser in.

Ingenting skickas någonstans. Allt körs lokalt på din dator, och servern
lyssnar bara på 127.0.0.1 – ingen annan i nätverket kan nå den.

Första gången kan Windows visa "Windows skyddade din dator". Det beror på att
installationsfilen inte är köpt-signerad, inte på att något är fel. Klicka
"Mer info" och sedan "Kör ändå".


Att stänga
----------

Stäng fönstret. Servern stängs med det.


Uppgradering
------------

Kör bara den nya installationsfilen. Din inlästa box nollställs då (arter och
avelstabell kan ha uppdaterats), men ett klick på "Läs in från spelet" hämtar
tillbaka den – eller så gör Live-läget det åt dig vid nästa autospar.


Vad som ingår
-------------

Allt som behövs. Du behöver inte installera Node, Python eller något annat.

Node.js ingår under node\ och är MIT-licensierat; licenstexten ligger bredvid.
Avkodningen av sparfilen bygger på palworld-save-tools och libooz (zao/ooz).
Spelets ikoner och artdata tillhör Pocketpair.


Licens
------

Programmet är fri programvara under GNU Affero General Public License version 3.
Hela licenstexten ligger i LICENSE.txt i den här mappen, och NOTICE.txt räknar
upp allt som ingår men INTE omfattas av den – Pocketpairs ikoner och artdata,
och de komponenter som har egna villkor.

Källkoden når du via länken längst ner i programmet.
