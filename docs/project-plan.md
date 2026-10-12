# Projektisuunnitelma

## Tavoite

Menomittarin pidemmän aikavälin tavoite on auttaa vastaamaan kysymykseen: mihin rahat menevät ja mikä omassa kulutuksessa muuttui? Keskeinen tavoite on tunnistaa säännöllisiä arjen kuluja ja tilauksia sekä tehdä niiden kertynyt kustannus näkyväksi esimerkiksi vuoden ajalta. Sovellus ei päätä käyttäjän puolesta, mikä ostos oli tarpeeton.

Kurssityön MVP on tästä rajattu, yksinkertainen sääntöpohjainen prototyyppi: se osoittaa ketjun **ryhmittele menot → vertaa kahta ajanjaksoa → näytä laskettuun muutokseen perustuva huomio**. Se ei vielä tunnista säännöllisiä kuluja eikä tarjoa vuoden rahankäytön yleiskuvaa. Nämä keskeiset tuotetavoitteet jäävät siis vielä osoittamatta, vaikka tuonnin, tallennuksen ja vertailulaskennan toimivuus voidaan näyttää.

Oppimistavoitteet ovat selainsovelluksen rakentaminen, paikallisen ja palvelinpuolisen tiedon tallentaminen, HTTP-rajapinnan toteuttaminen sekä laskennan ja eri sovelluskerrosten testaaminen.

## Kurssityöhön kuuluu

- Yksi looginen eurotili sekä Menomittarin demo-CSV:n ja tunnetun S-Pankki-CSV-rakenteen tuonti.
- Tapahtumien tuonti, tallennettu historia ja tapahtumalista.
- Menojen ryhmittely neljällä esimerkkikauppiaan säännöllä; muut jäävät tunnistamattomiksi.
- Menojen yhteissumma ja ryhmäkohtaiset summat. Palautukset näytetään erikseen.
- Kuukausivalinta tai oma tuontijakso. Kuukauden sisäistä jaksoa verrataan edelliskuukauden vastaavaan väliin; kokonaisia kuukausia voidaan verrata eri pituuksista huolimatta. Enintään kolme muutoksesta kertovaa havaintoa.
- Varmuuskopion lataaminen ja palauttaminen tyhjään sovellukseen.
- Käyttäjätilin luominen, kirjautuminen ja uloskirjautuminen.
- Yksi selainsovellus: erillinen kirjautumisnäkymä ja kirjautuneen käyttäjän Yhteenveto-, Tapahtumat-, Tuo CSV- ja Varmuuskopio-osiot. Näkymä mukautuu myös puhelimen leveyteen.

Käyttö esitetään pienillä, keksityillä aineistoilla yhdessä työpöytäselaimessa. Historiaa voi tallentaa useammalta jaksolta. Vertailuvälin on sisällyttävä kokonaan yhteen aiempaan tuontiin; laskenta poimii siitä vain vertailuvälin tapahtumat. Usean kuukauden yli ulottuva oma jakso käyttää edelleen lähintä aiempaa, yhtä pitkää ja peräkkäistä tuontia. Tarkat tiedosto- ja laskentasäännöt ovat [aineistokuvauksessa](data-contract.md).

## MVP:n rajaukset

Tämä osio on MVP-rajausten ensisijainen lähde. Muut dokumentit voivat selittää toteutusta tarkemmin, mutta niiden ei pidä laajentaa MVP:tä ilman projektisuunnitelman tietoista päivittämistä.

