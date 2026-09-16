# Arkkitehtuuri

Tekninen kuvaus toteuttajille. Tuotteen tavoite ja rajaus ovat [projektisuunnitelmassa](project-plan.md), tiedot ja laskenta [aineistosopimuksessa](data-contract.md) ja toimintojen sopimus [api.md:ssä](api.md).

## Osat ja tiedonkulku

```text
frontend/src/ui/           React-näkymä ja käyttäjän valinnat
frontend/src/application/  tuonti, analyysin kokoaminen ja varmuuskopiot
frontend/src/domain/       kenttävalidointi, luokittelu ja laskenta
frontend/src/storage/      Dexie, tietomalli ja tietokantakyselyt
frontend/tests/fixtures/   fiktiiviset testi- ja esittelyaineistot

UI -> application -> domain
                  -> storage -> IndexedDB
```

Application käyttää muutamaa tallennusfunktiota, jotka palauttavat tavallisia TypeScript-tietoja. Dexie-oliot eivät leviä muihin osiin. Domain saa aineiston parametreina eikä käytä tietokantaa, Reactia tai selain-API:a. UI muotoilee luvut, mutta ei laske toista versiota yhteenvedosta.

CSV luetaan Papa Parsella merkkijonoiksi, tarkistetaan ja luokitellaan ennen tallennusta. Yksi tallennusoperaatio tarkistaa päällekkäisyyden ja lisää koko aineiston. Analyysi lasketaan yhteisestä lukutransaktiosta saadusta aineistosta. Ei palvelinkutsuja tai toista pysyvää analyysikantaa.

## Tietomalli, versio 1

| Taulu | Kentät |
| --- | --- |
| imports | id: UUID, period_start, period_end, created_at: UTC-aikaleima |
| transactions | id: UUID, import_id, source_row: kokonaisluku, date, description, amount_cents: etumerkillinen kokonaisluku, kind, category_code |

Päivät ovat YYYY-MM-DD-merkkijonoja. Rahat ovat turvallisia kokonaislukuja sentteinä. UUID:t luodaan paikallisesti. Kiinteät kategoriakoodit, nimet ja luokittelusäännöt ovat domain-koodissa, eivät kolmannessa taulussa. Niiden määritelmät ovat aineistosopimuksessa.

Imports: pääavain id, indeksi period_end ja uniikki yhdistelmä [period_start+period_end]. Transactions: pääavain id, uniikki [import_id+source_row] ja hakuindeksi [import_id+date+id]. Säilytysrajoitukset ovat aineistosopimuksessa.

## Tallennuksen eheys

IndexedDB ei tarkista viiteavaimia: storage tarkistaa import_id:n, category_code:n ja muut kenttäehdot. Päällekkäisyys- ja määrätarkistus sekä lisäys tehdään samassa molemmat taulut kattavassa readwrite-transaktiossa. Palautuksen tyhjän kannan ehto tarkistetaan vastaavasti. Virhe peruu koko kirjoituksen. Näin myös samanaikaiset välilehdet säilyttävät tiedon eheyden.

Alkuperäistä CSV:tä tai tiedostonimeä ei tallenneta. Erillistä tiedoston tiivistettä ei tarvita: sama tiedosto samalle tai sen tapahtumat kattavalle jaksolle osuu jo päällekkäisyystarkistukseen. Tiedoston sisäiset identtiset ostokset säilyvät source_row-kentän avulla.

Tiedostonlukua tai muuta erillistä async-työtä ei tehdä Dexie-kirjoitustransaktion sisällä. Tallennusvirhe näytetään eikä kantaa tyhjennetä tai vaihdeta hiljaisesti pelkkään muistissa säilyttämiseen. MVP käyttää yhtä välilehteä kerrallaan; toisessa välilehdessä tehdyt muutokset tulevat näkyviin sivun päivityksellä, eivät automaattisesti.

## Muutokset ja testaus

Dexien skeemaversio on aluksi 1. Seuraava versio ja datan säilyttävä migraatio lisätään vasta, kun tietomalli oikeasti muuttuu. Varmuuskopion format_version on erillinen siirtomuodon versio. Tietokannan vaihtaminen vaatii uuden tallennustoteutuksen ja tiedonsiirron, vaikka laskenta pysyisi samana.

Vitest testaa domain- ja sovellusfunktiot, fake-indexeddb tallennuksen sekä peruuntuvan kirjoituksen. Lisäksi tehdään [työlistan](backlog.md#p0-06-varmuuskopio-ja-esittelyn-viimeistely) käyttötesti oikeassa selaimessa. Automaattinen selaintestaus ei ole tämän version vaatimus.

## Tekninen tausta

- [Dexie: rakenne ja transaktiot](https://dexie.org/docs/Tutorial/Design)
- [Dexie: skeemaversioiden muutokset](https://dexie.org/docs/Version/Version.upgrade())
- [MDN: selaintallennuksen rajat ja tietojen poistuminen](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
