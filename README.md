# Heftruck en reachtruck oefenen

Nederlandstalige oefenapp voor zelfstandige voorbereiding op de DTS-training. Versie **V01.02.00**.

## Oefenen per onderwerp

De 57 vragen zijn verdeeld over acht oefenblokken van vijf tot acht vragen. Deelnemers kiezen zelf een onderwerp en klikken bij iedere vraag op **Controleer antwoord** voor hun punten, de juiste en gemiste keuzes en de uitleg. Een blokoverzicht is ook tussentijds beschikbaar. Via **Herhaal gemiste vragen** oefenen ze alleen de vragen waarop ze eerder punten lieten liggen. Bij een herhaling telt het laatst gecontroleerde antwoord. De volledige reeks blijft beschikbaar via **Alle 57 vragen oefenen**.

Antwoorden en nog niet gecontroleerde keuzes worden in dezelfde browser op hetzelfde webadres bewaard. Deze versie leest ook de voortgang van V01.01.00 op dat adres. Een oefenblok opnieuw beginnen wist alleen de antwoorden in dat blok. Opnieuw beginnen vanuit **Alle vragen** wist de hele reeks.

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

- **A01–A05**: nieuwe Arbowetvragen, gebaseerd op *Presentatie Heftruck PP DTS* (29 oktober 2026, dia’s 4–7 en 12–13) en *Heftruck Complete Cursus* (augustus 2026, hoofdstuk Wet- en regelgeving).
- **K, V en R**: vragen gebaseerd op de drie delen van de vragenbank in §5.3 van *ABA BOST CB Reach V6.0624*, p. 34–44. K staat voor kennis toepassen, V voor veiligheid en R voor bediening. Bij de herziening vervielen K14, R08 en R17. R22 is toegevoegd op basis van de DTS-lespresentatie (dia’s 32 en 59).
- De vraagstammen zijn in het Nederlands geformuleerd en vergeleken met examenversies 3.1 en 3.2. Britse regelgeving is naar Nederlandse regelgeving of een expliciete bedrijfsafspraak vertaald. Lokale voorschriften en truckspecificaties zijn in de vraag opgenomen waar ze het antwoord bepalen.
- Bij ABA-meerkeuzevraag 3 (meerdere antwoorden) zijn twee gemarkeerde risico’s op hellingen samengevoegd. De bron vraagt om vier antwoorden en markeert er vijf. De oefenvraag heeft vier correcte keuzes.
- Eén punt per juist gekozen (deel)antwoord. Er geldt geen cesuur. Alle onjuiste, gemiste en juiste opties worden bij het nakijken herkenbaar gemarkeerd. Het lesmateriaal van DTS is gebruikt voor het logo en de afbeeldingen. Verwijzingen naar Nederlandse vak- en regelgeving staan in de app onder **Bronnen en begrippen**.

Versie V01.01.00 bevat 57 vragen voor maximaal 90 punten. Door de gewijzigde vragenbank start deze versie met een nieuwe oefenronde.
