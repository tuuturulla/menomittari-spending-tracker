# P0-05: CSV-tuonti ja tapahtumien luokittelu

## Mitä tässä työvaiheessa valmistui?

P0-05 yhdistää käyttäjän valitseman CSV-tiedoston P0-04:ssä rakennettuun paikalliseen tietokantaan. Käyttäjä valitsee tiedoston, ilmoittaa sen ajanjakson ja käynnistää tuonnin. Sovellus lukee, tarkistaa ja luokittelee koko aineiston ennen ensimmäistäkään tietokantakirjoitusta.

```text
Käyttäjän valitsema tiedosto
        ↓
koon tarkistus ennen lukemista
        ↓
tiukka UTF-8-purku
        ↓
Papa Parse muodostaa CSV-tietueet
        ↓
otsikko valitsee tiedostomuodon sovittimen
        ↓
kentät, päivät, summat ja rajat tarkistetaan
        ↓
kauppias luokitellaan
        ↓
UUID-tunnisteet muodostetaan paikallisesti
        ↓
koko aineisto tallennetaan yhdellä IndexedDB-transaktiolla
```

Talousaineisto ei kulje FastAPI-backendin kautta. Backendiltä saatu käyttäjän UUID valitsee oikean selainkannan, mutta itse tiedosto luetaan ja tallennetaan frontendissä.

## Toteutuksen osat

| Tiedosto | Vastuu |
| --- | --- |
| [categorization.ts](../frontend/src/domain/categorization.ts) | Normalisoi kauppiasnimen ja antaa kiinteän kategorian |
| [transactions.ts](../frontend/src/domain/transactions.ts) | Määrittelee sallitut tapahtumatyypit ja kategoriakoodit |
| [csv-import.ts domainissa](../frontend/src/domain/csv-import.ts) | Parsii CSV:n ja tarkistaa sen sisältösäännöt |
| [import-csv.ts application-kerroksessa](../frontend/src/application/import-csv.ts) | Lukee tiedoston, muodostaa UUID:t ja kutsuu storagea |
| [repository.ts](../frontend/src/storage/repository.ts) | Tarkistaa päällekkäisyydet ja tallentaa aineiston atomisesti |
| [App.tsx](../frontend/src/App.tsx) | Näyttää tiedostonvalinnan, päivämääräkentät ja palautteen |
| [demo-2026-04.csv](../frontend/tests/fixtures/demo-2026-04.csv) | Ensimmäinen täysin fiktiivinen esittelyjakso |
| [demo-2026-05.csv](../frontend/tests/fixtures/demo-2026-05.csv) | Toinen täysin fiktiivinen esittelyjakso |
| [s-pankki-demo-2026-06.csv](../frontend/tests/fixtures/s-pankki-demo-2026-06.csv) | Fiktiivinen S-Pankin kenttärakennetta jäljittelevä testiaineisto |
| [fixtures/.gitignore](../frontend/tests/fixtures/.gitignore) | Estää sovitulla nimellä tallennetun paikallisen pankkiaineiston lisäämisen Gitiin |

Kerrokset muodostavat tarkoituksellisen ketjun:

```text
React UI → application → domain
                     ↘ storage → IndexedDB
```

Domain-koodi ei tunne Reactia, Dexietä tai selainkantaa. Siksi CSV-sääntöjä ja luokittelua voidaan testata tavallisilla merkkijonoilla.

## Mitä S-Pankki-tuki tarkoittaa?

Pankin CSV:ssä ei ole erillistä kenttää, jossa lukisi `S-Pankki`. Rakenne tunnetaan S-Pankin muodoksi tiedoston alkuperän ja koko otsikkorivin perusteella. Koodi vertaa kaikkia 11 otsikkoa oikeassa järjestyksessä `S_PANKKI_HEADER`-vakioon. Se ei etsi vain muutamaa samankaltaista sanaa eikä pysty todistamaan, mikä pankki tiedoston loi.

