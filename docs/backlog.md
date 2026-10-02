# Kurssityön työlista

Tämä lista kuvaa [projektisuunnitelman](project-plan.md) toteutuksen. Kaikki kahdeksan tehtävää kuuluvat ensimmäiseen versioon. Tehtävä on valmis vasta, kun sen toiminta on tarkistettu ja työn tekijä on hyväksynyt sen.

## Eteneminen

| ID | Tehtävä | Edellyttää | Arvio | Tila |
| --- | --- | --- | --- | --- |
| P0-01 | Sovelluksen runko | Ei aiempia tehtäviä | 2 h | Valmis |
| P0-02 | Backendin perusta | P0-01 | 3 h | Tarkistettavana |
| P0-03 | Käyttäjätilit ja istunnot | P0-02 | 4–5 h | Ei aloitettu |
| P0-04 | Paikallinen tallennus | P0-03 | 3 h | Ei aloitettu |
| P0-05 | Tiedoston tuonti ja luokittelu | P0-04 | 3–4 h | Ei aloitettu |
| P0-06 | Tapahtumat ja yhteenveto | P0-05 | 3–4 h | Ei aloitettu |
| P0-07 | Vertailu ja havainnot | P0-06 | 2–3 h | Ei aloitettu |
| P0-08 | Varmuuskopio ja esittelyn viimeistely | P0-07 | 3–4 h | Ei aloitettu |

Toteutusarvio on 23–28 tuntia, lisäksi 2–4 tuntia yhteiseen läpikäyntiin ja korjauksiin. Tilat: Ei aloitettu, Työn alla, Estynyt, Tarkistettavana, Valmis.

## P0-01: Sovelluksen runko

Valmistumisen ehdot:

- React- ja TypeScript-sovellus käynnistyy paikallisesti Vitellä.
- README kertoo todennetut asennus-, käynnistys- ja tarkistuskomennot.
- Riippuvuuksien versiot ovat lukittuja. Yksi yksinkertainen testi, tyyppitarkistus ja julkaisutiedostojen kokoaminen onnistuvat.

Tarkistus: uusi asennus README:n mukaan ja kaikkien kirjattujen komentojen suoritus.

## P0-02: Backendin perusta

Valmistumisen ehdot:

- FastAPI-backend käyttää Python-riippuvuuksiin `uv`:ta ja käynnistyy omassa Docker-kontissaan frontendin rinnalla.
- SQLAlchemy käyttää MVP:ssä SQLite-tietokantaa ja Alembic hallitsee tietokannan migraatiot.
- `GET /api/health` palauttaa onnistuneen vastauksen, ja frontendin sallittu kehitysosoite on määritetty CORS-asetuksessa täsmällisesti.
- Backend ei vastaanota eikä tallenna CSV-tiedostoja, tapahtumia, summia, kuvauksia, kategorioita tai laskettuja talousraportteja.
- README sisältää todennetut backendin käynnistys-, migraatio- ja testikomennot.

Tarkistus: puhdas kontin rakennus, migraation suoritus, health-pyynnön onnistuminen ja backendin automaattiset testit.

## P0-03: Käyttäjätilit ja istunnot

Valmistumisen ehdot:

- Käyttäjä voi rekisteröityä, kirjautua, tarkistaa kirjautumistilansa ja kirjautua ulos HTTP-rajapinnan kautta.
- Salasanat hajautetaan Argon2id-algoritmilla. Selväkielistä salasanaa ei tallenneta tai kirjoiteta lokiin.
- Kirjautuminen käyttää satunnaista palvelinpuolista istuntoa. Tietokantaan tallennetaan vain istuntotunnisteen hajautus, ja selain saa tunnisteen `HttpOnly`-evästeessä.
- Evästeen `SameSite`, `Secure` ja voimassaoloaika määritetään ympäristön mukaan. Tilaa muuttavat pyynnöt suojataan CSRF-tarkistuksella ja kirjautumisyrityksiä rajoitetaan.
- Frontendissä on rajattu rekisteröitymis-, kirjautumis- ja uloskirjautumisnäkymä. Istuntotunnistetta ei tallenneta `localStorageen`, `sessionStorageen` tai IndexedDB:hen.
- Käyttäjätaulussa ovat tunniste, normalisoitu yksilöllinen sähköposti, salasanatiiviste ja luontiaika. Istuntotaulussa ovat tunnistetiiviste, käyttäjäviite sekä luonti- ja vanhenemisaika.

