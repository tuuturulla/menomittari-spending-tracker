# P0-06: tapahtumat ja yhteenveto – työseloste ja oppituntimateriaali

## Tavoite ja lopputulos

P0-06 tekee P0-05:ssä tallennetusta aineistosta luettavan näkymän. Käyttäjä voi valita tuodun ajanjakson, nähdä sen kokonaismenot ja palautukset, tarkastella menoja ryhmittäin sekä selata tapahtumia 50 rivin sivuina.

```text
IndexedDB:n imports ja transactions
               ↓
application-palvelu lukee valitun jakson
               ↓
domain laskee yhteenvedon koko jaksosta
               ↓
application erottaa näkyvän 50 rivin sivun
               ↓
React näyttää yhteenvedon ja tapahtumat
```

P0-06 ei vielä vertaa kahta ajanjaksoa eikä muodosta havaintoja. Ne kuuluvat P0-07:ään.

## Toteutuksen tärkeimmät tiedostot

| Tiedosto | Vastuu |
| --- | --- |
| [transactions.ts](../frontend/src/domain/transactions.ts) | Tapahtumatyyppien, kategoriakoodien ja suomenkielisten kategorianimien yhteinen määrittely |
| [summary.ts](../frontend/src/domain/summary.ts) | Puhdas menojen, palautusten ja kategoriakohtaisten summien laskenta |
| [transaction-history.ts](../frontend/src/application/transaction-history.ts) | Tuontien luku, sivutus, yhteenvetolaskennan kutsuminen ja turvallinen virhemuoto |
| [TransactionHistory.tsx](../frontend/src/components/TransactionHistory.tsx) | Jakson valinta, lataus- ja virhetilat, yhteenveto, tapahtumalista ja sivunvaihto |
| [App.tsx](../frontend/src/App.tsx) | Liittää historian kirjautuneen käyttäjän avoimeen paikalliseen tietokantaan ja päivittää sen tuonnin jälkeen |
| [App.css](../frontend/src/App.css) | Leveän ja 390 pikselin levyisen näkymän asettelu |

## Miksi laskenta on erillään Reactista?

[calculateSummary](../frontend/src/domain/summary.ts) on puhdas funktio. Se saa parametrina jakson ja tapahtumat ja palauttaa uuden yhteenveto-olion. Se ei lue tietokantaa, muuta React-tilaa eikä käytä selain-API:a.

Python-vertauksena se vastaa funktiota, joka saa listan sanakirjoja ja palauttaa uuden sanakirjan:

```python
def calculate_summary(period, transactions):
    # Laske ja palauta tulos muuttamatta syötettä.
    return summary
```

Erottelu helpottaa testaamista. Samalla laskennalla voidaan myöhemmin palvella käyttöliittymää, vertailua ja varmuuskopion tarkistusta ilman, että sääntöjä kopioidaan React-komponenttiin.

## Mitkä tapahtumat kuuluvat menoihin?

Laskenta käy tapahtumat läpi kerran:

- `expense`: negatiivisen summan vastaluku lisätään kokonaismenoihin ja tapahtuman menoryhmään;
- `refund`: positiivinen summa lisätään erilliseen palautussummaan;
- `income`: ei kasvata menoja;
- `transfer`: ei kasvata menoja.

Tallennettu meno on esimerkiksi `-3000` senttiä, mutta käyttäjälle näytettävä menojen määrä on positiivinen `3000` senttiä eli `30,00 €`. Palautusta ei vähennetä menoista, koska aineistosopimus käskee näyttämään sen erikseen.

Kaikki viisi kategoriaa ovat yhteenvedossa mukana myös nollasummaisina. Ne järjestetään ensin menosumman mukaan laskevasti ja tasatilanteessa kategoriakoodin mukaan. Myös `unknown` eli **Tunnistamattomat** on oikea menoryhmä, ei virhe.

## Miksi yhteenveto ja sivutus käyttävät eri määriä tapahtumia?

Yhteenveto kuvaa koko valittua ajanjaksoa. Sivutus puolestaan rajaa vain sen, kuinka monta tapahtumariviä näytetään kerralla.

Jos jaksossa on 123 tapahtumaa:

```text
yhteenveto: kaikki 123 tapahtumaa

sivu 1: offset 0,   limit 50 → rivit 1–50
sivu 2: offset 50,  limit 50 → rivit 51–100
sivu 3: offset 100, limit 50 → rivit 101–123
```

`offset` kertoo, monenko tapahtuman yli hypätään. `limit` kertoo sivun enimmäiskoon. Application-palvelu hyväksyy offsetiksi vähintään nollan ja limitiksi 1–200, mutta käyttöliittymä käyttää aina 50:tä.

Koko jakso luetaan MVP:ssä kerralla, koska paikallisen historian yläraja on 10 000 tapahtumaa ja yhteenveto tarvitsee joka tapauksessa kaikki valitun jakson tapahtumat. Application-palvelu poistaa käyttöliittymämallista `source_row`-kentän, joka on tarkoitettu vain tuonnin jäljitettävyyteen.

## Miten jakson valinta toimii Reactissa?

[TransactionHistory](../frontend/src/components/TransactionHistory.tsx) säilyttää tilassa:

- valitun tuonnin tunnisteen;
- nykyisen sivun offsetin;
- tuontilistan lukutuloksen;
- valitun tapahtumanäkymän lukutuloksen.

