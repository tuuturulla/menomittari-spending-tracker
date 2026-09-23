# P0-01: sovelluksen runko – työseloste ja oppituntimateriaali

## Tavoite ja lopputulos

Ensimmäisen vaiheen tarkoitus oli tehdä Menomittarille mahdollisimman pieni mutta toimiva tekninen perusta. Vaiheen jälkeen sovellus voidaan rakentaa, käynnistää ja tarkistaa toistettavasti Docker-kontissa. Käyttöliittymä näyttää Menomittarin aloitusnäkymän, mutta ei vielä käsittele tapahtumia tai tallenna tietoja.

Työ rajattiin P0-01-tehtävän hyväksymisehtoihin. Paikallista tallennusta, CSV-tuontia, laskentaa ja varmuuskopioita ei aloitettu, koska ne kuuluvat myöhempiin tehtäviin.

## Lähtötilanne ja työjärjestys

Ennen toteutusta tarkistettiin projektin README, projektisuunnitelma, työlista, arkkitehtuuri, aineistosopimus, sisäisten toimintojen sopimus ja agenttiohje. Git-työpuu oli puhdas, lähtöcommit oli `9e38ee7d1983f065713e5c304b8ad9c2d211ae7f` ja lähtöhaara oli `main`.

Työ tehtiin uudella haaralla `menomittari/p0-01-runko`. Main-haaraa ei muutettu, eikä työstä tehty committia tai pushia. Työvaihe eteni näin:

1. P0-01 merkittiin työlistassa työn alle.
2. `frontend`-kansioon luotiin React–TypeScript–Vite-runko.
3. Oletusnäkymä korvattiin Menomittarin omalla aloitusnäkymällä.
4. Vitest lisättiin ja näkymälle kirjoitettiin yksi yksinkertainen testi.
5. Riippuvuudet lukittiin täsmällisiin versioihin.
6. Kehitys- ja testausympäristö vietiin Docker Composeen.
7. Asennus, testi, tyyppitarkistus, linttaus, tuotantokoonti ja HTTP-käynnistys tarkistettiin kontissa.

## Mikä teknologia tekee mitä?

| Osa | Tehtävä tässä vaiheessa | Miksi se valittiin? |
| --- | --- | --- |
| React | Muodostaa Menomittarin käyttöliittymän komponenteista. | Projektisuunnitelman käyttöliittymävalinta. |
| TypeScript | Tarkistaa koodin tyyppejä ennen selaimessa ajamista. | Monet virheet löytyvät jo kehitysvaiheessa. |
| Vite | Käynnistää kehityspalvelimen ja kokoaa julkaisutiedostot. | Nopea ja projektisuunnitelman mukainen React-työkalu. |
| Vitest | Ajaa automaattiset testit. | Sopii suoraan Viten ja TypeScriptin rinnalle. |
| Oxlint | Tarkistaa koodista tavallisia virheitä ja epäselviä rakenteita. | Antaa nopean lisätarkistuksen tyyppitarkistuksen rinnalle. |
| pnpm | Asentaa JavaScript-riippuvuudet lukitustiedoston mukaan. | Täsmällinen lukitustiedosto tekee asennuksesta toistettavan. |
| Docker Compose | Rakentaa ja ajaa saman kehitysympäristön kontissa. | Node.js:ää tai pnpm:ää ei tarvitse asentaa isäntäkoneelle. |


## Tärkeimmät tiedostot

| Tiedosto | Mitä se sisältää? | Miksi tiedosto on olemassa? |
| --- | --- | --- |
| `compose.yaml` | Frontend-palvelun rakennus, portti ja kehitysvolyymit. | Yksi komento käynnistää koko tämänhetkisen sovelluksen. |
| `frontend/Dockerfile` | Node-kuva, pnpm-versio ja riippuvuuksien asennus. | Kehitysympäristö pysyy kontin sisällä. |
| `frontend/package.json` | Komennot ja suorat riippuvuudet täsmällisine versioineen. | Projektin työkalut ja yhteiset komennot näkyvät yhdestä paikasta. |
| `frontend/pnpm-lock.yaml` | Koko riippuvuuspuun ratkaistut versiot ja tarkistussummat. | Sama asennus voidaan toistaa myöhemmin. |
| `frontend/src/App.tsx` | Menomittarin ensimmäinen React-komponentti. | Se on tämän vaiheen näkyvä sovellusrunko. |
| `frontend/src/App.test.tsx` | Tarkistaa sovelluksen nimen ja runkotilan. | Testiketju todistetaan toimivaksi ennen varsinaista laskentalogiikkaa. |
| `frontend/vite.config.ts` | Vakaa portti 5173, konttiverkko ja polling-tiedostoseuranta. | Kehitysympäristön osoite ei vaihdu, ja tallennetut muutokset havaitaan myös Windowsin Docker-liitoksen läpi. |

## Miten koodia kommentoidaan?

Projektin koodikommentit kirjoitetaan englanniksi, jotta komponentin tai työkalutiedoston tarkoitus avautuu nopeasti myös ulkopuoliselle tarkastajalle. Kommentteja käytetään tärkeiden vaiheiden, komponenttien vastuiden ja sellaisten valintojen kohdalla, joiden syy ei näy suoraan koodista.

