# P0-07: vertailu ja havainnot – työseloste ja oppituntimateriaali

## Tavoite ja lopputulos

P0-07 vertaa yhden kuukauden sisäistä kulujaksoa edelliskuukauden vastaavaan väliin. Käyttäjä näkee kokonaismenojen ja menoryhmien muutokset sekä enintään kolme sääntöihin perustuvaa havaintoa. Kokonaiset kuukaudet voivat olla eri pituisia. Jos vertailuväliä ei voi muodostaa tai sen kattavaa tuontia ei ole, sovellus kertoo syyn. Valitun jakson P0-06-yhteenveto näkyy silloinkin. Usean kuukauden yli ulottuville omille jaksoille säilyy alkuperäinen yhtä pitkien, peräkkäisten tuontien sääntö.

```text
IndexedDB: imports + transactions
          ↓ yksi Dexien lukutransaktio
application: getAnalysis(import_id)
          ↓ tavalliset JavaScript-oliot
domain: analyzePeriods → yhteenveto, vertailu, havainnot
          ↓
React: AnalysisPanel → suomalaiset päivät ja euromäärät
```

Talousrivejä ei lähetetä backendille. Tämä on paikallisesti tehtävää analyysiä, ei ennuste tai väite menojen muutoksen syystä.

## Tärkeimmät tiedostot ja miksi ne ovat erillään

