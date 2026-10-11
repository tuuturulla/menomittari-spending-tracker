# P0-08: varmuuskopio ja turvallinen palautus

## Mitä tehtiin ja miksi?

Sovellukseen lisättiin paikallisen historian lataaminen JSON-tiedostona ja palautus tyhjään historiaan. IndexedDB säilyttää tiedot selaimessa, mutta ei ole varmuuskopio: sivustotietojen poistaminen tai laitteen rikkoutuminen voi hävittää historian. Kirjautuminen ei auta palauttamaan taloustietoja, koska backendissä ovat vain käyttäjätilit ja istunnot.

Toteutus ei lisää taloustietoja backendille, uusia tietokantatauluja tai riippuvuuksia. Ulkoasun laajempi suunnittelu on erillinen työosuus. P0-08:n toteutus ja automaattiset tarkistukset ovat tarkistettavana; erillisen selainprofiilin palautusdemo on vielä tekemättä. [Käyttötestiraportti](p0-08-kayttotesti.md) erottaa tehdyt ja tekemättömät tarkistukset.

## CSV ja JSON ovat eri tarkoituksiin

CSV on tuonnin lähde: riveillä ovat esimerkiksi päivämäärä, kuvaus ja summa. Sovellus muuntaa rivit omiksi tapahtumikseen, luo tunnisteet ja luokittelee menot.

JSON-varmuuskopio on jo tallennetun historian kopio. Sen `imports`-lista sisältää tuontijaksot ja `transactions`-lista tapahtumat. Se säilyttää tunnisteet, lähderivin numeron ja tallennetun luokituksen. Palautus ei tee uutta CSV-tuontia eikä luokittele tietoja uudelleen.

Tiedoston juuritasolla ovat myös:

- `format_version: 1`: siirtotiedoston rakenneversio, ei Dexien skeemaversio tai Alembic-migraatio.
- `exported_at`: vientihetki UTC-ajassa.
- `currency: "EUR"`: tämän kurssiversion valuutta.

Kopio ei sisällä käyttäjätunnuksia, salasanoja, istuntoja, alkuperäisiä CSV-tiedostoja, luokittelusääntöjä tai valmiita raportteja. Analyysi lasketaan palautetuista tapahtumista samoilla laskentasäännöillä kuin ennenkin. Jos sääntöjä joskus muutetaan, tiedot voivat säilyä samoina mutta uusi raportti muuttua.

## Missä toiminta tapahtuu?

| Tiedosto | Vastuu ja mitä siitä kannattaa lukea |
| --- | --- |
| [BackupPanel.tsx](../frontend/src/components/BackupPanel.tsx) | Käyttäjän painikkeet, tiedostovalinta, käsittelytila ja paikallinen palaute. `downloadFile` käynnistää selaimen latauksen. |
| [backup.ts](../frontend/src/application/backup.ts) | `exportBackup` muodostaa kopion; `restoreBackup` lukee tiedoston, tarkistaa sen ja pyytää tallennusta. |
| [backup-format.ts](../frontend/src/application/backup-format.ts) | `validateBackupDocument` tarkistaa ulkoa tulevan JSON:n kentät, tyypit ja version. |
| [validation.ts](../frontend/src/storage/validation.ts) | `validateHistoryWrite` tarkistaa koko historian tunnisteet, viitteet, tapahtumaehdot ja päällekkäiset jaksot. |
| [repository.ts](../frontend/src/storage/repository.ts) | `readAnalysisSnapshot` lukee molemmat taulut yhdessä; `restoreEmptyHistory` palauttaa ne atomisesti. |
| [App.tsx](../frontend/src/App.tsx) | Yhdistää paneelin kirjautuneen käyttäjän tallennukseen ja päivittää historian onnistuneen palautuksen jälkeen. |
| [backup.integration.test.ts](../frontend/src/application/backup.integration.test.ts) | Vienti–palautus-ketju, samat tunnisteet ja analyysit, virheen peruuntuminen ja samanaikaiset palautukset. |

