# P0-04: paikallinen tallennus – työseloste ja oppituntimateriaali

## Tavoite ja lopputulos

Tässä vaiheessa Menomittariin lisättiin käyttäjäkohtainen paikallinen tietokanta taloushistoriaa varten. Tietokanta toimii selaimen IndexedDB:ssä ja sitä käsitellään Dexie-kirjastolla. Backend ei saa tapahtumia, summia, kuvauksia tai tuontijaksoja.

Vaiheen jälkeen sovellus osaa:

- avata kirjautuneelle käyttäjälle oman paikallisen tietokannan;
- tallentaa tuontijakson ja sen tapahtumat yhtenä kokonaisuutena;
- lukea tallennetut tuonnit ja tapahtumat sovitussa järjestyksessä;
- hylätä väärään tuontiin viittaavan tapahtuman;
- perua koko kirjoituksen, jos yksikin sen osa epäonnistuu;
- sulkea ja avata tietokannan uudelleen menettämättä historiaa.

CSV-tiedoston valinta ja lukeminen kuuluvat P0-05-vaiheeseen. P0-04 rakentaa niiden tarvitseman tallennusperustan.

## SQLite ja IndexedDB ovat eri tietokantoja

```text
Backendin SQLite
├─ users
└─ sessions

Kirjautuneen käyttäjän selain
└─ menomittari-<käyttäjän UUID> (IndexedDB)
   ├─ imports
   └─ transactions
```

SQLite vastaa käyttäjätilistä ja kirjautumisistunnosta. IndexedDB vastaa taloushistoriasta. Vaikka käyttäjä kirjautuu backendin avulla, hänen CSV-tapahtumansa eivät siirry backendille.

## Mikä IndexedDB on?

IndexedDB on selaimen sisäinen tietokanta. Se pystyy tallentamaan enemmän ja rakenteisempaa tietoa kuin `localStorage`. Toiminnot ovat asynkronisia, joten tietokannan avaaminen, lukeminen ja kirjoittaminen palauttavat Promise-arvon.

IndexedDB kuuluu aina tietylle selaimen originille. Kehityksessä Menomittarin origin on `http://127.0.0.1:5173`. Jos osoite, selain tai selainprofiili vaihtuu, käytettävissä on eri paikallinen tallennustila.

Selain voi poistaa tiedot, jos käyttäjä tyhjentää sivustotiedot. Siksi myöhempi P0-08 lisää varmuuskopion.

## Mikä Dexie on?

IndexedDB:n oma rajapinta on melko matalan tason tapahtuma- ja callback-rakenne. Dexie tarjoaa sen päälle TypeScript-ystävällisen API:n:

```typescript
await database.imports.add(importRecord)
await database.transactions.bulkAdd(transactions)
```

Dexie ei muuta sitä, missä tieto sijaitsee. Tieto on edelleen selaimen IndexedDB:ssä. Dexie helpottaa skeemaversioiden, indeksien, kyselyiden ja transaktioiden käyttöä.

Projektin riippuvuudet määritellään [package.jsonissa](../frontend/package.json). Testit käyttävät lisäksi `fake-indexeddb`-kirjastoa, joka jäljittelee IndexedDB:tä Node.js-testikontissa.

## Käyttäjäkohtainen tietokanta

Backend luo käyttäjän UUID-tunnisteen `uuid4`-funktiolla uuden käyttäjän tallennuksen yhteydessä [models.py-tiedostossa](../backend/app/db/models.py). Kirjautumisrajapinta palauttaa julkisten käyttäjätietojen mukana saman tunnisteen frontendille. [App.tsx](../frontend/src/App.tsx) avaa sen perusteella tietokannan:

```text
käyttäjä 1111… → menomittari-1111…
käyttäjä 2222… → menomittari-2222…
```

Nimi muodostetaan ja UUID tarkistetaan [database.ts-tiedostossa](../frontend/src/storage/database.ts). Kun käyttäjä kirjautuu ulos tai vaihtuu, tämän välilehden yhteys suljetaan. Tietokantaa ei poisteta, joten sama käyttäjä löytää historian palatessaan samalla selaimella.

Istuntotunnistetta ei tallenneta tähän kantaan. Selain säilyttää sen edelleen backendin asettamassa `HttpOnly`-evästeessä.

## Skeemaversio 1

