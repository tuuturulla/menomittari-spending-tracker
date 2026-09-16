# Sovelluksen sisäiset toiminnot

Tekninen sopimus käyttöliittymän ja sovelluslogiikan välille. Kaikki toiminnot suoritetaan selaimessa; tämä ei ole HTTP-rajapinta. [Aineistosopimus](data-contract.md) määrittelee laskennan ja [arkkitehtuuri](architecture.md) tallennuksen.

## Toiminnot

Jokainen toiminto palauttaa Promise<Result<T>>: {ok: true, data: T} tai {ok: false, error: {code, message, row, field}}. Virheen row ja field ovat null, kun ne eivät sovellu tilanteeseen. Tekstit ovat käyttäjälle suomeksi.

| Toiminto | Syöte | Onnistumisen data |
| --- | --- | --- |
| importCsv | file: File, period_start, period_end | Import |
| listImports | Ei parametreja | {items: Import[]} |
| listTransactions | import_id, offset=0, limit=50 | {items: Transaction[], total, offset, limit} |
| getAnalysis | import_id | {summary: Summary, comparison: Comparison, insights: Insight[]} |
| exportBackup | Ei parametreja | {blob: Blob, filename: string} |
| restoreBackup | file: File | {import_count, transaction_count} |

Import on tallennettu tuontitietue sekä transaction_count. Transaction on tallennettu tapahtumatietue ilman source_row-kenttää. Imports järjestetään period_start laskevasti, tapahtumat date ja id nousevasti. Offset on kokonaisluku vähintään 0 ja limit kokonaisluku 1–200.

getAnalysis käyttää yhtä tallennuksesta luettua aineistokokonaisuutta. Käyttöliittymä päivittää tiedot onnistuneen tuonnin/palautuksen jälkeen. Sivun avauksessa valitaan ajallisesti uusin tuonti. Jakson vaihtuessa vanhentunut lukutulos ei saa korvata uutta valintaa.

## Analyysin tietomuodot

- Summary: import_id, period_start, period_end, expense_cents, refund_cents, categories. Kategoriarivi: category_code, name, expense_cents. Kaikki viisi mukana; järjestys summa laskevasti, sitten koodi nousevasti.
- Comparison: status, current_import_id, baseline_import_id, totals, categories. Status on comparable tai aineistosopimuksen estävä syy.
- Totals: previous_cents, current_cents, delta_cents, delta_percent. Vertailun kategoriarivi sisältää samat arvot sekä category_code ja name; järjestys koodi nousevasti.
- Estyneessä vertailussa totals=null ja categories=[]. baseline_import_id on null vain, kun aiempaa tuontia ei ole.
- Insight: code, current_import_id, baseline_import_id, category_code (null kokonaismuutokselle), previous_cents, current_cents, delta_cents, delta_percent, message. Järjestys on aineistosopimuksen sääntöjärjestys.

Tyhjässä kannassa listImports palauttaa tyhjän listan eikä UI pyydä analyysiä. Yhdellä tuonnilla yhteenveto toimii, vertailu antaa no_baseline ja havainnot ovat tyhjä lista. Summat ovat kokonaisia senttejä ja tunnisteet UUID-merkkijonoja.

## Virheiden koodit

| Koodi | Tilanne |
| --- | --- |
| invalid_request | Parametri tai sivutus virheellinen |
| import_not_found | Tuontia ei ole |
| file_too_large | CSV:n tai varmuuskopion kokoraja ylittyy |
| invalid_csv | Merkistö, rakenne tai tapahtumakenttä virheellinen; myös tyhjä aineisto |
| invalid_period | Virheellinen jakso tai sen ulkopuolinen tapahtuma |
| limit_exceeded | Tapahtumien määrä ylittää sopimuksen rajan |
| overlapping_period | Jakso on jo tuotu kokonaan tai osittain |
| invalid_backup | Varmuuskopion tiedot tai rakenne virheellisiä |
| unsupported_backup_version | Siirtomuodon versio ei ole tuettu |
| restore_requires_empty_database | Kohteessa on jo historiaa |
| storage_error | Avaus tai tallennus epäonnistuu, esimerkiksi levytilan puuttuessa |
| internal_error | Muu odottamaton virhe |

CSV-tuonnin tarkistusjärjestys: tiedostokoko, parametrit ja jakso, tapahtumien validointi, päällekkäisyys ja kannan kokonaismääräraja. Viimeiset kaksi tarkistetaan tallennuksen yhteydessä. Virhe ei sisällä raakaa tapahtumaa tai pinotulostetta. Erottuvat storage_error-viestit voivat neuvoa esimerkiksi sulkemaan toisen välilehden; kantaa ei poisteta.

Varmuuskopion oletusnimi on YYYY-MM-DD.menomittari-backup.json. Virheellinen tai ei-tyhjään kantaan tehty palautus ei muuta tallennettuja tietoja.