Kun otsikko täsmää, sovitin muuntaa pankin kentät Menomittarin sisäiseen muotoon:

```text
Kirjauspäivä  → date
Summa         → amount_cents
Saajan nimi / Maksaja / Viesti / Tapahtumalaji → description
summan etumerkki → kind (negatiivinen expense, positiivinen income)
```

Maksupäivää, tilinumeroa, BIC-tunnusta, viitettä ja arkistointitunnusta ei tallenneta. Näin sovellus säilyttää vain nykyisiin laskelmiin tarvittavat tiedot.

Sama toimintamalli voidaan myöhemmin laajentaa muille pankeille. Jos niiden otsikot tai kenttien merkitykset eroavat, niille lisätään oma tunnistus ja muunnos. Kaikki sovittimet palauttavat saman `ValidatedCsvTransaction`-rakenteen, joten tallennuksen ja analyysin ei tarvitse muuttua pankin mukaan.

## Mikä CSV on?

CSV on tekstitiedosto, jossa yksi tietue muodostuu sovituista kentistä. Menomittarin oma demomuoto käyttää puolipistettä ja sen otsikon pitää olla täsmälleen:

```csv
date;description;amount;kind
```

Esimerkkitietue:

```csv
2026-04-03;Demo Market;-30.00;expense
```

Kentät tarkoittavat:

| Kenttä | Esimerkki | Merkitys |
| --- | --- | --- |
| `date` | `2026-04-03` | Tapahtuman kalenteripäivä |
| `description` | `Demo Market` | Kauppiaan tai tapahtuman kuvaus |
| `amount` | `-30.00` | Summa euroina, aina kaksi desimaalia |
| `kind` | `expense` | Tapahtuman sovittu tyyppi |

CSV:tä ei pilkota itse `split(';')`-kutsulla. Sellainen rikkoisi lainatun kentän, joka saa sisältää puolipisteen tai rivinvaihdon:

```csv
2026-04-03;"Kuvaus; jossa on puolipiste";-7.25;expense
```

[Papa Parse](../frontend/package.json) ymmärtää lainausmerkit ja palauttaa loogiset tietueet. Tämän vuoksi lainatun kuvauksen sisäinen rivinvaihto ei muutu uudeksi tapahtumaksi.

## Miksi tiedosto luetaan ensin tavuina?

[Application-palvelu](../frontend/src/application/import-csv.ts) tarkistaa ensin `file.size`-arvon. Yli 1 MiB:n tiedostoa ei lueta muistiin lainkaan.

Sallittu tiedosto luetaan `ArrayBuffer`-tavuiksi ja puretaan näin:

```typescript
new TextDecoder('utf-8', { fatal: true }).decode(bytes)
```

`fatal: true` tarkoittaa, että rikkinäinen UTF-8 ei muutu huomaamatta korvausmerkeiksi. Tuonti pysähtyy ja käyttäjä saa virheen. Valinnainen UTF-8 BOM poistetaan ennen CSV:n parsimista.

## Missä järjestyksessä aineisto tarkistetaan?

Tarkistusjärjestys on tarkoituksellinen:

1. tiedoston koko;
2. käyttäjän antama alku- ja loppupäivä;
3. UTF-8 ja CSV-rakenne;
4. täsmällinen otsikko;
5. tapahtumien lukumäärä;
6. jokaisen tietueen kentät;
7. tapahtumien kuuluminen annettuun ajanjaksoon;
8. päällekkäisyys aiemman tuonnin kanssa;
9. koko kannan 10 000 tapahtuman raja;
10. atominen tallennus.

Ensimmäiset tarkistukset tehdään ennen tallennuskerrosta. Päällekkäisyys ja kannan kokonaisraja tarkistetaan kirjoitustransaktion sisällä, jotta toinen selainvälilehti ei ehdi muuttaa tilannetta tarkistuksen ja tallennuksen välissä.

## Looginen tietuenumero

