# P0-07: vertailu ja havainnot – työseloste ja oppituntimateriaali

## Tavoite ja lopputulos

P0-07 vertaa valittua kulujaksoa sitä ajallisesti lähimpään aiempaan tuontiin. Käyttäjä näkee kokonaismenojen ja menoryhmien muutokset sekä enintään kolme sääntöihin perustuvaa havaintoa. Jos jaksot eivät ole yhtä pitkiä ja peräkkäisiä, sovellus kertoo syyn. Valitun jakson P0-06-yhteenveto näkyy silloinkin.

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
| [summary.ts](../frontend/src/domain/summary.ts) | Laskee kummankin jakson menot samalla P0-06-säännöllä |
| [repository.ts](../frontend/src/storage/repository.ts) | Lukee molemmat IndexedDB:n object storet samassa lukutransaktiossa |
| [analysis.ts](../frontend/src/application/analysis.ts) | Tarkistaa tunnisteen, hakee aineiston ja palauttaa onnistumis- tai virhetuloksen |
| [TransactionHistory.tsx](../frontend/src/components/TransactionHistory.tsx) | Pyytää analyysin valinnan vaihtuessa ja hylkää vanhentuneen lataustuloksen |
| [AnalysisPanel.tsx](../frontend/src/components/AnalysisPanel.tsx) | Näyttää vertailun tai selkeän estosyyn ilman omaa laskentalogiikkaa |
| [format.ts](../frontend/src/components/format.ts) | Muuntaa sentit euroiksi ja ISO-päivät suomalaiseen esitysmuotoon |

Sama nimi `analysis.ts` kahdessa kansiossa tarkoittaa eri vastuuta: `domain` osaa laskea mutta ei lue tietokantaa; `application` kokoaa tietokantaluvun ja laskennan yhdeksi käyttöliittymän kutsuttavaksi toiminnoksi. Python-vertauksena domain on tavallinen laskentafunktio ja application sitä kutsuva palvelufunktio.

## Miten vertailujakso valitaan?

[findBaseline](../frontend/src/domain/analysis.ts) etsii kaikista tuonneista sellaisen, jonka loppupäivä on ennen valitun jakson alkupäivää. Näistä valitaan **suurin loppupäivä** eli ajallisesti lähin aiempi jakso. Tiedostojen tuontijärjestys ei vaikuta.

Esimerkiksi jos tammikuun, helmikuun ja maaliskuun tiedostot tuotiin järjestyksessä maaliskuu → tammikuu → helmikuu, maaliskuuta verrataan silti helmikuuhun. Vertailu ei valitse viimeksi tuotua tiedostoa.

Sen jälkeen tarkistetaan tässä järjestyksessä:

1. `no_baseline`: aiempaa jaksoa ei löytynyt.
2. `different_duration`: jaksoissa on eri määrä kalenteripäiviä.
3. `gap`: aiempi päättyy liian aikaisin, joten jaksojen väliin jää päiviä.

Päiväluku sisältää sekä alkamis- että päättymispäivän: `loppu − alku + 1`. Päivät muunnetaan UTC-kalenteripäiviksi, jotta kesäajan kellonsiirto ei tekisi yhtä päivää 23- tai 25-tuntiseksi laskennassa. Demojen huhtikuu `1.4.–30.4.` ja toukokuu `1.5.–30.5.` ovat molemmat 30 päivän pituisia ja peräkkäisiä. Kokonaista kalenterikuukautta ei tässä vaadita.

Jos vertailu estyy, `comparison.totals` on `null`, kategoriavertailu ja havainnot ovat tyhjiä. Valitun jakson `summary` lasketaan ennen estotarkistuksia, joten yhteenveto säilyy näkyvissä.

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

## Mitä testattiin?

- [analysis.test.ts](../frontend/src/domain/analysis.test.ts) tarkistaa demoarvot sekä yhden jakson, väärän tuontijärjestyksen, eri pituudet, välin, nollasta alkavan prosentin, muuttumattomuuden ja tasatilanteen.
- [analysis.test.ts](../frontend/src/application/analysis.test.ts) tarkistaa virheellisen tai puuttuvan tuontitunnisteen ja tallennusvirheen.
- [analysis.integration.test.ts](../frontend/src/application/analysis.integration.test.ts) tuo kaksi fiktiivistä CSV:tä `fake-indexeddb`-kantaan ja tarkistaa tuloksen koko tallennuspolun läpi.
- [AnalysisPanel.test.tsx](../frontend/src/components/AnalysisPanel.test.tsx) tarkistaa estosyyn sekä jaksojen, summien, etumerkin ja määrittelemättömän prosentin esityksen.

Tarkistuskomennot projektikansiossa:

```powershell
docker compose run --rm frontend pnpm test
docker compose run --rm frontend pnpm typecheck
docker compose run --rm frontend pnpm lint
docker compose run --rm frontend pnpm build
```

## Kokeile itse

1. Tuo [huhtikuun demo](../frontend/tests/fixtures/demo-2026-04.csv) jaksolle `2026-04-01–2026-04-30`. Yhteenveto näyttää 90 euroa; vertailussa lukee, ettei aiempaa jaksoa ole.
2. Tuo [toukokuun demo](../frontend/tests/fixtures/demo-2026-05.csv) jaksolle `2026-05-01–2026-05-30`. Tarkista 145 euroa, vertailu huhtikuuhun ja kolme havaintoa.
3. Vaihda valintaa huhti- ja toukokuun välillä. Sivutus ei muuta vertailua, koska se vaikuttaa vain näkyviin tapahtumariveihin.
4. Lue [change](../frontend/src/domain/analysis.ts)-funktion neljä palautettua kenttää ja etsi niitä vastaavat tekstit [AnalysisPanelista](../frontend/src/components/AnalysisPanel.tsx). Kysy itseltäsi: mistä aiempi summa tulee, mistä nykyinen, missä sentti muuttuu euroksi?

Käytä vain fiktiivisiä demoja. P0-08:ssa tehdään varmuuskopio ja kirjataan koko sovelluksen käyttötesti oikeassa selaimessa, myös 390 pikselin näkymässä. P0-07 ei lisää kaavioita, kuukausien pituuden normalisointia eikä palvelinpuolista analyysiä.