Sivun avauksessa repository palauttaa jaksot uusimmasta vanhimpaan ja ensimmäinen jakso valitaan automaattisesti. Kun käyttäjä vaihtaa valintaa, offset palautuu nollaan eli uuden jakson ensimmäiselle sivulle.

Onnistunut CSV-tuonti kasvattaa App-komponentin `historyRevision`-lukua. Muutos käskee historiakomponenttia lukemaan tuontilistan uudelleen, joten sivua ei tarvitse päivittää käsin.

## Mikä on vanhentunut asynkroninen vastaus?

Käyttäjä voi vaihtaa jaksoa ennen kuin edellisen jakson IndexedDB-luku valmistuu:

```text
pyyntö A alkaa → käyttäjä valitsee jakson B → pyyntö B alkaa
       pyyntö B valmistuu → pyyntö A valmistuu myöhässä
```

Ilman suojausta myöhässä valmistunut A voisi korvata näytöllä oikean B:n. Komponentin effect-cleanup merkitsee vanhan pyynnön epäaktiiviseksi. Lisäksi tulos yhdistetään storageen, tuontitunnisteeseen ja offsetiin. Näkymä käyttää tulosta vain, jos kaikki vastaavat nykyistä valintaa.

Ajatus vastaa Python-ohjelman pyyntötunnistetta: tulos hyväksytään vain, jos se kuuluu edelleen viimeisimpään pyyntöön.

## Miksi kuvaus ei suorita HTML:ää tai JavaScriptiä?

Kuvaus sijoitetaan JSX:ssä tavalliseksi tekstisisällöksi:

```tsx
<span>{transaction.description}</span>
```

React muuntaa HTML:n erikoismerkit turvalliseen esitysmuotoon. Esimerkiksi CSV-kuvaus `<script>alert("demo")</script>` näkyy tekstinä eikä muutu script-elementiksi. Toteutus ei käytä `dangerouslySetInnerHTML`-ominaisuutta. Erillinen renderöintitesti varmistaa tämän.

## Miten 390 pikselin näkymä toimii?

Leveässä näkymässä tapahtumarivi käyttää neljää saraketta: päivä, kuvaus, tyyppi ja ryhmä sekä summa. Enintään 30 rem leveässä näkymässä CSS media query muuttaa rivin kaksisarakkeiseksi:

- päivä ja summa ovat ensimmäisellä rivillä;
- pitkä kuvaus saa oman täysleveän rivinsä;
- tyyppi ja ryhmä ovat seuraavalla rivillä;
- yhteenvetokortit muuttuvat kahdesta sarakkeesta yhdeksi;
- sivutuspainikkeet säilyvät rinnakkain ja täysleveinä.

Erillistä kaaviokirjastoa tai vaakasuunnassa vieritettävää taulukkoa ei tarvita.

## Mitä testit osoittavat?

[summary.test.ts](../frontend/src/domain/summary.test.ts) tarkistaa:

- demojen menot `90,00 €` ja `145,00 €`;
- molempien `5,00 €` palautukset;
- tulojen ja tilisiirtojen jäämisen menojen ulkopuolelle;
- tunnistamattoman menoryhmän;
- pelkkiä tuloja sisältävän jakson nollatuloksen.

[transaction-history.test.ts](../frontend/src/application/transaction-history.test.ts) tarkistaa 50 rivin sivun, seuraavan sivun, virheelliset sivutusparametrit, jakson vaihtamisen ja storage-virheen säilymisen.

[transaction-history.integration.test.ts](../frontend/src/application/transaction-history.integration.test.ts) tuo molemmat demot oikean import-palvelun kautta eristettyyn `fake-indexeddb`-kantaan ja lukee kummankin yhteenvedon takaisin.

[TransactionHistory.test.tsx](../frontend/src/components/TransactionHistory.test.tsx) varmistaa, että HTML:ää muistuttava kuvaus renderöityy tekstinä.

## Kokeile selaimessa

1. Käynnistä Docker-palvelut ja kirjaudu fiktiivisellä testikäyttäjällä.
2. Tuo [huhtikuun demo](../frontend/tests/fixtures/demo-2026-04.csv) ajalle `2026-04-01–2026-04-30`.
3. Tarkista menot `90,00 €`, palautukset `5,00 €` ja seitsemän tapahtumaa.
4. Tuo [toukokuun demo](../frontend/tests/fixtures/demo-2026-05.csv) ajalle `2026-05-01–2026-05-30`.
5. Uusimman jakson pitäisi valikoitua ja näyttää menot `145,00 €` sekä palautukset `5,00 €`.
6. Vaihda valikosta huhtikuuhun ja takaisin toukokuuhun. Yhteenvedon ja tapahtumien pitää vaihtua yhdessä.
7. Kavenna selaimen kehittäjätyökaluissa viewport 390 pikseliin ja varmista, ettei sisältö leikkaannu sivusuunnassa.

Älä käytä käyttötestissä oikeaa pankkiaineistoa. Projektin testit ja esittely perustuvat fiktiivisiin CSV-tiedostoihin.

## Mitä P0-06:ssa ei tehty?

Tässä vaiheessa ei toteutettu ajanjaksojen vertailua, muutoksen prosentteja, havaintoja, kaavioita, tapahtumien muokkausta, hakua tai usean pankkitilin mallia. Rajaus pitää käyttöliittymän ja laskennan tarkistettavana ennen P0-07:n vertailulogiikkaa.