Esimerkiksi Vite-asetuksessa kommentti selittää, miksi palvelin kuuntelee kontin sisällä kaikkia verkkoliitäntöjä samalla, kun Docker Compose julkaisee portin isäntäkoneella vain loopback-osoitteeseen. Dockerfilen kommentit puolestaan selittävät kerrosten järjestyksen ja sen vaikutuksen välimuistin käyttöön. Nämä ovat hyödyllisiä perusteluja, joita pelkkä syntaksi ei kerro.

Jokaista import-riviä, muuttujaa tai helposti luettavaa JSX-elementtiä ei kommentoida. Liika kommentointi vaikeuttaisi olennaisten huomioiden löytämistä. Kun toteutus muuttuu, siihen liittyvä kommentti tarkistetaan samalla, jotta kommentti ei ala kuvata vanhaa toimintaa.

## Miten sovellus käynnistyy?

`docker compose build` lukee Dockerfilen. Docker hakee Node-pohjakuvan, ottaa käyttöön lukitun pnpm-version ja ajaa `pnpm install --frozen-lockfile`. Valitsin `--frozen-lockfile`-asetuksen siksi, että asennus epäonnistuu, jos `package.json` ja lukitustiedosto eivät vastaa toisiaan. Näin ympäristö ei muuta riippuvuuksia huomaamatta.

`docker compose up` käynnistää Viten kontissa. Vite kuuntelee kontin sisällä porttia 5173, ja Compose julkaisee sen isäntäkoneelle vain loopback-osoitteeseen `127.0.0.1`. Sovellus näkyy siis paikallisesti selaimelle, mutta kehitysporttia ei julkaista lähiverkkoon.

Lähdekansio liitetään konttiin, joten tiedostomuutokset näkyvät kehityspalvelimelle. Windowsin Docker Desktop ei aina välitä tavallisia tiedostomuutosilmoituksia konttiin, joten Vite tarkistaa tiedostot polling-menetelmällä 250 millisekunnin välein. Kun esimerkiksi `App.tsx` tallennetaan, Viten HMR-toiminto lähettää muuttuneen moduulin selaimelle ilman kuvan uudelleenrakennusta tai koko sivun käsin lataamista.

`node_modules` säilytetään erillisessä Docker-volyymissa eikä projektikansiossa. Tämä pitää isäntäkoneen erossa Node-asennuksesta ja estää eri käyttöjärjestelmille rakennettujen pakettien sekoittumisen.

## Mitä testi oikeastaan todistaa?

Ensimmäinen testi renderöi `App`-komponentin HTML-merkkijonoksi ja tarkistaa, että tuloksessa ovat tekstit “Menomittari” ja “Sovelluksen runko toimii”. Testi on tarkoituksella pieni. Sen tärkein tehtävä P0-01-vaiheessa on osoittaa, että:

- testityökalu käynnistyy;
- TypeScript- ja React-koodi voidaan ladata testiin;
- komponentti voidaan renderöidä;
- epäonnistuva odotus pysäyttäisi tarkistuksen.

Testi ei vielä todista mitään tapahtumien tuonnista, laskennasta tai tallennuksesta. Niille kirjoitetaan omat testit vasta vastaavissa työvaiheissa.

## Tarkistusten tulokset

Kaikki tarkistukset ajettiin Docker-kontissa 23.9.2026:

| Tarkistus | Tulos |
| --- | --- |
| Lukittu riippuvuusasennus kuvan rakennuksessa | Onnistui |
| `pnpm test` | 1 testitiedosto ja 1 testi läpäisi |
| `pnpm typecheck` | Onnistui ilman virheitä |
| `pnpm lint` | 0 varoitusta ja 0 virhettä |
| `pnpm build` | Tuotantokoonti onnistui |
| Kehityspalvelimen HTTP-tarkistus | `HTTP 200`, HTML-otsikko oli Menomittari |

Kehityskontti pysäytettiin tarkistuksen jälkeen. Dockerin riippuvuusvolyymi jätettiin paikalleen, jotta seuraava käynnistys on nopeampi. Sen poistaminen ei poista sovelluksen lähdekoodia.

## Kokeile ja varmista itse

1. Aja `docker compose build` projektin `lopputyo/menomittari`-kansiossa.
2. Aja `docker compose up` ja avaa <http://127.0.0.1:5173>.
3. Muuta hetkeksi `App.tsx`-tiedoston otsikkoa ja tallenna tiedosto. Viten pitäisi päivittää avoin näkymä noin sekunnin sisällä ilman Docker-kuvan uudelleenrakennusta. Jos muutosta ei näy, varmista `docker compose ps` -komennolla, että frontend on käynnissä, ja käynnistä palvelu tarvittaessa uudelleen komennolla `docker compose restart frontend`.
4. Palauta otsikko ja aja neljä README:n tarkistuskomentoa.
5. Avaa `App.test.tsx`, muuta yksi odotettu teksti tahallaan vääräksi ja katso testin virheilmoitus. Palauta muutos kokeilun jälkeen.

Näiden kokeiden jälkeen pitäisi olla selvää, miten lähdekoodi kulkee Reactilta Viten kautta selaimeen ja miten testit, tyyppitarkistus sekä tuotantokoonti suojaavat seuraavia työvaiheita.

## Seuraava vaihe

P0-02 lisää FastAPI-backendin perustan, SQLite-tietokannan sekä SQLAlchemy- ja Alembic-rakenteen. P0-02:ta ei aloiteta ennen kuin P0-01 on tarkistettu ja hyväksytty.
