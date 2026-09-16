# Projektisuunnitelma

## Tavoite

Menomittari auttaa vastaamaan kysymykseen: mihin rahat menevät ja mikä omassa kulutuksessa muuttui? Kurssityön ensimmäinen toimiva versio osoittaa ketjun **tunnista menot → vertaa historiaan → näytä perusteltu huomio**. Havainto kertoo lasketun muutoksen, ei päätä käyttäjän puolesta, mikä ostos oli tarpeeton.

Oppimistavoitteet ovat selainsovelluksen rakentaminen, tiedon tallentaminen, laskennan testaaminen ja tekoälyavustajan käyttäminen rajatuissa kehitystehtävissä. Työn tekijä tarkistaa ja ymmärtää toteutuksen ennen sen hyväksymistä.

## Kurssityöhön kuuluu

- Yksi kuvitteellinen eurotili ja yksi sovittu CSV-tiedostomuoto.
- Tapahtumien tuonti, tallennettu historia ja tapahtumalista.
- Menojen ryhmittely neljällä esimerkkikauppiaan säännöllä; muut jäävät tunnistamattomiksi.
- Menojen yhteissumma ja ryhmäkohtaiset summat. Palautukset näytetään erikseen.
- Kahden peräkkäisen, yhtä pitkän ajanjakson vertailu ja enintään kolme muutoksesta kertovaa havaintoa.
- Varmuuskopion lataaminen ja palauttaminen tyhjään sovellukseen.
- Yksi selkeä sivu, joka mukautuu myös puhelimen levyiseen näkymään.

Käyttö esitetään kahdella pienellä, keksityllä aineistolla yhdessä työpöytäselaimessa. Historiaa voi tallentaa useammalta jaksolta, mutta vertailu käyttää aina vain valittua ja sitä lähinnä edeltävää jaksoa. Tarkat tiedosto- ja laskentasäännöt ovat [aineistokuvauksessa](data-contract.md).

## Kurssityön ulkopuolelle jää

Ei oikeiden pankkitiedostojen tukea, kirjautumista, pilvipalvelua, automaattista laitteiden välistä tiedonsiirtoa tai julkista käyttöönottoa. Ei muokattavia luokittelusääntöjä, kaavioita tai erillistä puhelinsovellusta.

Myöhemmäksi jäävät pidemmän historian normaalitason laskeminen, käytösmuutokset, toistuvat maksut, hinnankorotukset, kampanjamuistutukset ja säästöehdotukset. Myös ilman verkkoyhteyttä käynnistyminen, automaattinen välilehtien päivitys ja kattava puhelin- ja selaintestaus ovat jatkokehitystä.

## Teknologiat ja rakenne

| Osa | Valinta ja tarkoitus |
| --- | --- |
| Käyttöliittymä | React ja TypeScript näyttävät tiedot ja käsittelevät käyttäjän valinnat. |
| Kehitystyökalut | Vite käynnistää kehitysympäristön ja kokoaa sovelluksen. |
| Tallennus | IndexedDB on selaimen tietokanta. Dexie helpottaa sen käyttöä. |
| Tiedoston lukeminen | Papa Parse lukee CSV:n kentät, jotka sovellus tarkistaa ennen tallennusta. |
| Testaus | Vitest tarkistaa laskennan; fake-indexeddb mahdollistaa tallennustestit ilman selaimen avaamista. Lisäksi tehdään kirjattu käyttötesti oikeassa selaimessa. |

Erillistä sovelluspalvelinta tai palvelintietokantaa ei tarvita. Sovellus jakautuu neljään osaan: näkymä, käyttäjän toimintojen käsittely, laskenta ja tallennus. **Laskenta pidetään tietokantariippumattomana:** tallennustavan vaihtaminen ei saa vaatia laskentasääntöjen kirjoittamista uudelleen. Tarkempi [arkkitehtuurikuvaus](architecture.md) on toteuttajia varten.

## Työmäärä ja valmistuminen

Suunnitteluarvio on **18–24 tuntia**, noin 3–4 kuuden tunnin työpäivää, kun kehitysympäristö on käytettävissä ja toteutusta tehdään avustetusti. Tämä ei ole toteutukseen perustuva mittaus. Uusien työkalujen opettelu tai asennusongelmat voivat kasvattaa aikaa. 

[Työlista](backlog.md) jakaa työn kuuteen kokonaisuuteen. Arvio tarkistetaan heti ensimmäisen toimivan tiedostotuonnin jälkeen. Jos aikaa on vähemmän, esittelyn laajuudesta sovitaan erikseen. Tallennuksen oikeellisuutta, laskennan tarkistuksia tai palautuksen testausta ei jätetä huomaamatta pois.

Työ on esittelyvalmis, kun kaksi aineistoa voidaan tuoda, vertailu antaa odotetut luvut, historia säilyy sivun uudelleenavauksessa ja varmuuskopio palautuu toisessa selaimen käyttöympäristössä. Käynnistys ja nämä tarkistukset on dokumentoitu.

## Jatkokehityksen perusta

Sama paikallinen tietokanta voi säilyä myöhemmässä tuotteessa. Selkeät osarajat ja versionoitu varmuuskopio helpottavat kehittämistä, mutta eivät tee tietokannan vaihtamisesta tai synkronoinnista automaattista.

Mahdollinen kaupallinen julkaisu tarvitsee erillisen turvallisuus- ja käytettävyysarvioinnin. Paikallinen käsittely vähentää palvelimelle päätyvää tietoa, mutta ei yksin takaa tietoturvaa. Maksullinen salattu synkronointi on mahdollinen jatkosuunta. 
