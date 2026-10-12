# Kurssityön työlista

Tämä lista kuvaa [projektisuunnitelman](project-plan.md) toteutuksen. P0-01–P0-08 muodostavat toiminnallisen MVP:n; P0-09 viimeistelee sen sovitun esitystavan. Tehtävä on valmis vasta, kun sen toiminta on tarkistettu ja työn tekijä on hyväksynyt sen.

## Eteneminen

| ID | Tehtävä | Edellyttää | Arvio | Tila |
| --- | --- | --- | --- | --- |
| P0-01 | Sovelluksen runko | Ei aiempia tehtäviä | 2 h | Valmis |
| P0-02 | Backendin perusta | P0-01 | 3 h | Valmis |
| P0-03 | Käyttäjätilit ja istunnot | P0-02 | 4–5 h | Valmis |
| P0-04 | Paikallinen tallennus | P0-03 | 3 h | Valmis |
| P0-05 | Tiedoston tuonti ja luokittelu | P0-04 | 3–4 h | Valmis |
| P0-06 | Tapahtumat ja yhteenveto | P0-05 | 3–4 h | Valmis |
| P0-07 | Vertailu ja havainnot | P0-06 | 2–3 h | Valmis |
| P0-08 | Varmuuskopio ja esittelyn viimeistely | P0-07 | 3–4 h | Valmis |
| P0-09 | Käyttöliittymän viimeistely ja yhteiset tarkistukset | P0-08 | Ei arvioitu | Tarkistettavana |

Tilat: Ei aloitettu, Työn alla, Estynyt, Tarkistettavana, Valmis.

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

- Mukana on kaksi Menomittarin demoaineistoa ja kaksi täysin fiktiivistä S-Pankin kenttärakennetta vastaavaa CSV-aineistoa, kokonainen ja puolikas kuukausi, [aineistokuvauksen](data-contract.md) säännöillä.
- Tiedoston valinta, kokonaisen kuukauden valinta tai oman ajanjakson syöttö sekä tuontinappi toimivat yksinkertaisessa näkymässä. Kuukausivalinta näyttää oikeat alku- ja loppupäivät ennen tuontia.
- Muoto, päivät, summat ja kokorajat tarkistetaan. Virheellinen aineisto ei tallennu osittain.
- Sama tai päällekkäinen jakso hylätään ja virheviesti nimeää valitun sekä yhden päällekkäisen tallennetun jakson. Tiedoston sisäiset samannäköiset ostokset säilyvät erillisinä.
- Tuonnin tulos näkyy heti tuontipainikkeen alla erottuvassa, kohdistettavassa ilmoituksessa, ei tapahtumahistorian tai uloskirjautumisen alapuolella.
- Kiinteät kauppiassäännöt antavat oikean ryhmän; tuntematon nimi jää tunnistamattomaksi.

Tarkistus: molemmat demot, lainatut kentät, ääkköset, tyhjä tai virheellinen tiedosto, väärä summa/päivä, ylitetyt rajat ja päällekkäinen jakso.

## P0-06: Tapahtumat ja yhteenveto

Valmistumisen ehdot:

- Käyttäjä voi valita tallennetun jakson ja selata sen tapahtumia 50 rivin sivuina.
- Näkyvissä ovat menot yhteensä, menoryhmät ja palautukset erikseen. Tulot ja tilisiirrot eivät kasvata menoja.
- Valittu ajanjakso, tyhjä tila ja virheilmoitukset ovat selkeitä. Tapahtumien kuvaukset näytetään tekstinä, ei suoritettavana sivukoodina.
- Tapahtumat ja yhteenveto toimivat leveässä ja 390 pikselin levyisessä näkymässä. P0-09 viimeistelee osiojaon ja vertailun pylväsesityksen.

Tarkistus: demojen 90 ja 145 euron menot sekä kummankin 5 euron palautukset. Lisäksi tuntematon menoryhmä, pelkkiä tuloja sisältävä jakso ja jakson vaihtaminen.

## P0-07: Vertailu ja havainnot

Valmistumisen ehdot:

- Yhden kuukauden sisäistä valittua jaksoa verrataan edelliskuukauden samoihin päivämääriin, kokonaisia kuukausia kokonaisiin kuukausiin niiden pituuseroista huolimatta.
- Vertailuväli vaatii yhden sen kokonaan kattavan tallennetun tuonnin. Laskenta käyttää vain vertailuvälin tapahtumia ja näkymä näyttää todelliset laskentavälit.
- Puuttuva kattavuus tai edelliskuukaudesta puuttuva osajakson päivämäärä estää vertailun ja syy näytetään. Usean kuukauden yli ulottuvat omat jaksot käyttävät edelleen lähintä aiempaa, yhtä pitkää ja peräkkäistä tuontia.
- Enintään kolme havaintoa noudattaa aineistokuvauksen laskentasääntöjä ja näyttää vertailujaksot.
- Neljä pientä demo-CSV:tä kattavat rajapäivät, samannäköiset erilliset ostokset, plusmerkkisen tulon, tunnistamattoman menon ja osajakson ulkopuolelle jäävät menot. Ne voidaan tuoda peräkkäin samalle demokäyttäjälle ilman päällekkäisyyttä.

Tarkistus: +55 euroa / +61,11 %, Ruokakauppa +30 euroa / +50 % ja uusi Tilaukset-meno 15 euroa. Neljän demon tuontiketju tuottaa 33 tapahtumaa; heinäkuun 1.–15. päivän 57,50 euroa vertautuu kesäkuun samojen päivien 95 euroon, ei koko kesäkuun 125 euroon. Lisäksi yhden tuonnin tila, kokonaiset eri pituiset kuukaudet, osajakson rajapäiväsuodatus, puuttuva kattavuus, helmikuu ja karkausvuosi, vuodenvaihde, usean kuukauden jaksojen pituus/aukko, aiempi nollasumma, muuttumaton kulutus, tasatilanne, tuonti väärässä aikajärjestyksessä sekä historian säilyminen uudelleenavauksessa ja päällekkäisen tuonnin hylkäyksessä.

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

Käyttötestin tulokset ja erillisen selainprofiilin palautuskokeilu: [P0-08-käyttötesti](p0-08-kayttotesti.md).

## P0-09: Käyttöliittymän viimeistely ja yhteiset tarkistukset

Valmistumisen ehdot:

- Kirjautuminen on oma näkymänsä; kirjautuneen käyttäjän osiot ovat Yhteenveto, Tapahtumat, Tuo CSV ja Varmuuskopio. Jakson valinta säilyy yhteenvedon ja tapahtumien välillä.
- Menot ja muutos ovat helposti silmäiltäviä. Menoryhmien vertailussa aiempi ja nykyinen summa ovat yhteisellä pylväsasteikolla, ja muutos on erillisessä kohdassa. Kaikki viisi menoryhmää säilyvät.
- Otsikko on Keskeiset muutokset. Palautukset näytetään ennallaan; info kertoo, ettei niitä vähennetä menoista, myös näppäimistöllä ja napauttamalla.
- Havaintokortti kertoo suoraan muutoksen suunnan tai uuden menon sekä eurot ja tarvittaessa prosentin. Tarkat vertailuluvut ja tulkinta ovat sirossa infopisteessä. Yleinen vertailuhuomautus on infossa; osajakso nimetään lyhyesti myös näkyvässä tekstissä.
- Nollapalautuksia ei näytetä. Muutoskortin prosentti on oma sanallinen tietonsa; vertailusumman yhteydessä näkyvät todelliset vertailupäivät. Kirjautumissivun nimi ja maskotti ovat työtilaa suurempia.
- Mittarimato on hillitty paikallinen brändikuva. Vihreä ja kultainen korostus eivät arvioi käyttäjän rahankäytön hyvyyttä tai huonoutta.
- Käyttöliittymä toimii leveänä ja 390 pikselin levyisenä, näppäimistöllä, tyhjällä historialla ja vertailun estyessä. Tuonnin ja palautuksen palaute näkyy oman toiminnon vieressä.
- Yksi dokumentoitu Bash-komento ajaa tarkistukset Dockerissa, pysähtyy virheeseen eikä muuta käyttäjän historiaa tai backend-kantaa.
- Laskentasäännöt, tietomalli ja backendin vastuu eivät muutu. Mukana ovat regressiotestit ja työseloste.