Tarkistus: rekisteröityminen, saman sähköpostin hylkäys, onnistunut ja epäonnistunut kirjautuminen, suojatun käyttäjätiedon hakeminen, evästeen asetukset, uloskirjautumisen tekemä mitätöinti sekä CSRF- ja yritysrajoitusten testit.

## P0-04: Paikallinen tallennus

Valmistumisen ehdot:

- [Arkkitehtuurin](architecture.md) kaksi paikallista taulua syntyvät Dexiellä kirjautuneen käyttäjän omaan selainkantaan. Tapahtumat ja niiden tuontijaksot voidaan tallentaa ja lukea.
- Yksi tallennus onnistuu joko kokonaan tai ei lainkaan. Virheestä kerrotaan; vanhoja tietoja ei poisteta.
- Historia säilyy tietokannan sulkemisen ja uudelleenavauksen jälkeen.

Tarkistus: erillisen testitietokannan tallennus, luku, virheellisen viitteen hylkäys ja tarkoituksella epäonnistuneen kirjoituksen peruuntuminen.

## P0-05: Tiedoston tuonti ja luokittelu

Valmistumisen ehdot:

- Mukana on kaksi keksittyä CSV-aineistoa [aineistokuvauksen](data-contract.md) odotusarvoilla.
- Tiedoston valinta, ajanjakson syöttö ja tuontinappi toimivat yksinkertaisessa näkymässä.
- Muoto, päivät, summat ja kokorajat tarkistetaan. Virheellinen aineisto ei tallennu osittain.
- Sama tai päällekkäinen jakso hylätään. Tiedoston sisäiset samannäköiset ostokset säilyvät erillisinä.
- Kiinteät kauppiassäännöt antavat oikean ryhmän; tuntematon nimi jää tunnistamattomaksi.

Tarkistus: molemmat demot, lainatut kentät, ääkköset, tyhjä tai virheellinen tiedosto, väärä summa/päivä, ylitetyt rajat ja päällekkäinen jakso. Tässä kohdassa päivitetään jäljellä olevan työn aika-arvio.

## P0-06: Tapahtumat ja yhteenveto

Valmistumisen ehdot:

- Käyttäjä voi valita tallennetun jakson ja selata sen tapahtumia 50 rivin sivuina.
- Näkyvissä ovat menot yhteensä, menoryhmät ja palautukset erikseen. Tulot ja tilisiirrot eivät kasvata menoja.
- Valittu ajanjakso, tyhjä tila ja virheilmoitukset ovat selkeitä. Tapahtumien kuvaukset näytetään tekstinä, ei suoritettavana sivukoodina.
- Yksi yksinkertainen sivu toimii leveässä ja 390 pikselin levyisessä näkymässä; erillisiä kaavioita ei tehdä.

Tarkistus: demojen 90 ja 145 euron menot sekä kummankin 5 euron palautukset. Lisäksi tuntematon menoryhmä, pelkkiä tuloja sisältävä jakso ja jakson vaihtaminen.

## P0-07: Vertailu ja havainnot

Valmistumisen ehdot:

- Valittua jaksoa verrataan ajallisesti lähimpään aiempaan jaksoon.
- Vertailu tehdään vain peräkkäisistä, yhtä pitkistä jaksoista. Muulloin syy näytetään.
- Enintään kolme havaintoa noudattaa aineistokuvauksen laskentasääntöjä ja näyttää vertailujaksot.

Tarkistus: +55 euroa / +61,11 %, Ruokakauppa +30 euroa / +50 % ja uusi Tilaukset-meno 15 euroa. Lisäksi yksi jakso, eri pituudet, väliin jäävä aukko, aiempi nollasumma, muuttumaton kulutus, tasatilanne ja tuonti väärässä aikajärjestyksessä.

## P0-08: Varmuuskopio ja esittelyn viimeistely

Valmistumisen ehdot:

- Varmuuskopio voidaan ladata tiedostona ja palauttaa vain tyhjään tietokantaan.
- Virheellinen kopio tai tallennusvirhe ei jätä osittaista historiaa. Palautuksen jälkeen tunnisteet, tapahtumat ja laskentatulokset ovat samat.
- Käyttöliittymä kertoo paikallisesta tallennuksesta, katoamisriskistä ja varmuuskopion salaamattomuudesta.
- Automaattiset testit, tyyppitarkistus ja julkaisutiedostojen kokoaminen onnistuvat. README sisältää lyhyen esittelyohjeen ja tiedossa olevat rajoitukset.