## Vienti: tietokannasta tiedostoksi

```text
Lataa-painike → yhteinen lukutransaktio → kelvollinen JSON → Blob → selaimen lataus
```

`readAnalysisSnapshot()` lukee `imports`- ja `transactions`-taulut samassa lukutransaktiossa. Kopioon ei näin yhdistetä kahden eri hetken tietoja, esimerkiksi vanhaa tuontilistaa ja juuri lisättyjä tapahtumia.

Tässä rivejä tiedostosta `backup.ts`:

```ts
const snapshot = await storage.readAnalysisSnapshot()
const blob = new Blob([JSON.stringify(document, null, 2)], {
  type: 'application/json;charset=utf-8',
})
```

`await` odottaa asynkronisen lukemisen valmistumista. Pythonista tuttu vertailukohta on `await` asynkronisessa funktiossa. `JSON.stringify` vastaa ajatukseltaan `json.dumps`-muunnosta: olioista tulee JSON-tekstiä. `null, 2` tekee kahden välilyönnin sisennyksen. `Blob` on selaimen muistissa oleva tiedostomainen sisältö, ei palvelintallennus.

`downloadFile` luo Blobille tilapäisen osoitteen ja latauslinkin. Linkki poistetaan käytön jälkeen ja tilapäinen osoite vapautetaan. Tässä ei käytetä `fetch`-verkkopyyntöä. Sovellus kertoo, että tiedosto annettiin selaimelle ladattavaksi; käyttäjän on vielä varmistettava latauksen tallentuminen.

## Palautus: ulkopuolista tiedostoa ei luoteta suoraan

```text
Tiedoston valinta → kokoraja → UTF-8 ja JSON → rakenne ja sisältö → atominen tallennus → näkymän päivitys
```

Palautuksessa koko tarkistetaan ennen lukemista: enintään 16 MiB. Tavujen määrä tarkistetaan myös lukemisen jälkeen. `TextDecoder` hylkää virheellisen UTF-8:n ja `JSON.parse` hylkää rikkinäisen JSON:n.

```ts
let value: unknown
value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
const document = validateBackupDocument(value)
```

`unknown` tarkoittaa: emme vielä tiedä sisällön tyyppiä. JSON:n onnistunut lukeminen ei todista, että tiedosto olisi Menomittarin varmuuskopio. TypeScriptin tyyppimääritys ei tarkista käyttäjän tiedostoa ohjelman ajon aikana; siksi tarvitaan oikeasti suoritettavat tarkistukset.

`exactObject` hyväksyy vain odotetut kentät. `typedRecord` tarkistaa kenttien tyypit. Yhteinen `validateHistoryWrite` tarkistaa esimerkiksi:

- UUID:t ja niiden yksilöllisyyden sekä `import_id`-viitteen olemassaolon.
- Oikeat kalenteripäivät, UTC-aikaleimat ja tapahtuman kuulumisen tuontijaksoon.
- Kokonaiset sentit, etumerkin, tapahtumatyypin ja sallitun kategoriakoodin.
- 1–5 000 tapahtumaa tuonnissa ja enintään 10 000 historiassa.
- Lähderivien yksilöllisyyden saman tuonnin sisällä ja jaksojen päällekkäisyyden.

Koodin `Map` yhdistää tuontitunnisteen sen tuontiin tai tapahtumalistaan; Pythonissa vastaava ajatus on sanakirja. `Set` pitää kirjaa jo nähdyistä tunnisteista; Pythonin `set` tekee saman. Samannäköiset oikeat ostokset säilyvät: tarkistetaan tunnisteiden ja lähderivien yksilöllisyys, ei poisteta saman päivän samansuuruisia ostoksia.

## Miksi tyhjyys tarkistetaan transaktion sisällä?