Otsikko on tietue 1 ja ensimmäinen tapahtuma tietue 2. Tyhjät tietueet ohitetaan, mutta ne säilyvät numeroinnissa. Lainatun kentän sisäinen rivinvaihto ei kasvata tietuenumeroa.

Numero tallennetaan `source_row`-kenttään. Sen avulla kaksi täysin samannäköistä ostosta säilyvät erillisinä:

```text
source_row 2 → Demo Market, -30.00
source_row 3 → Demo Market, -30.00
```

Sovellus ei päättele niiden olevan vahingossa duplikaatteja, koska ne voivat olla kaksi oikeaa ostosta.

## Miksi rahaa käsitellään kokonaisina sentteinä?

CSV:n summa tarkistetaan ensin merkkijonona. Menomittarin demomuodon sallittu arvo on esimerkiksi `-12.50` tai `+5.00`. S-Pankki-sovitin hyväksyy vastaavan suomalaisen desimaalipilkun ja pankin käyttämän etumerkin, esimerkiksi `-12,50` tai `+2000,00`. Tuhaterottimet ja puuttuva desimaali hylätään.

Summaa ei lasketa näin:

```typescript
parseFloat(amount) * 100
```

Binäärinen liukuluku ei pysty esittämään kaikkia desimaalilukuja täsmällisesti. Toteutus erottaa euro- ja senttiosan merkkijonosta ja muodostaa kokonaisluvun:

```text
"-12.50" → -(12 × 100 + 50) → -1250 senttiä
```

Lopuksi tarkistetaan, että tulos on turvallinen kokonaisluku, ei nolla ja itseisarvoltaan enintään 100 000 000 senttiä eli 1 000 000 euroa.

## Miten tapahtuman tyyppi vaikuttaa etumerkkiin?

Sallitut tyypit määritellään [transactions.ts-tiedostossa](../frontend/src/domain/transactions.ts):

- `expense`: summan pitää olla negatiivinen;
- `income`: summan pitää olla positiivinen;
- `refund`: summan pitää olla positiivinen;
- `transfer`: kumpikin etumerkki on sallittu.

Etumerkki ei yksin kerro tapahtuman todellista tyyppiä. Esimerkiksi positiivinen summa voi olla palkka, palautus tai siirto omalta tililtä. Menomittarin demomuodossa `kind` tulee CSV-tiedostosta. S-Pankin muodossa vastaavaa kenttää ei ole, joten MVP tulkitsee negatiivisen summan menoksi ja positiivisen tuloksi. Palautusten ja omien tilisiirtojen korjaaminen vaatii myöhemmin erillisen tarkistusvaiheen tai tarkemmat, testatut säännöt.

## Miten kauppias luokitellaan?

[categorization.ts](../frontend/src/domain/categorization.ts) tekee ennen vertailua kolme normalisointia:

1. poistaa kuvauksen reunavälit;
2. yhdistää peräkkäiset välilyönnit;
3. ohittaa kirjainkoon.

Tämän jälkeen koko nimen pitää täsmätä:

```text
"  DEMO   MARKET  " → "demo market" → groceries
"Demo Marketplace" → ei täsmää → unknown
```

Kiinteät säännöt ovat:

| Kauppias | Kategoria |
| --- | --- |
| Demo Market | `groceries` |
| Demo Cafe | `dining` |
| Demo Bus | `transport` |
| Demo Stream | `subscriptions` |

Menot ja palautukset luokitellaan. Tulot ja tilisiirrot saavat aina kategorian `unknown`. Luokitus tallennetaan tapahtuman mukana, joten myöhempi sääntömuutos ei muuta vanhaa historiaa huomaamatta.

## Miksi UUID:t luodaan vasta validoinnin jälkeen?

CSV-domain palauttaa tarkistettuja tapahtumarivejä ilman tietokantatunnisteita. [Application-palvelu](../frontend/src/application/import-csv.ts) luo selaimen `crypto.randomUUID()`-toiminnolla yhden tunnisteen tuonnille ja oman tunnisteen jokaiselle tapahtumalle vasta, kun koko CSV on kelvollinen.