| Alue | MVP:n päätös | MVP:n ulkopuolelle jää |
| --- | --- | --- |
| Käyttäjä ja pankkitilit | Yhdellä sovelluksen käyttäjällä on yksi looginen EUR-tili. Pankin vaihtuminen ei tarkoita käyttäjän vaihtamista. | Useat pankki- tai maksutilit, `account_id`, tilikohtainen suodatus ja tilien yhdistetty näkymä. |
| Tuontimuodot | Menomittarin oma demo-CSV sekä S-Pankin viennistä tunnettu 11 kentän CSV-rakenne. Muoto tunnistetaan koko otsikosta; se ei todista tiedoston pankkialkuperää. Testiaineistot ovat fiktiivisiä. | Muiden pankkien sovittimet, PDF-tiliotteet, XML, Open Banking -rajapinnat ja lupaus kattavasta oikeiden pankkiaineistojen tuesta. |
| Tuontijaksot | Käyttäjä valitsee kokonaisen kalenterikuukauden tai ilmoittaa oman jakson. Valinnan pitää vastata tiedoston koko kattavuutta, jota sovellus ei voi todistaa. Päällekkäinen tuonti estetään ja viesti nimeää valitun sekä jo tallennetun jakson. | Osajaksojen yhdistäminen kokonaiseksi kuukaudeksi, tuonnin korjaus tai korvaaminen, saman ajanjakson tuonti eri tileiltä ja tapahtumakohtainen duplikaattien tunnistus useiden lähteiden välillä. |
| Tapahtuman tyyppi | Demomuoto antaa tyypin suoraan. S-Pankki-rakenteessa negatiivinen summa tulkitaan menoksi ja positiivinen tuloksi. | Palautusten ja omien tilien välisten siirtojen varma tunnistus, käyttäjän tarkistus- ja korjausnäkymä sekä automaattinen täsmäytys. |
| Luokittelu | Neljä kiinteää fiktiivistä kauppiassääntöä; muut tapahtumat jäävät tunnistamattomiksi. | Käyttäjän omat säännöt, yhteisöllinen kauppiastietokanta ja koneoppimismalli. |
| Säännölliset kulut | Maksujen toistuvuutta ei tunnisteta. Tilaukset-ryhmä kertoo vain kauppiassäännön osumasta, ei todetusta tilauksesta tai säännöllisestä kulusta. | Toistuvien maksujen, tilausten ja säännöllisten arjen kulujen tunnistaminen sekä niiden kertyneen kustannuksen esittely. |
| Paikallinen talousdata | CSV, tapahtumat, kategoriat ja analyysi käsitellään ja säilytetään käyttäjäkohtaisessa IndexedDB-kannassa nykyisessä selaimessa. Varmuuskopio viedään paikallisena salaamattomana JSON-tiedostona. | Taloustietojen palvelin- tai pilvitallennus, salattu synkronointi ja automaattinen laitteiden välinen siirto. |
| Backend | FastAPI tallentaa vain käyttäjätilit ja palvelinpuoliset kirjautumisistunnot SQLiteen. | CSV:t, tapahtumat, summat, kuvaukset, kategoriat tai analyysit backendissä. |
| Analyysi | Yhden kuukauden sisäinen jakso vertautuu edelliskuukauden samoihin päivämääriin; kokonainen kuukausi koko edelliskuukauteen ilman normalisointia. Vertailu vaatii yhden koko vertailuvälin kattavan tuonnin. Puuttuvat päivät tai edelliskuukaudesta puuttuva osajakson päivämäärä estävät vertailun. Usean kuukauden yli ulottuvat omat jaksot käyttävät aiempaa peräkkäisten, yhtä pitkien tuontien sääntöä. Näytetään enintään kolme sääntöpohjaista havaintoa. | Edellisiin N päivään vertailu valinnaisena tilana, useiden tuontien kokoaminen vertailuväliksi, koko historian tai vuoden rahankäytön yleiskuva, normaalitason oppiminen pitkästä historiasta, käytösmuutosten tai hintojen syiden päättely, ennusteet ja henkilökohtaiset säästöehdotukset. |
| Visuaalinen ilme | P0-09 viimeistelee osionavigoinnin, nykyisen jakson menoyhteenvedon ja menoryhmien pylväsvertailun. Muutos näytetään summista erillään. Mittarimato ja hillitty kultainen korostus tukevat tunnistettavaa ilmettä. | Uudet analyysit, koko vuoden yleisnäkymä, talouden pisteytys, animaatiot ja kattava brändijärjestelmä. |
| Käyttöympäristö | Kurssiesittely yhdessä työpöytäselaimessa; näkymä mukautuu puhelimen leveyteen. | Julkinen tuotantokäyttö, erillinen mobiilisovellus, asennettava offline-sovellus, automaattinen välilehtien synkronointi ja kattava selain- tai laitetestaus. |

Rajausten laajentaminen edellyttää omaa suunnittelua ja testausta. Esimerkiksi usean tilin tuki muuttaa tietomallia ja päällekkäisyyssääntöä: sama ajanjakso olisi sallittu eri tileillä mutta ei saman tilin kahdessa tuonnissa. Omien tilien väliset siirrot pitäisi samalla tunnistaa, jotta ne eivät näy kokonaisuudessa sekä menona että tulona.