Vain käyttöliittymässä tehty tarkistus olisi liian aikainen. Toinen välilehti voisi tuoda tapahtumia sen jälkeen mutta ennen palautuksen kirjoitusta. Siksi tarkistus ja molempien taulujen lisäykset ovat samassa `rw`- eli luku–kirjoitustransaktiossa:

```ts
if (await this.database.imports.count() || await this.database.transactions.count()) {
  throw new MenomittariStorageError(
    'restore_requires_empty_database',
    'Varmuuskopio voidaan palauttaa vain tyhjään historiaan. Nykyisiä tietoja ei korvata.',
  )
}
await this.database.imports.bulkAdd(snapshot.imports)
await this.database.transactions.bulkAdd(snapshot.transactions)
```

`count()` laskee tietueet. Nolla on tässä epätosi ja positiivinen lukumäärä tosi; `||` tarkoittaa ”tai”. Jos kummassakaan taulussa on tietoja, `throw` keskeyttää palautuksen. `bulkAdd` lisää listan tietueita alkuperäisine tunnisteineen, ei korvaa vanhoja.

Jos jälkimmäinen lisäys epäonnistuu, transaktio peruu myös ensimmäisen. Tätä tarkoittaa atomisuus: joko koko palautus tallentuu tai mitään ei tallennu. Pelkkä kahden `await`-rivin kirjoittaminen ei takaa sitä; ympäröivä tietokantatransaktio on ratkaiseva.

## Käyttöliittymä ja testaus

`busy` estää toisen palautuksen käsittelyn aikana. App estää myös CSV-tuonnin ja uloskirjautumisen varmuuskopiotoiminnon ajaksi. Varsinainen tietojen eheys ei silti riipu painikkeista vaan storagen tarkistuksista. Onnistunut palautus kasvattaa `historyRevision`-arvoa, jolloin historia ja analyysit luetaan uudelleen. Virhe saa punaisen ilmoituksen lähelle toiminnon painiketta ja ilmoitukseen siirretään kohdistus.

Automaattinen palautustesti tekee neljän demon historian, vie kopion ja palauttaa sen toiseen testikantaan. Se vertaa kaikkia tietuekenttiä ja jokaisen jakson analyysiä. Erillinen testi aiheuttaa tallennusvirheen tarkoituksella ja odottaa molempien taulujen jäävän tyhjiksi. Testit käyttävät `fake-indexeddb`:tä, eivät selaimen käyttäjähistoriaa. Siksi oikeassa selaimessa tarkistettiin lisäksi tiedostovalinta, lataus, palautus, ilmoitukset ja mobiilileveys.

## Harjoittele koodinlukua

1. Avaa `BackupPanel.tsx` ja etsi `download`. Seuraa kutsua `exportBackup`-funktioon. Missä tiedot muuttuvat tekstiksi, ja missä lataus käynnistyy?
2. Avaa `backup.ts` ja seuraa `restoreBackup`-funktiota ylhäältä alas. Mikä ehto pysäyttää liian suuren tiedoston ennen lukemista?
3. Avaa `backup-format.ts`. Miksi pelkkä `JSON.parse` ei riitä? Mitä tapahtuu, jos `currency` on `USD`?
4. Avaa `repository.ts` ja etsi `restoreEmptyHistory`. Missä transaktio alkaa ja päättyy? Miksi tyhjyysehto ei ole sen ulkopuolella?
5. Lue integraatiotestin `rolls back imports if transaction insertion fails`. Mikä kirjoitus rikotaan, ja mitä `toEqual({ imports: [], transactions: [] })` todistaa?

Minimitason ymmärrys: kirjautuminen ja taloushistoria ovat eri tallennuksia; JSON on siirrettävä kopio historiasta; tiedoston tyyppi ja sisältö tarkistetaan ajon aikana; transaktio suojaa osittaiselta palautukselta. Manuaalinen, salaamaton varmuuskopio vähentää katoamisriskiä vain, jos se todella tallennetaan ja säilytetään turvallisesti. Se ei ole pilvisynkronointi tai tuotantotason tietoturvalupaus.