Kirjattava käyttötesti oikeassa työpöytäselaimessa:

1. Avaa tyhjä sovellus, tuo ensimmäinen jakso ja tarkista yhteenveto.
2. Tuo toinen jakso ja tarkista vertailu sekä havainnot.
3. Yritä virheellistä ja päällekkäistä tuontia; aiemmat tiedot säilyvät.
4. Avaa sivu uudelleen samassa selaimessa; historia säilyy.
5. Lataa varmuuskopio ja palauta se erillisessä tyhjässä selainprofiilissa. Tulokset täsmäävät.
6. Varmista, että palautus ei korvaa jo tallennettua historiaa.
7. Tarkista keskeiset toiminnot myös kapealla näkymällä.
8. Tarkista selaimen verkkopyynnöistä, ettei tuonti, analyysi tai varmuuskopio lähetä tapahtumatietoja verkkoon.

Kirjaa selaimen nimi ja versio sekä tulokset. Automaattinen selaintestaus ja muiden selainten testikierrokset eivät ole kurssiversion valmistumisehtoja.

## Toteutuksen tarkistukset

Tehtäväkohtaiset työmerkinnät lisätään tähän toteutuksen aikana: tehtävä, tehdyt muutokset, tarkistukset ja tulokset sekä mahdolliset puutteet. Tässä ei säilytetä keskusteluluonnoksia tai tulevien ominaisuuksien ideointia.

### P0-01 – sovelluksen runko

- Haara: `menomittari/p0-01-runko`
- Työtila: Valmis
- Lähtöcommit: `9e38ee7d1983f065713e5c304b8ad9c2d211ae7f`
- Muutos: React–TypeScript–Vite-runko, Windowsin Docker-liitoksessa toimiva polling/HMR-kehitysympäristö, lukitut pnpm-riippuvuudet, Menomittarin aloitusnäkymä, yksi Vitest-testi, maltillinen englanninkielinen koodikommentointi sekä asennus- ja tarkistusohjeet.
- Tarkistukset 23.9.2026 Docker-kontissa: `docker compose build --pull` onnistui; `pnpm test` 1/1 läpäisi; `pnpm typecheck` onnistui; `pnpm lint` 0 varoitusta ja 0 virhettä; `pnpm build` onnistui; kehityspalvelin vastasi `HTTP 200` osoitteessa `http://127.0.0.1:5173` ja palautti Menomittari-otsikon; tilapäinen `App.tsx`-otsikkomuutos ja sen palautus tuottivat molemmat Viten `hmr update /src/App.tsx` -lokimerkinnän polling-seurannalla.
- Ajamattomat testit: ei erillistä visuaalista selaintarkistusta; sitä ei vaadita P0-01:n hyväksymisehdoissa.
- Puutteet: ei tunnettuja P0-01:n puutteita. Commit `f1a007a` on käyttäjän hyväksymänä yhdistetty `main`-haaraan ja näkyy `origin/main`-viitteessä.

### P0-02 – backendin perusta

- Haara: `menomittari/p0-02-backend`
- Työtila: Tarkistettavana
- Lähtöcommit: `f1a007a8dbabe024d670b1eac0e240a9682e1a20`
- Muutos: Dockerissa toimiva FastAPI-backend, `uv`-lukitus, SQLAlchemy-yhteys SQLiteen, Alembic-migraatiopohja, rajattu CORS-asetus, tietokannan tarkistava `GET /api/health`, kaksi backend-testiä sekä P0-02-oppituntimateriaali ja päivitetyt käyttöohjeet.
- Tarkistukset 23.9.2026 Docker-konteissa: koko Compose-ympäristön rakennus onnistui; Alembic päivitti tyhjän väliaikaisen SQLite-kannan revisioon `0001`; Pytest 2/2 läpäisi varoitukset virheinä; samanaikaisesti käynnistetyt frontend ja backend vastasivat `HTTP 200`; health-vastaus oli `{"status":"ok"}` ja sallittu CORS-alkuperä täsmälleen `http://127.0.0.1:5173`. Frontendin Vitest 1/1, tyyppitarkistus, linttaus ilman varoituksia ja tuotantokooste läpäisivät.
- Ajamattomat testit: ei selaimessa tehtyä visuaalista tarkistusta; P0-02 ei muuta käyttöliittymää.
- Puutteet: käyttäjän tarkistus ja hyväksyntä puuttuvat. Käyttäjä- ja istuntotaulut sekä kirjautumisreitit kuuluvat P0-03:een.
