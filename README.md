# Vorkheftruck oefenvragen · Jouw dienst op de terminal

Nederlandstalige oefenapp van DTS voor de voorbereiding op de cursus *Veilig werken met een heftruck*. Versie **V01.08.01**.

## Zo oefent een deelnemer

De dienst bestaat uit 18 werkorders van vijf tot negen vragen, met samen 119 vragen. Het werkorderbord groepeert ze in drie fasen van een oefendienst. Elke werkorder begint met een situatie uit de haven of de procesindustrie. Deelnemers volgen de voorgestelde route of kiezen zelf een onderwerp. Het werkorderbord laat zien wat openstaat en waar ze gebleven zijn.

Na elke werkorder kunnen deelnemers alle antwoorden bekijken of alleen de vragen waarop ze nog iets kunnen leren. Bij elke vraag zien ze hun keuzes, de juiste antwoorden en de uitleg. Bij een aantal werkorders kunnen ze aan het eind ook twee reacties voor een collega uitproberen. Elke reactie krijgt eigen feedback. Na elk blok verschijnt een werkorderstempel in het logboek, met daarnaast het aantal volledig juiste antwoorden. Bij een herhaling ziet de deelnemer hoeveel vragen nu volledig goed zijn die eerder fout of deels goed waren.

Deelnemers kunnen vragen bewaren om met de trainer te bespreken. Die bespreekpunten komen met uitleg in hun persoonlijke logboek. Ze kunnen een werkorder gericht herhalen met foute, deels goede of volledig goede antwoorden. Tijdens een herhaling blijft de werkorder als afgerond meetellen. Een nieuwe oefendienst begint met lege werkorders en behoudt de bespreekpunten.

De voortgang blijft lokaal op hetzelfde webadres, in dezelfde browser. De app leest antwoorden uit eerdere versies in aan de hand van de vraag-ID. Ook verplaatste vragen blijven zo meetellen.

## Beeld, spelpunten en geluid

De hefmeter telt unieke vragen met een antwoord, maximaal 119 per dienst. Ook een fout of gedeeltelijk antwoord levert één hefpunt op. Wissen van een antwoord in de eerste ronde draait dat punt terug. Herhalen levert geen extra hefpunten op. De antwoordpunten voor de inhoudelijke feedback blijven apart. De meter wordt afgeleid van de bestaande antwoorden, ook voor deelnemers die eerder begonnen.

Elke werkorder heeft een werkplekbeeld uit de app of een afbeelding uit de cursus. Een aantal werkorders biedt een kijkvraag voor de nabespreking. Bij vier werkorders wijst de deelnemer de plek in het beeld aan en krijgt een aanwijzing of uitleg. De havenfoto en de acht werkplekbeelden zijn voor deze app gegenereerd. De oorspronkelijke lesafbeeldingen blijven bij de vragen. Bij werkorders over verkeer en zwaartepunt kan de deelnemer een korte GIF over uitzwaai of lastzwaartepuntafstand zelf starten. De stilstaande weergave bevat dezelfde kerninformatie. De heftruck op de meter verbeeldt de spelvoortgang.

Geluid staat bij het eerste bezoek uit. De knop bovenaan schakelt de korte hefgeluiden, de portofoontoon en het eindsignaal aan of uit. De browser onthoudt deze voorkeur. Alle beelden, animaties en geluiden werken lokaal met de bestanden in `dist`.

## Publiceren via Cloudflare Workers

Deze GitHub-repository hoort bij de bestaande Worker **vorkheftruck-oefenvragen**. Workers Builds kan de bestanden rechtstreeks vanuit GitHub publiceren.

| Instelling in Cloudflare | Waarde |
| --- | --- |
| Git-repository | `JosvR/vorkheftruck-oefenvragen` |
| Productiebranch | `main` |
| Root directory | Hoofdmap van de repository (`/`) |
| Build command | Leeg |
| Deploy command | `npx wrangler deploy` |

`wrangler.jsonc` in de hoofdmap bevat de Worker-naam en de te publiceren map `./dist`. Een bestaande deployopdracht met `--assets ./dist` gebruikt dezelfde bestanden. Bij een actieve Git-koppeling start Cloudflare na een wijziging op `main` de publicatie. [Build-instellingen van Cloudflare](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)

## Publiceren via Netlify

1. Kies in Netlify **Add new project → Import an existing project → GitHub**.
2. Kies **JosvR/vorkheftruck-oefenvragen** en selecteer de branch **main**.
3. Laat **Base directory** en **Build command** leeg. De **Publish directory** is **dist**. Die map staat ook in `netlify.toml`.
4. Kies **Deploy**. Updates op `main` worden bij een actieve GitHub-koppeling automatisch gepubliceerd.

De app bestaat uit statische bestanden. Er zijn geen accounts, database, serverfuncties, omgevingsvariabelen of installatiestappen nodig. Antwoorden blijven in dezelfde browser zodat de deelnemer later verder kan.

## Oefenvragen

- **N01–N52** zijn nieuwe praktijksituaties bij de lespresentatie *Veilig werken met een heftruck* van 26 november 2026. De examens 3.1 en 3.2 geven richting aan de leerdoelen. De voorbeelden, antwoordopties en feedback zijn voor het oefenen uitgewerkt. De uitsneden in `dist/img/cursus` komen uit de lespresentatie.
- **N53–N57** behandelen de dagelijkse controle vóór gebruik (DTS-checklist), Life-Saving Rules (*Heftruck Complete Cursus*, augustus 2026), periodieke keuring (twee voorbeeldstickers) en veilig parkeren volgens de DT&S-werkafspraak.
- **H01–H05** behandelen de vijf vorkheftruckhoogtes in de werkorder *De vijf hoogtes van de heftruck*. De tekeningen komen uit de DTS-cursusinfographic *Vijf hoogtes van de vorkheftruck*.
- **A01–A05**: nieuwe Arbowetvragen, gebaseerd op *Presentatie Heftruck PP DTS* (29 oktober 2026, dia’s 4–7 en 12–13) en *Heftruck Complete Cursus* (augustus 2026, hoofdstuk Wet- en regelgeving).
- **K, V en R**: vragen gebaseerd op de drie delen van de vragenbank in §5.3 van *ABA BOST CB Reach V6.0624*, p. 34–44. K staat voor kennis toepassen, V voor veiligheid en R voor bediening. Bij de herziening vervielen K14, R08 en R17. R22 is toegevoegd op basis van de DTS-lespresentatie (dia’s 32 en 59).
- De vraagstammen zijn in het Nederlands geformuleerd en vergeleken met examenversies 3.1 en 3.2. Britse regelgeving is naar Nederlandse regelgeving of een expliciete bedrijfsafspraak vertaald. Lokale voorschriften en truckspecificaties zijn in de vraag opgenomen waar ze het antwoord bepalen.
- Bij ABA-meerkeuzevraag 3 (meerdere antwoorden) zijn twee gemarkeerde risico’s op hellingen samengevoegd. De bron vraagt om vier antwoorden en markeert er vijf. De oefenvraag heeft vier correcte keuzes.
- Eén punt per juist gekozen (deel)antwoord. Er geldt geen cesuur. Alle onjuiste, gemiste en juiste opties worden bij het nakijken herkenbaar gemarkeerd. Het lesmateriaal van DTS is gebruikt voor het logo en de afbeeldingen. Verwijzingen naar Nederlandse vak- en regelgeving staan in de app onder **Bronnen en begrippen**.
