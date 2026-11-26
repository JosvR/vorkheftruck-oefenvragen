'use strict';

// Elke werkorder gebruikt één bestaand onderwerp en sluit af met een korte overdracht.
const WORK_ORDERS = {
  arbo: {
    location: 'Ploegkamer', title: 'Neem de dienst over',
    briefing: 'Bij de ploegwissel sluit een nieuwe monteur aan. Hij heeft elders veel gereden, maar kent deze terminal nog niet. De eerste pallet staat al klaar. Wat moet er geregeld zijn voordat hij zelfstandig rijdt?',
    call: '“Ik heb bij mijn vorige werkgever ook gereden. Waar haal ik hier de sleutel?” Wat wil je eerst met je collega bespreken?',
    replies: [
      ['Welke trucks hij gewend is en welke instructie en rijafspraken hier gelden.', 'Zo komt zijn ervaring op tafel én ontdek je welke instructie hij op deze locatie nog nodig heeft.'],
      ['Hoeveel jaar hij al rijdt en wanneer zijn vorige cursus was.', 'Daarmee weet je iets over zijn ervaring. Je weet nog niet of hij deze truck, de rijroutes en de afspraken op het terrein kent.']
    ]
  },
  controle: {
    location: 'Truckstalling', title: 'Haal de truck op',
    briefing: 'De nachtdienst heeft de truck in het vak gezet. Straks breng je onderdelen naar de werkplaats. Hoe neem je de truck over en wat doe je als hij onderweg anders reageert dan je verwacht?',
    call: '“Truck 4 remde net veel minder goed.” Welke melding helpt je collega het meest?',
    replies: [
      ['“Ik zet het in het logboek voor het einde van de dienst.”', 'Het logboek helpt bij de overdracht. Je collega moet ook direct weten dat de truck buiten gebruik is en het defect is gemeld.'],
      ['“Truck 4 staat veilig buiten gebruik. Ik heb het remprobleem gemeld.”', 'Je collega weet om welke truck het gaat, wat het defect is en dat hij de truck moet laten staan.']
    ]
  },
  verkeer: {
    location: 'Kruising bij de loods', title: 'Kies je lijn',
    briefing: 'Je rijdt met een kist vanaf de verpakkingslijn naar de loods. Naast de deur ligt een looproute. Aan het einde van de gang moet je linksaf. Waar kijk je voordat je de bocht inzet?',
    call: '“Waar moet ik op letten bij die blinde hoek naast de loods?” Wat geef je door?',
    replies: [
      ['“Er ligt een looproute achter de deur. Vanaf de truck zie je die pas laat.”', 'Je noemt de plek én wat aan het zicht is onttrokken. Je collega kan daar bij het naderen rekening mee houden.'],
      ['“Het was rustig toen ik er net langsreed.”', 'Dat beschrijft jouw rit. Het zegt weinig over wie er bij de volgende rit achter de hoek vandaan kan komen.']
    ]
  },
  ondergrond: {
    location: 'Buitenterrein', title: 'Verken de rijroute',
    briefing: 'Na een bui ligt de route tussen de loodsen er anders bij. Er is een goot, een kort hellend stuk en verderop ligt verpakkingshout. Hoe bepaal je of en hoe je hier kunt rijden?',
    call: '“Hoe ligt de route naar loods B erbij?” Wat heeft de volgende ploeg aan jouw waarneming?',
    replies: [
      ['“Ik ben er vanmorgen nog langsgekomen.”', 'Sinds jouw rit kan de ondergrond zijn veranderd. Vertel waar het nat is of waar een obstakel ligt.'],
      ['“Bij de goot voor loods B ligt nu los hout. Controleer die plek voor je rit.”', 'De plek en het obstakel zijn duidelijk. Je collega weet waar de route opnieuw bekeken moet worden.']
    ]
  },
  stabiliteit: {
    location: 'Onderdelenloods', title: 'Houd de last in balans',
    briefing: 'Een pomp op een pallet moet van de loods naar de werkplaats. Je ziet ruimte tussen de last en de vorkhiel. Welke invloed hebben de positie van de last en de beweging van de truck?',
    call: '“Deze pomp weegt evenveel als de vorige. Wat is er dan anders?” Wat laat je zien?',
    replies: [
      ['“Kijk waar het zwaartepunt ligt ten opzichte van de vorkhiel.”', 'Bij hetzelfde gewicht maakt de afstand tot de vorkhiel verschil. Verder naar voren neemt het kantelmoment toe.'],
      ['“Kijk op het label. Beide pompen hebben hetzelfde gewicht.”', 'Het gewicht is één gegeven. Met alleen het gewicht zie je het effect van een andere positie van de last over het hoofd.']
    ]
  },
  capaciteit: {
    location: 'Goederenontvangst', title: 'Beoordeel de pompkist',
    briefing: 'Een reservepomp komt binnen in een lange houten kist. De werkplaats wil de kist op hoogte wegzetten. Welke gegevens heb je nodig om het lastdiagram van deze truck te gebruiken?',
    call: '“Het gewicht van de kist is bekend. Kun je hem op die hoogte wegzetten?” Wat zoek je nog op?',
    replies: [
      ['“Wat de truck volgens het typeplaatje maximaal kan tillen.”', 'Het maximum alleen vertelt je nog niet wat bij deze last en op deze hoogte is toegestaan. Daarvoor gebruik je het passende lastdiagram.'],
      ['“De lastzwaartepuntafstand en de gevraagde hefhoogte, voor het diagram van deze truck en uitrusting.”', 'Nu kun je het gewicht vergelijken met de toegestane capaciteit voor deze combinatie.']
    ]
  },
  opnemen: {
    location: 'Werkplaats', title: 'Pak het transportrek op',
    briefing: 'De monteurs hebben een transportrek klaargezet. De vorkopnames zijn gemarkeerd. Er staat ook een pallet met een zware machine aan één kant. Wat vraagt elke last van jou vóór vertrek?',
    call: '“De machine staat uit het midden op de pallet. Waar kijk jij naar bij het opnemen?”',
    replies: [
      ['“Ik kijk naar de gewichtsverdeling en hoe de vorken de last ondersteunen.”', 'De buitenmaat van de pallet laat niet zien waar het gewicht zit. De verdeling over de vorken is hier belangrijk.'],
      ['“Ik zoek vooral het midden van de pallet.”', 'Het midden van de pallet en het zwaartepunt van de machine kunnen uit elkaar liggen. Kijk hoe de last werkelijk wordt ondersteund.']
    ]
  },
  stapelen: {
    location: 'Laadplaats', title: 'Rond de levering af',
    briefing: 'De vrachtwagen staat aan de laadplaats. Een deel van de pallets gaat mee, de rest gaat in de stelling. Wat spreek je af met de chauffeur? Welke hoogtes controleer je bij het doorrijden, heffen en afzetten?',
    call: '“De chauffeur wacht op ons. Wat spreken we af voordat de eerste pallet wordt geladen?”',
    replies: [
      ['“In welke volgorde de pallets meegaan.”', 'De laadvolgorde is nuttig. Spreek ook af waar de chauffeur veilig wacht en hoe je voorkomt dat de vrachtwagen tijdens het laden beweegt.'],
      ['“Waar de chauffeur wacht en hoe we controleren dat de vrachtwagen op zijn plaats blijft.”', 'Zo weten jullie beiden waar de chauffeur hoort te zijn en of de vrachtwagen veilig stilstaat voordat het laden begint.']
    ]
  }
};