| Tiedosto | Tehtävä |
| --- | --- |
| [data-contract.md](data-contract.md#laskenta-ja-vertailu) | Määrittää vertailun ja havaintojen säännöt ennen koodia |
| [analysis.ts](../frontend/src/domain/analysis.ts) | Etsii vertailujakson, laskee erot ja muodostaa havainnot puhtaasti syötteistä |
| [periods.ts](../frontend/src/domain/periods.ts) | Muodostaa kuukauden rajat ja edelliskuukauden vastaavan välin ilman paikallista aikavyöhykettä |
| [ImportPeriodFields.tsx](../frontend/src/components/ImportPeriodFields.tsx) | Näyttää kuukausivalinnan tai omat päivät; molemmat lähettävät samat tuonnin päivämääräkentät |
| [CsvImportForm.tsx](../frontend/src/components/CsvImportForm.tsx) | Pitää tuontikentät ja tulosilmoituksen yhdessä sekä kohdistaa uuden ilmoituksen näkyviin |
| [summary.ts](../frontend/src/domain/summary.ts) | Laskee kummankin jakson menot samalla P0-06-säännöllä |
| [repository.ts](../frontend/src/storage/repository.ts) | Lukee molemmat IndexedDB:n object storet samassa lukutransaktiossa |
| [analysis.ts](../frontend/src/application/analysis.ts) | Tarkistaa tunnisteen, hakee aineiston ja palauttaa onnistumis- tai virhetuloksen |
| [TransactionHistory.tsx](../frontend/src/components/TransactionHistory.tsx) | Pyytää analyysin valinnan vaihtuessa ja hylkää vanhentuneen lataustuloksen |
| [AnalysisPanel.tsx](../frontend/src/components/AnalysisPanel.tsx) | Näyttää vertailun tai selkeän estosyyn ilman omaa laskentalogiikkaa |
| [format.ts](../frontend/src/components/format.ts) | Muuntaa sentit euroiksi ja ISO-päivät suomalaiseen esitysmuotoon |

Sama nimi `analysis.ts` kahdessa kansiossa tarkoittaa eri vastuuta: `domain` osaa laskea mutta ei lue tietokantaa; `application` kokoaa tietokantaluvun ja laskennan yhdeksi käyttöliittymän kutsuttavaksi toiminnoksi. Python-vertauksena domain on tavallinen laskentafunktio ja application sitä kutsuva palvelufunktio.

## Miten vertailujakso valitaan?

[previousMonthPeriod](../frontend/src/domain/periods.ts) muodostaa yhden kuukauden sisäiselle jaksolle edelliskuukauden vertailuvälin. `1.–15.5.` muuttuu väliksi `1.–15.4.`. Kokonainen kesäkuu muuttuu kokonaiseksi toukokuuksi, vaikka päivien lukumäärä eroaa. Karkausvuosi ja tammikuun siirtyminen edellisvuoden joulukuuhun huomioidaan. Osajaksoa ei lyhennetä automaattisesti: `1.–30.3.` ei muutu helmikuun 28 päiväksi, vaan antaa `unavailable_dates`-syyn.

[analyzePeriods](../frontend/src/domain/analysis.ts) etsii yhden aiemman tuonnin, jonka ilmoitettu väli kattaa koko tarvittavan vertailuvälin. Jos aiempaa tuontia ei ole, syy on `no_baseline`. Jos tuonteja on mutta kattavaa ei löydy, syy on `incomplete_baseline`. Laskenta ei yhdistä erillisiä tuonteja, hyppää vanhempaan kuukauteen tai oleta puuttuvia päiviä nollamenoiksi. Käyttäjän ilmoittama kattavuus ei silti todista pankkiaineiston täydellisyyttä.

Usean kuukauden yli ulottuva oma jakso käyttää [findBaseline](../frontend/src/domain/analysis.ts)-funktiota: suurin loppupäivä ennen valitun jakson alkua. Silloin estosyyt ovat järjestyksessä `no_baseline`, `different_duration` ja `gap`. Tuontijärjestys ei vaikuta kumpaankaan vertailutapaan. Päiväluku sisältää molemmat rajapäivät: `loppu − alku + 1`. UTC-kalenteripäivät estävät kesäajan kellonsiirron vaikutuksen päivien laskentaan.

Alkuperäiset jo tallennetut demojaksot `1.4.–30.4.` ja `1.5.–30.5.` toimivat edelleen: toukokuun osajakso käyttää huhtikuun päiviä 1–30. Nykyinen toukokuun CSV sisältää kuitenkin myös 31.5. tapahtuman, joten uusi demo tuodaan koko kuukaudelle. Vanhoja tallennettuja jaksoja ei muuteta.

Jos vertailu estyy, `comparison.totals` on `null`, kategoriavertailu ja havainnot ovat tyhjiä. Valitun jakson `summary` lasketaan ennen estotarkistuksia, joten yhteenveto säilyy näkyvissä.

## Miksi tuontijakso ja laskentaväli erotettiin?

Alkuperäinen yhtä pitkien ja peräkkäisten jaksojen vaatimus aiheutti käytännön kitkaa: toukokuun 31 päivää ei voinut verrata kesäkuun 30 päivään. Kuukausivalinta ehkäisee väärän loppupäivän syöttämistä, mutta osajaksovertailu tarvitsee lisäksi tapahtumien päiväsuodatuksen.

Esimerkiksi huhtikuun tuonti sisältää 10 euron ostoksen 5.4. ja 90 euron ostoksen 20.4. Toukokuun valittu jakso on 1.–15.5., jolloin menot ovat 15 euroa. Vertailun aiempi summa on **10 euroa**, ei koko huhtikuun 100 euroa. Muutos on +5 euroa / +50 %. Huhtikuun tuonti ja molemmat sen tapahtumat pysyvät tietokannassa ennallaan.

Oleellinen koodinlukukohta [analysis.ts:ssä](../frontend/src/domain/analysis.ts) on:

```typescript
transactions.filter((transaction) =>
  transaction.import_id === baseline.id &&
  transaction.date >= baselinePeriod.period_start &&
  transaction.date <= baselinePeriod.period_end,
)
```

`filter` säilyttää vain ne rivit, joiden ehto on tosi. `&&` tarkoittaa Pythonin `and`-operaattoria: rivin pitää kuulua oikeaan tuontiin **ja** sen päivämäärän pitää olla molempien rajojen sisällä. ISO-päiviä voi vertailla merkkijonoina, koska ne on validoitu muotoon `YYYY-MM-DD`. `calculateSummary` laskee suodatetut rivit samoilla menosäännöillä kuin ennen.

`baseline_import_id` tunnistaa lähdetuonnin. Uusi `baseline_period` kertoo laskentaan käytetyt päivät, ei uutta tallennettua tuontia. [AnalysisPanel](../frontend/src/components/AnalysisPanel.tsx) näyttää tämän laskentavälin. Tämän vuoksi tietokannan skeema, CSV-rakenne ja backend eivät muuttuneet.

## Mitä kuukausivalinta ja päällekkäisyysviesti tekevät?

[ImportPeriodFields](../frontend/src/components/ImportPeriodFields.tsx) näyttää oletuksena kokonaisen kuukauden valinnan. [calendarMonthPeriod](../frontend/src/domain/periods.ts) täyttää todellisen ensimmäisen ja viimeisen päivän. Päivät näkyvät vain luettavina, mutta käyttäjä voi vaihtaa omaan ajanjaksoon ja muokata niitä. Kummassakin tilassa [App](../frontend/src/App.tsx) lukee `FormData`-oliosta samat `period_start`- ja `period_end`-kentät. Onnistunut tuonti nollaa myös Reactissa säilytetyn jaksovalinnan.

Kuukausi- ja päiväkentät käyttävät `onInput`-tapahtumaa, jotta niiden arvo päivittyy Reactin tilaan myös selaimen oman päivämääräkentän syötössä. Tämä tarkistettiin oikeassa selaimessa; pelkkä valmiin HTML:n testaus ei todista tapahtumankäsittelyn toimivuutta.

[saveImportWithTransactions](../frontend/src/storage/repository.ts) estää edelleen päällekkäiset tuonnit samassa kirjoitustransaktiossa. Viesti nimeää esimerkiksi uuden välin `2026-05-01–2026-05-31` ja jo tallennetun välin `2026-05-01–2026-05-15`. Se kertoo myös, ettei MVP yhdistä tai korvaa tuonteja. Tämä ei ole pankkitapahtumien duplikaattitunnistusta: kaksi samannäköistä aitoa ostosta säilyvät erillisinä.

Rajoitus jää näkyväksi: jos toukokuu tuodaan kahdessa osassa, osia ei vielä koota yhdeksi kuukausiyhteenvedoksi. Kokonaista toukokuuta ei myöskään voi tuoda niiden päälle. Tämä parannus helpottaa jaksovalintaa ja vertailua, mutta ei uudista tuontimallia.

## Miksi tuonnin ilmoitus siirrettiin lomakkeeseen?

Päällekkäisen tuonnin esto toimi, mutta sen virheviesti näkyi pitkän tapahtumahistorian ja uloskirjautumispainikkeen jälkeen. Tuontipainiketta painava käyttäjä ei välttämättä nähnyt ilmoitusta, joten toiminto vaikutti hiljaisesti epäonnistuvalta. Kyse oli palautteen sijainnista, ei tallennuksen tarkistusvirheestä.

[App.tsx](../frontend/src/App.tsx) pitää nyt tuonnin `importError`- ja `importMessage`-tilat erillään kirjautumisen ilmoituksista. [CsvImportForm](../frontend/src/components/CsvImportForm.tsx) kokoaa aiemmat tuontikentät omaksi näkymäkomponentikseen ja näyttää tuloksen heti tuontipainikkeen alla, ennen historiaa. Virhe näkyy punertavassa laatikossa otsikolla *Tuonti estettiin*, onnistuminen vihertävässä laatikossa. Samalla säilyy varsinainen syy, esimerkiksi molemmat päällekkäiset ajanjaksot. Tuontisäännöt ja tallennettu historia eivät muutu.

Koodinlukukohta on `feedbackRef.current?.focus()`: `useRef` säilyttää viitteen ilmoituksen HTML-elementtiin, `useEffect` suoritetaan ilmoituksen päivityttyä ja `focus()` kohdistaa elementin sekä tuo sen selaimen näkymään. `?.` jättää kutsun tekemättä, jos elementtiä ei vielä ole. `tabIndex={-1}` sallii ohjelmallisen kohdistuksen lisäämättä laatikkoa tavalliseen Tab-kiertoon. Virheen `role="alert"` ja onnistumisen `role="status"` auttavat myös ruudunlukijaa tunnistamaan ilmoituksen.

[CsvImportForm.test.tsx](../frontend/src/components/CsvImportForm.test.tsx) tarkistaa ilmoituksen sijainnin lomakkeen HTML:ssä, roolit ja sen, ettei onnistumisviesti näy virheen rinnalla. Nämä testit eivät yksin todista vieritystä tai Reactin tapahtumankäsittelyä. Siksi lisäksi kokeiltiin varsinaista App-näkymää eristetyssä Codexin sisäisessä selaimessa portissa 5174. Testi käytti fiktiivisiä CSV:itä, muistissa toimivaa `fake-indexeddb`-kantaa ja korvattua kirjautumisrajapintaa, ei käyttäjän historiaa tai backend-pyyntöjä.

Selaimessa tarkistettiin koko heinäkuun tuonti jo tallennetun 1.–15.7. jakson päälle, saman huhtikuun uudelleentuonti, virheellinen CSV-otsikko ja onnistunut erillisen jakson tuonti. Ilmoitus kohdistui ja tuli kokonaan näkyviin heti painikkeen alla. Hylätyt tuonnit eivät lisänneet historiaan jaksoja, onnistunut tuonti päivitti historian ja nollasi jaksovalinnan. Väliaikaiset koetiedostot ja testipalvelin poistettiin tarkistuksen jälkeen. Tämä rajattu tarkistus ei korvaa P0-08:n koko käyttökulun ja varmuuskopion testausta.

Korjauksen tarkistus 11.10.2026: kaikki 96 frontend-testiä 17 tiedostossa läpäisivät Dockerissa. Tyyppitarkistus ja julkaisutiedostojen kokoaminen onnistuivat, lint ilmoitti 0 virhettä ja 0 varoitusta. Uusia riippuvuuksia ei lisätty eikä backendin koodia muutettu.

## Miten raha ja prosentti lasketaan?

Tietokannassa raha on kokonaislukusenttejä. Esimerkiksi `14500` senttiä näytetään muodossa `145,00 €`. Sentit estävät desimaalisten eurojen tavallisia liukulukupyöristysongelmia.

```text
aiemmat menot = 9 000 senttiä  = 90,00 €
nykyiset menot = 14 500 senttiä = 145,00 €
muutos = 14 500 − 9 000 = +5 500 senttiä = +55,00 €
prosentti = 100 × 5 500 / 9 000 = +61,11 %
```

Prosentti pyöristetään kahteen desimaaliin. Kun aiemmat menot ovat nolla, jakaminen nollalla ei ole mahdollista: `delta_percent` on `null`. Näkymä kertoo silloin `0 € → 0 €` -tapauksessa *ei muutosta* ja `0 € → 15 €` -tapauksessa euromääräisen muutoksen sekä *uusi meno*, mutta ei esitä keksittyä kasvuprosenttia. Negatiivinen muutos tarkoittaa pienempää menosummaa, ei automaattisesti todellista säästöä.

Kummankin jakson `expense`-rivit lasketaan [calculateSummary](../frontend/src/domain/summary.ts)-funktiolla. Palautukset pysyvät erillään, eivätkä tulot tai tilisiirrot kasvata menoja. Kaikki viisi menoryhmää ovat vertailussa mukana, myös nollasummaisina ja `unknown`. Vertailurivit järjestetään kategoriakoodin mukaan.

## Mistä kolme havaintoa tulevat?

[analyzePeriods](../frontend/src/domain/analysis.ts) käy läpi kolme sääntöä aina samassa järjestyksessä. Kukin sääntö tuottaa korkeintaan yhden rivin:

1. `total_change`: kokonaismenot muuttuvat nollasta poikkeavasti.
2. `largest_category_increase`: suurin positiivinen kasvu ryhmässä, jossa oli menoja jo aiemmin.
3. `new_category_spend`: suurin nykyinen meno ryhmässä, jonka aiempi summa oli nolla.

Jos kahdessa ryhmässä muutos on sama, aakkosissa pienempi kategoriakoodi voittaa. Tuntematon menoryhmä saa havainnossa nimen *Tunnistamattomat menot*. Tyhjä havaintolista on oikea tulos esimerkiksi muuttumattomille kokonais- ja ryhmäsummille.

Fiktiivisillä demoilla näkyy kokonaismuutos `+55,00 € / +61,11 %`, Ruokakaupan kasvu `+30,00 € / +50 %` ja uusi Tilaukset-meno `15,00 €`. Näkymä kertoo molemmat ajanjaksot sekä kunkin havainnon aiemman summan, nykyisen summan ja erotuksen. Se ei päättele esimerkiksi hinnankorotusta, maksun toistuvuutta tai ostoksen syytä.

## Miksi luku tehdään yhdessä tietokantatransaktiossa?

[readAnalysisSnapshot](../frontend/src/storage/repository.ts) lukee `imports`- ja `transactions`-object storet yhdessä Dexien `r`-lukutransaktiossa. Muuten jaksolista voisi olla eri tietokannan hetkestä kuin tapahtumarivit, jos tallennus tapahtuu lukujen välissä. `Promise.all` käynnistää molemmat haut saman transaktion sisällä. Laskentafunktio saa tämän jälkeen tavalliset taulukot, eikä sen tarvitse tuntea IndexedDB:tä tai Dexietä.

Käyttöliittymä tekee analyysin vain valitun jakson vaihtuessa tai onnistuneen tuonnin jälkeen, ei tapahtumalistan sivua vaihdettaessa. Reactin effect-cleanup ja tuloksen tunnisteet estävät vanhan, myöhässä valmistuneen haun näyttämisen uuden valinnan kohdalla.

## Demoaineistojen tasapainotus: mitä muutettiin ja miksi?

Alkuperäisissä huhti–toukokuun demoissa kaikki menot osuivat kuukauden alkupuolelle ja pankkimuodon demossa oli vain kolme tapahtumaa. Näillä tuonnin saattoi näyttää, mutta puolikkaan kuun vertailu ei havainnollistanut loppukuun menojen poissulkemista.

Kokonaisissa kuukausidemoissa on yhdeksän tapahtumaa ja heinäkuun puolikkaassa kuusi. Osajaksoa lyhennettiin, jotta se erottuu esittelyssä kokonaisista kuukausista: kaksi 15 euron ruokakauppaostosta, 7,50 euron ravintolameno, 15 euron tilausmeno, 5 euron tunnistamaton meno ja yksi tulo. Menot ovat yhteensä 57,50 euroa. Samat rivimäärät eivät ole testikattavuuden edellytys, eikä puolikkaan kuukauden menosumman tarvitse yleisesti olla tasan puolet kokonaisen kuukauden menoista.

Huhti–toukokuun kokonaissummat säilyivät 90 ja 145 eurossa: ravintolamenoja jaettiin eri päiville ja pieni osa menoista siirrettiin tunnistamattomaan ryhmään. Saman päivän kaksi identtistä ruokakauppaostosta säilytettiin tarkoituksella. Tulot, tilisiirrot ja palautukset osoittavat demomuodossa, mitä ei lasketa menoihin. Pankkimuodossa on menoja ja tuloja sekä desimaalipilkun ja kesäkuussa puuttuvan saajanimen tapauksia.

Kesäkuun pankkidemoon lisättiin alku- ja loppukuun menoja. Uusi pankkimuotoinen osajakso on **1.–15.7.2026**, ei toinen kesäkuun tuonti: näin kaikki neljä tiedostoa voi tuoda samalle demokäyttäjälle ilman päällekkäisyyttä. Rajapäivien menot osoittavat, että molemmat rajat kuuluvat mukaan.

Tärkeä käsin tarkistettava ketju:

```text
kesäkuun koko tuonti: 125 €
  päivät 1–15:        95 €
  päivät 16–30:       30 €
heinäkuun päivät 1–15: 57,50 €

vertailu: 57,50 − 95 = −37,50 € eli −39,47 %
ei:       57,50 − 125 = −67,50 €
```

Tarkat tiedostot, rivimäärät, ryhmäsummat ja odotetut havainnot ovat yhdessä paikassa: [demojen odotusarvot](data-contract.md#demojen-odotusarvot). Lyhyet CSV:t ovat käsin luettavia esimerkkejä, eivät realistinen vuoden taloushistoria tai todiste säännöllisten kulujen tunnistamisesta.

[csv-import.test.ts](../frontend/src/domain/csv-import.test.ts) käyttää `it.each`-taulukkoa: sama tarkistus ajetaan erikseen jokaiselle demolle. Näin yksi testi voi tarkistaa jokaisen tiedoston määrän, menosumman, rajapäivät, tunnistamattoman menon ja erilliset samannäköiset ostokset. Odotusarvot ovat tarkoituksella käsin laskettuja lukuja, eivät saman laskentafunktion tuottamia odotuksia.

[analysis.integration.test.ts](../frontend/src/application/analysis.integration.test.ts) tuo kaikki neljä tiedostoa oikean tuontipalvelun kautta eristettyyn `fake-indexeddb`-kantaan. Se sulkee ja avaa yhteyden, tarkistaa kesäkuun ja heinäkuun vertailut sekä vertaa tallennettua historiaa ennen ja jälkeen analyysin. Lopuksi se yrittää tuoda koko heinäkuun aiemman osajakson päälle: virheen pitää nimetä jaksot ja historian pysyä samana. Testi ei käsittele käyttäjän selaimen tietokantaa.

Sovelluksen tuotantokoodia, käyttöliittymää, pankkisovitinta tai tietokantamallia ei tarvinnut muuttaa. Tässä täydennettiin aineistoja ja testien kattavuutta, ei lisätty uutta ominaisuutta.

## Mitä testattiin?

- [periods.test.ts](../frontend/src/domain/periods.test.ts) tarkistaa kuukauden loppupäivät, karkausvuoden, vuodenvaihteen, tyhjän valinnan ja olemattomat osajakson päivät.
- [analysis.test.ts](../frontend/src/domain/analysis.test.ts) tarkistaa demoarvot, osajakson molemmat rajapäivät ja ulkopuolisten tapahtumien poissulkemisen, kokonaiset kuukaudet, puuttuvan kattavuuden, väärän tuontijärjestyksen sekä aiemmat prosentti- ja havaintosäännöt.
- [analysis.test.ts](../frontend/src/application/analysis.test.ts) tarkistaa virheellisen tai puuttuvan tuontitunnisteen ja tallennusvirheen.
- [analysis.integration.test.ts](../frontend/src/application/analysis.integration.test.ts) tuo fiktiivisiä CSV:itä `fake-indexeddb`-kantaan ja tarkistaa vertailun sekä sen, ettei osajakson laskenta muuta koko lähdetuonnin tapahtumia tai päivämääriä.
- [AnalysisPanel.test.tsx](../frontend/src/components/AnalysisPanel.test.tsx) tarkistaa estosyyn sekä jaksojen, summien, etumerkin ja määrittelemättömän prosentin esityksen.
- [ImportPeriodFields.test.tsx](../frontend/src/components/ImportPeriodFields.test.tsx) tarkistaa kuukausi- ja omien päivien kentät sekä rajauksista kertovat tekstit. [repository.test.ts](../frontend/src/storage/repository.test.ts) tarkistaa myös päällekkäisyysviestin nimeämät jaksot ja aiempien tietojen säilymisen.

Selaintarkistus tehtiin erillisessä Codexin sisäisen selaimen komponenttiesikatselussa portissa 5174, vain fiktiivisillä riveillä ja ilman kirjautumista tai tietokantakirjoituksia. Kuukausivalinta täytti toukokuun loppupäiväksi 31.5. ja karkausvuoden helmikuun loppupäiväksi 29.2. Kuukausi → oma jakso → kuukausi säilytti valinnan, ja lomake lähetti näkyvät päivät. Osajaksovertailu näytti 1.–15.4. vastaan 1.–15.5. sekä +5 euroa / +50 %. Uusi lomake mahtui 390 pikselin leveyteen ilman vaakavieritystä. Väliaikainen esikatselu poistettiin tarkistuksen jälkeen. Tämä ei korvaa P0-08:n koko sovelluksen käyttötestiä.

Demoaineistojen tasapainotuksen ja osajakson lyhentämisen lopullinen tarkistus 11.10.2026: frontendin kaikki 92 testiä 16 testitiedostossa läpäisivät Dockerissa. Tyyppitarkistus ja julkaisutiedostojen kokoaminen onnistuivat; lint-tarkistus ilmoitti 0 virhettä ja 0 varoitusta. Backendin koodia tai tietokantamallia ei muutettu, eikä tästä tarkennuksesta kirjata uutta backendin testitulosta. Koko sovelluksen oikean selaimen käyttötesti kuuluu edelleen P0-08:aan.

Tarkistuskomennot projektikansiossa:

```powershell
docker compose run --rm frontend pnpm test
docker compose run --rm frontend pnpm typecheck
docker compose run --rm frontend pnpm lint
docker compose run --rm frontend pnpm build
```

## Kokeile itse

Käytä uutta fiktiivistä demokäyttäjää, jos vanhat versiot on jo tuotu. Päällekkäinen tuonti estyy eikä vanhaa historiaa korvata; sen poistamista ei tarvita.

1. Tuo [huhtikuun demo](../frontend/tests/fixtures/demo-2026-04.csv) kuukausivalinnalla huhtikuulle 2026. Päivät ovat `2026-04-01–2026-04-30`. Yhteenveto näyttää 90 euroa; vertailussa lukee, ettei aiempaa jaksoa ole.
2. Tuo [toukokuun demo](../frontend/tests/fixtures/demo-2026-05.csv) kuukausivalinnalla toukokuulle 2026. Päivät ovat `2026-05-01–2026-05-31`. Tarkista 145 euroa, vertailu huhtikuuhun ja kolme havaintoa.
3. Tuo [kesäkuun pankkidemo](../frontend/tests/fixtures/s-pankki-demo-2026-06.csv) kokonaiselle kesäkuulle. Menot ovat 125 euroa; vertailu käyttää koko toukokuun 145 euroa.
4. Tuo [heinäkuun osajakso](../frontend/tests/fixtures/s-pankki-demo-2026-07-half.csv) **omana ajanjaksona** `2026-07-01–2026-07-15`. Tarkista kuusi tapahtumaa, 57,50 euroa, vertailun aiempi summa 95 euroa ja päivät 1.–15.6. Muutos on −37,50 euroa / −39,47 %.
5. Vaihda valikosta kesäkuuhun: sen koko tuonnin yhteenveto on yhä 125 euroa. Neljässä tuonnissa on yhteensä 33 tapahtumaa.
6. Kokeile heinäkuun osajakson tiedostoa uudelleen koko heinäkuulle. Tuonti estyy ja viesti nimeää valitun sekä jo tallennetun jakson. Historia ei muutu. Tämä ei tarkoita, että osajakson tiedoston ilmoittaminen kokonaiseksi kuukaudeksi olisi oikein.
7. Lue [change](../frontend/src/domain/analysis.ts)-funktion neljä palautettua kenttää ja etsi niitä vastaavat tekstit [AnalysisPanelista](../frontend/src/components/AnalysisPanel.tsx). Kysy itseltäsi: mistä aiempi summa tulee, mistä nykyinen, missä sentti muuttuu euroksi?

Käytä vain fiktiivisiä demoja. P0-08:ssa tehdään varmuuskopio ja kirjataan koko sovelluksen käyttötesti oikeassa selaimessa, myös 390 pikselin näkymässä. P0-07 ei lisää kaavioita, kuukausien pituuden normalisointia, tuontien yhdistelyä eikä palvelinpuolista analyysiä. Tuotetavoitteeseen nähden jäljellä olevat erot on kuvattu [MVP-arviossa](mvp-arvio.md).

P0-07 luovutetaan tarkistettavaksi; käyttäjä hyväksyy ja yhdistää tehtävähaaran. Visuaalisen ilmeen suunnittelua jatketaan tämän osuuden jälkeen. Vertailun pylväät, tiedon hierarkia ja mahdollinen maskotti kannattaa toteuttaa erillisenä rajattuna ulkoasutyönä, jotta P0-08 pysyy varmuuskopioinnin ja käyttökulun todentamisen kokonaisuutena. Tuontipalautteen näkyvyys korjattiin tässä vaiheessa, mutta kokonaisilmettä ei uudistettu.
