# Kurssityön työlista

Tämä lista kuvaa [projektisuunnitelman](project-plan.md) toteutuksen. Kaikki kahdeksan tehtävää kuuluvat ensimmäiseen versioon. Tehtävä on valmis vasta, kun sen toiminta on tarkistettu ja työn tekijä on hyväksynyt sen.

## Eteneminen

| ID | Tehtävä | Edellyttää | Arvio | Tila |
| --- | --- | --- | --- | --- |
| P0-01 | Sovelluksen runko | Ei aiempia tehtäviä | 2 h | Valmis |
| P0-02 | Backendin perusta | P0-01 | 3 h | Valmis |
| P0-03 | Käyttäjätilit ja istunnot | P0-02 | 4–5 h | Valmis |
| P0-04 | Paikallinen tallennus | P0-03 | 3 h | Valmis |
| P0-05 | Tiedoston tuonti ja luokittelu | P0-04 | 3–4 h | Tarkistettavana |
| P0-06 | Tapahtumat ja yhteenveto | P0-05 | 3–4 h | Tarkistettavana |
| P0-07 | Vertailu ja havainnot | P0-06 | 2–3 h | Ei aloitettu |
| P0-08 | Varmuuskopio ja esittelyn viimeistely | P0-07 | 3–4 h | Ei aloitettu |

Alkuperäinen toteutusarvio on 23–28 tuntia, lisäksi 2–4 tuntia yhteiseen läpikäyntiin ja korjauksiin. Ensimmäisen toimivan tiedostotuonnin jälkeen jäljellä olevien P0-06–P0-08-vaiheiden toteutusarvio on 8–11 tuntia, lisäksi 2–4 tuntia yhteiseen läpikäyntiin ja korjauksiin. Tilat: Ei aloitettu, Työn alla, Estynyt, Tarkistettavana, Valmis.

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

- Mukana on kaksi Menomittarin demoaineistoa ja yksi täysin fiktiivinen S-Pankin kenttärakennetta vastaava CSV-aineisto [aineistokuvauksen](data-contract.md) säännöillä.
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