## Teknologiat ja rakenne

| Osa | Valinta ja tarkoitus |
| --- | --- |
| Käyttöliittymä | React ja TypeScript näyttävät tiedot ja käsittelevät käyttäjän valinnat. |
| Kehitystyökalut | Vite käynnistää kehitysympäristön ja kokoaa sovelluksen. |
| Paikallinen tallennus | IndexedDB säilyttää taloustiedot selaimessa. Dexie helpottaa sen käyttöä. |
| Backend | FastAPI toteuttaa käyttäjätilit, kirjautumisen ja palvelinpuoliset istunnot. Python-riippuvuuksia hallitaan `uv`:lla. |
| Palvelintietokanta | SQLAlchemy käyttää MVP:ssä SQLitea käyttäjien ja istuntojen tallentamiseen. Alembic hallitsee migraatiot. |
| Tunnistautuminen | Salasanat hajautetaan Argon2id-algoritmilla. Istuntotunniste välitetään `HttpOnly`-evästeessä ja sen hajautus säilytetään backendissä. |
| Tiedoston lukeminen | Papa Parse lukee CSV:n kentät, jotka sovellus tarkistaa ennen tallennusta. |
| Testaus | Vitest tarkistaa frontendin laskennan ja tallennuksen. Backend testataan Python-testeillä erillisessä testitietokannassa. Lisäksi tehdään kirjattu käyttötesti oikeassa selaimessa. |

Backend tallentaa vain käyttäjätilit ja kirjautumisistunnot. CSV-tiedostot, tapahtumat, summat, kuvaukset, kategoriat ja laskettu analyysi pysyvät selaimen IndexedDB:ssä eivätkä siirry backendille. Frontend jakautuu näkymään, käyttäjän toimintojen käsittelyyn, laskentaan ja paikalliseen tallennukseen. **Laskenta pidetään tietokantariippumattomana:** tallennustavan vaihtaminen ei saa vaatia laskentasääntöjen kirjoittamista uudelleen. Tarkempi [arkkitehtuurikuvaus](architecture.md) on toteuttajia varten.

## Työmäärä ja valmistuminen

Suunnitteluarvio on **25–32 tuntia**, noin 4–6 kuuden tunnin työpäivää, kun kehitysympäristö on käytettävissä. Tämä ei ole toteutukseen perustuva mittaus. Uusien työkalujen opettelu tai asennusongelmat voivat kasvattaa aikaa.

[Työlista](backlog.md) jakaa toiminnallisen MVP:n kahdeksaan kokonaisuuteen ja sovitun käyttöliittymäviimeistelyn P0-09:ään. Alkuperäinen työmääräarvio ei sisällä myöhemmin sovittua P0-09:ää. Tunnistautumisen turvallisuutta, tallennuksen oikeellisuutta, laskennan tarkistuksia tai palautuksen testausta ei jätetä huomaamatta pois.

Työ on esittelyvalmis, kun käyttäjä voi rekisteröityä ja kirjautua, kaksi aineistoa voidaan tuoda, vertailu antaa odotetut luvut, historia säilyy sivun uudelleenavauksessa ja varmuuskopio palautuu toisessa selaimen käyttöympäristössä. Käynnistys ja nämä tarkistukset on dokumentoitu.

## Jatkokehityksen perusta

Sama paikallinen tietokanta voi säilyä myöhemmässä tuotteessa. SQLAlchemy ja Alembic mahdollistavat käyttäjä- ja istuntotietokannan siirtämisen myöhemmin PostgreSQL:ään. Selkeät osarajat ja versionoitu varmuuskopio helpottavat kehittämistä, mutta eivät tee taloustietojen synkronoinnista automaattista.

Mahdollinen kaupallinen julkaisu tarvitsee erillisen turvallisuus- ja käytettävyysarvioinnin. Paikallinen käsittely vähentää palvelimelle päätyvää tietoa, mutta ei yksin takaa tietoturvaa. Maksullinen salattu synkronointi on mahdollinen jatkosuunta. 

Nykyisen toteutuksen suhde tuotetavoitteeseen ja esittelyn kannalta tärkeät puutteet on koottu [MVP-arvioon](mvp-arvio.md). Arvio ei lisää toteutustehtäviä ilman erillistä päätöstä.