Dexie-skeema määritellään [database.ts-tiedostossa](../frontend/src/storage/database.ts):

| Taulu | Pääavain ja indeksit | Tarkoitus |
| --- | --- | --- |
| `imports` | `id`, `period_end`, uniikki `[period_start+period_end]` | Yksi käyttäjän ilmoittama tuontijakso |
| `transactions` | `id`, uniikki `[import_id+source_row]`, hakuindeksi `[import_id+date+id]` | Tuontiin kuuluvat tapahtumat |

Compound-indeksi tarkoittaa usean kentän muodostamaa indeksiä. Esimerkiksi `[import_id+date+id]` järjestää ensin tuonnin, sen sisällä päivän ja tasatilanteessa tapahtumatunnisteen mukaan.

Uniikki `[period_start+period_end]` estää vain täsmälleen saman alku- ja loppupäivän yhdistelmän tallentamisen kahdesti. Esimerkiksi jo tallennetun jakson `2026-01-01–2026-01-20` rinnalla yhdistelmäindeksi yksin sallisi jakson `2026-01-02–2026-01-10`. Siksi [repository.ts](../frontend/src/storage/repository.ts) tekee lisäksi aikavertailun ja hylkää kaikki kokonaan tai osittain päällekkäiset jaksot.

Tietueiden TypeScript-muodot löytyvät [types.ts-tiedostosta](../frontend/src/storage/types.ts). `amount_cents` on kokonainen senttimäärä, koska liukuluvuilla tehtävä rahalaskenta voi aiheuttaa pyöristysvirheitä.

## Miksi storage tarkistaa tietueet uudelleen?

Myöhempi CSV-lukija tarkistaa aineiston ennen tallennusta, mutta tallennuskerros ei luota siihen sokeasti. [validation.ts](../frontend/src/storage/validation.ts) tarkistaa muun muassa:

- UUID-tunnisteet;
- ajanjakson päivämäärät ja UTC-luontiajan;
- tapahtuman `import_id`-viitteen;
- lähderivin ja tapahtumatunnisteen yksilöllisyyden;
- kuvauksen pituuden ja reunavälit;
- senttimäärän turvallisuuden, rajan ja etumerkin;
- tapahtumatyypin ja kategoriakoodin;
- tapahtuman kuulumisen tuontijaksoon;
- 1–5 000 tapahtuman tuontikohtaisen rajan.

Tämä on defense in depth -periaate: yhden kerroksen ohjelmointivirhe ei saisi päästää selvästi virheellistä tietoa pysyvään kantaan.

## Mitä atominen tallennus tarkoittaa?

Tuonti koskee kahta taulua. Ilman transaktiota voisi käydä näin:

```text
1. imports-rivi tallentuu
2. tapahtumien tallennus epäonnistuu
3. kantaan jää tyhjä ja rikkinäinen tuonti
```

[repository.ts](../frontend/src/storage/repository.ts) käyttää yhtä molemmat taulut kattavaa Dexie-transaktiota:

```text
tarkista päällekkäisyys
        ↓
tarkista 10 000 tapahtuman kokonaisraja
        ↓
lisää imports-rivi
        ↓
lisää kaikki transactions-rivit
        ↓
onnistu kokonaan TAI peru kaikki
```

Jos viimeinen vaihe epäonnistuu, IndexedDB palauttaa myös aiemman `imports`-lisäyksen ennalleen. Vanhaa historiaa ei poisteta tai korvata.

## Miten lukeminen toimii?

`listImports` palauttaa tuontijaksot uusimman `period_start`-päivän mukaan. `listTransactions` tarkistaa ensin, että pyydetty tuonti on olemassa, ja käyttää compound-indeksiä järjestykseen `import_id`, `date`, `id`.

Storage palauttaa tavallisia TypeScript-olioita. Dexien `Table`-olioita ei anneta Reactille tai tulevalle domain-laskennalle. Näin käyttöliittymä ja laskenta eivät riipu suoraan valitusta tietokantakirjastosta.

## Virheiden käsittely

Tallennuskerros käyttää [MenomittariStorageError-luokkaa](../frontend/src/storage/types.ts), jolla on koneellisesti tarkistettava koodi ja suomenkielinen viesti. Esimerkkejä:

| Koodi | Tilanne |
| --- | --- |
| `invalid_record` | Tietueen kenttä tai viite on virheellinen |
| `import_not_found` | Pyydettyä tuontia ei ole |
| `overlapping_period` | Jakso menee päällekkäin aiemman kanssa |
| `limit_exceeded` | 10 000 tapahtuman kokonaisraja ylittyisi |
| `storage_error` | IndexedDB:n avaaminen, lukeminen tai kirjoittaminen epäonnistui |

Sovellus näyttää tietokannan avausvirheen käyttäjälle. Se ei tyhjennä kantaa eikä vaihda hiljaisesti pelkkään muistissa säilyttämiseen.

## Testit ja mitä ne todistavat

[repository.test.ts](../frontend/src/storage/repository.test.ts) käyttää `fake-indexeddb`:tä. Testit tarkistavat:

1. tuonnin ja tapahtumien tallennuksen sekä lukemisen;
2. kahden käyttäjän tietokantojen erillisyyden;
3. väärän `import_id`-viitteen hylkäyksen;
4. kesken epäonnistuvan kirjoituksen täydellisen rollbackin;
5. historian säilymisen tietokannan sulkemisen ja uudelleenavaamisen jälkeen.

Rollback-testissä vanha historia tallennetaan ensin. Uusi tuonti yrittää käyttää jo olemassa olevaa tapahtuman pääavainta. Tapahtumalisäys epäonnistuu vasta sen jälkeen, kun uuden tuonnin lisääminen on aloitettu. Testi varmistaa, ettei uusi `imports`-rivi jää kantaan ja että vanha historia säilyy.

## Python-osaajan vertailu

| TypeScript/Dexie | Läheinen Python-ajatus |
| --- | --- |
| `interface ImportRecord` | `dataclass` tai `TypedDict` |
| `Promise<T>` | asynkronisen funktion tuleva tulos |
| `await database.open()` | tietokantayhteyden asynkroninen avaaminen |
| `database.transaction(...)` | SQLAlchemy-session `begin` / commit / rollback |
| `Table<ImportRecord, string>` | tyypitetty repository tietylle mallille |
| `throw new MenomittariStorageError(...)` | oman Python-poikkeusluokan nostaminen |
| `try` / `catch` | `try` / `except` |

IndexedDB ei kuitenkaan ole relaatiotietokanta. Se ei valvo viiteavaimia kuten SQLite, joten `transactions.import_id` tarkistetaan sovelluskoodissa.

## Tarkistusten tulokset

| Tarkistus | Tulos |
| --- | --- |
| Paikallistallennuksen testit | 5 testiä läpäisi |
| Koko frontendin Vitest | 3 testitiedostoa ja 8 testiä läpäisi |
| TypeScript-tyyppitarkistus | Onnistui |
| Oxlint | 0 varoitusta ja 0 virhettä |
| Viten tuotantokooste | Onnistui |
| Frontendin Docker-kuva | Rakentui lukitusta riippuvuustiedostosta |
| Backendin regressiotestit | 9 testiä läpäisi, myös varoitukset käsiteltiin virheinä |

## Tarkastele tietokantaa selaimessa

1. Käynnistä sovellus ja kirjaudu sisään.
2. Avaa selaimen kehitystyökalut (`F12`).
3. Valitse Chromessa tai Edgessä **Application**.
4. Avaa vasemmalta **Storage → IndexedDB**.
5. Valitse `menomittari-<käyttäjän UUID>`.
6. Kannan alla näkyvät `imports` ja `transactions`.

P0-04:n jälkeen taulut ovat normaalissa käyttöliittymässä vielä tyhjiä, koska CSV-tuonti lisätään P0-05:ssä. Testit kirjoittavat vain omaan `fake-indexeddb`-testikantaansa eivätkä selaimesi oikeaan historiaan.

## Mitä tässä vaiheessa ei tehty?

P0-04 ei lisää CSV-tiedoston lukemista, kauppiaiden luokittelua, tapahtumalistaan tarkoitettua sivutusta, analyysia tai varmuuskopiota. Näitä ei rakennettu varmuuden vuoksi tallennuskerroksen sisään, vaan ne lisätään niille määrätyissä vaiheissa.

Seuraava P0-05 käyttää tätä repositorya validoidun ja luokitellun CSV-aineiston atomiseen tallentamiseen.