Näin domain pysyy riippumattomana selain-API:sta ja virheellinen tiedosto ei etene tallennusolioiden rakentamiseen.

## Miksi tallennus ei jää puolikkaaksi?

Application-palvelu kutsuu P0-04:n toimintoa vain kerran:

```typescript
await storage.saveImportWithTransactions(importRecord, transactions)
```

Repository lisää `imports`-tietueen ja kaikki `transactions`-tietueet samaan Dexie-transaktioon. Jos yksikin vaihe epäonnistuu, IndexedDB peruu koko kirjoituksen. Aiemmin tallennettu historia säilyy.

## Miten virhe palautuu käyttöliittymälle?

`importCsv` ei palauta odotetusta käyttäjävirheestä poikkeusta vaan `Result`-olion:

```typescript
{ ok: true, data: importedCsv }

// tai

{
  ok: false,
  error: {
    code: 'invalid_csv',
    message: 'Summan pitää olla esimerkiksi -12.50 tai +5.00.',
    row: 2,
    field: 'amount'
  }
}
```

Käyttöliittymä voi näyttää turvallisen suomenkielisen viestin ja tietuenumeron ilman raakaa tapahtumariviä tai teknistä pinotulostetta.

## Kokeile toimintoa selaimessa

1. Käynnistä sovellus ja kirjaudu sisään.
2. Valitse [huhtikuun demotiedosto](../frontend/tests/fixtures/demo-2026-04.csv).
3. Anna ajanjaksoksi `2026-04-01–2026-04-30`.
4. Paina **Tuo tapahtumat**. Sovelluksen pitäisi ilmoittaa seitsemästä tallennetusta tapahtumasta.
5. Avaa selaimen kehittäjätyökaluista `Application → IndexedDB → menomittari-<UUID>`.
6. `imports`-object storessa pitäisi olla yksi tuonti ja `transactions`-object storessa seitsemän tapahtumaa.
7. Yritä samaa tuontia uudelleen. Sovelluksen pitää hylätä päällekkäinen jakso eikä tapahtumamäärä saa kasvaa.
8. Valitse [toukokuun demotiedosto](../frontend/tests/fixtures/demo-2026-05.csv) ja ajanjakso `2026-05-01–2026-05-30`. Sen pitää tallentua uutena jaksona.
9. Tyhjennä testiprofiilin kanta tai käytä eri käyttäjää, valitse [fiktiivinen S-Pankki-tiedosto](../frontend/tests/fixtures/s-pankki-demo-2026-06.csv) ja anna ajanjaksoksi `2026-06-01–2026-06-30`. Kolmen tapahtuman pitäisi tallentua.

P0-06 lisää tallennettujen jaksojen ja tapahtumien varsinaisen näkymän. P0-05 näyttää vasta tuonnin onnistumisen tai virheen.

## Mitä testit osoittavat?

[Domain-testit](../frontend/src/domain/csv-import.test.ts) tarkistavat muun muassa:

- molemmat demoaineistot ja niiden odotetut menosummat;
- S-Pankin koko otsikon tunnistamisen sekä päivien, desimaalipilkun, kuvausten ja etumerkkien muunnoksen;
- lainatut kentät, puolipisteet, rivinvaihdot, ääkköset ja BOM:n;
- tyhjät ja rakenteeltaan virheelliset tiedostot;
- virheelliset summat, päivät ja ajanjaksot;
- 5 000 tapahtuman tuontirajan;
- identtisten ostosten säilymisen erillisinä;
- kiinteät kategoriat ja `unknown`-tapaukset.

[Application-testit](../frontend/src/application/import-csv.test.ts) tarkistavat tiedostokoon ennen lukemista, virheellisen UTF-8:n, UUID:iden muodostamisen, yhden tallennuskutsun sekä virheiden palauttamisen. [Repository-testi](../frontend/src/storage/repository.test.ts) varmistaa lisäksi, että osittain päällekkäinen jakso hylätään ja vanha tuonti säilyy.
