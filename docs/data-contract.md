# Aineisto- ja laskentasopimus

Tekninen määrittely toteutusta ja testejä varten. Koskee yhtä kuvitteellista EUR-tiliä. Tietomalli on [arkkitehtuurikuvauksessa](architecture.md); tämä tiedosto määrittelee sen sisältösäännöt.

## CSV-tuonti

Tuetut tiedostot ovat UTF-8-tekstiä, niissä voi olla BOM ja niiden erotin on puolipiste. CSV-kirjasto käsittelee lainatut kentät, myös niiden sisäiset puolipisteet ja rivinvaihdot. Tyhjät tietueet ohitetaan. Virheellinen UTF-8 hylätään.

Muoto tunnistetaan koko otsikkorivistä. Tunnistus kertoo käytettävän sarakekartan, ei todista tiedoston lähettänyttä pankkia. Tuntematonta tai vain osittain täsmäävää otsikkoa ei arvata.

### Menomittarin demomuoto

Otsikko on täsmälleen `date;description;amount;kind`.

| Kenttä | Ehto |
| --- | --- |
| date | Kelvollinen YYYY-MM-DD-päivä |
| description | Reunavälit poistetaan, 1–200 merkkiä; esitetään aina tekstinä |
| amount | Valinnainen plus/miinus, numeroita, piste ja tasan kaksi desimaalia; ei tuhaterottimia |
| kind | expense: negatiivinen, income/refund: positiivinen, transfer: kumpikin etumerkki |

Nolla hylätään. Summan itseisarvo on enintään 1 000 000 euroa. Sentit muodostetaan merkkijonon kokonais- ja desimaaliosista, ei parseFloat(amount) * 100 -laskennalla; Number.isSafeInteger tarkistetaan. Pelkkä etumerkki ei tunnista palautusta tai tilisiirtoa, joten demomuodossa kind annetaan tiedostossa.

### S-Pankin tilitapahtumamuoto

Tunnettu otsikko on täsmälleen:

```text
Kirjauspäivä;Maksupäivä;Summa;Tapahtumalaji;Maksaja;Saajan nimi;Saajan tilinumero;Saajan BIC-tunnus;Viitenumero;Viesti;Arkistointitunnus
```

Sovitin käyttää kirjauspäivää suomalaisessa muodossa, esimerkiksi `2.6.2026` tai `02.06.2026`, ja muuntaa sen sisäiseen `YYYY-MM-DD`-muotoon. Summa luetaan suomalaisella desimaalipilkulla; etumerkkinä hyväksytään esimerkiksi `-12,50` ja `+2000,00`. Menon kuvaukseksi valitaan ensisijaisesti saajan nimi ja positiivisen tapahtuman kuvaukseksi maksaja; puuttuva nimi korvataan toisella osapuolella, viestillä tai tapahtumalajilla tässä järjestyksessä. Tilinumeroa, BIC-tunnusta, viitettä ja arkistointitunnusta ei tallenneta.

Negatiivinen summa muunnetaan menoksi ja positiivinen tuloksi. Pankin rakenne ei sisällä Menomittarin `kind`-arvoa, joten sovitin ei pysty vielä erottamaan palautusta tai käyttäjän omien tilien välistä siirtoa luotettavasti. MVP ei arvaa niitä tapahtumalajin tekstistä.

CSV on enintään 1 MiB ja 5 000 tapahtumaa. Kannassa saa olla enintään 10 000 tapahtumaa. Nämä ovat demon rajoja, eivät tietokannan kapasiteettiväitteitä. Koko tarkistetaan ennen tiedoston lukemista; tyhjä aineisto ja pelkkä otsikko hylätään.

Käyttäjä valitsee kokonaisen kalenterikuukauden, jonka oikeat alku- ja loppupäivät täytetään automaattisesti, tai antaa omat period_start- ja period_end-päivät, molemmat mukaan lukien. Alku ei saa ylittää loppua ja jokaisen tapahtuman kirjauspäivän tulee olla jakson sisällä. Jaksoa ei päätellä ostospäivistä. Käyttöohje edellyttää koko ilmoitetun jakson tuontia; sovellus ei voi todistaa tiedoston täydellisyyttä.

Koko aineisto validoidaan ennen tallennusta. Virhe ilmoittaa kentän ja tietuenumeron, ei koko sisältöä. Otsikko on tietue 1; tyhjät tietueet huomioidaan numeroinnissa, lainatun kentän sisäiset rivinvaihdot eivät kasvata numeroa. Tämä on myös source_row-kentän määritelmä.

Tuontijaksot eivät saa olla miltään osin päällekkäisiä. Saman tiedoston uudelleentuonti hylätään tällä säännöllä. Virheviesti nimeää sekä valitun jakson että yhden siihen osuvan tallennetun jakson ja kertoo, ettei MVP yhdistä tai korvaa tuonteja. Tuonnin sisäiset identtiset rivit säilyvät erillisinä ostoksina. Ei tapahtumakohtaista duplikaattien tunnistusta, osittaista yhdistelyä tai aiemman tuonnin korvaamista.

## Luokittelu

| Koodi | Nimi | Fiktiivinen kauppias |
| --- | --- | --- |
| groceries | Ruokakauppa | Demo Market |
| dining | Ravintolat | Demo Cafe |
| transport | Liikenne | Demo Bus |
| subscriptions | Tilaukset | Demo Stream |
| unknown | Tunnistamaton | Ei osumaa |

Vertailu poistaa reunavälit, tiivistää sisäiset välilyönnit ja ohittaa kirjainkoon. Koko nimen on täsmättävä, ei osittaista osumaa. Menot ja palautukset luokitellaan; income ja transfer saavat unknown-koodin. Luokitus tallennetaan eikä historiaa luokitella automaattisesti uudelleen. Tilaukset-osuma ei todista maksun toistuvuutta.

## Laskenta ja vertailu

Menot ovat expense-rivien summan vastaluku. Ryhmittely sisältää myös unknown-menot. Refund-rivien positiivinen summa näytetään erikseen, eikä sitä vähennetä menoista. Income ja transfer eivät kuulu menoihin tai havaintoihin. Rahat lasketaan sentteinä ja esitetään euroina.

Yhden kalenterikuukauden sisäinen valittu jakso vertautuu edelliskuukauden vastaavaan väliin. Esimerkiksi 1.–15.5. vertautuu 1.–15.4. ja 5.–15.5. vertautuu 5.–15.4. Jos valittu jakso kattaa koko kuukauden, vertailuväli kattaa koko edelliskuukauden: kesäkuun 30 päivää voi verrata toukokuun 31 päivään. Summia ei normalisoida päivien määrällä. Osajakson alku- ja loppupäivän on löydyttävä edelliskuukaudesta sellaisinaan: 1.–30.3. ei lyhene automaattisesti helmikuun 28 päiväksi. Kokonainen maaliskuu sen sijaan vertautuu koko helmikuuhun, myös karkausvuonna. Tammikuun vertailu käyttää edellisvuoden joulukuuta.

Kuukausivertailu vaatii yhden aiemman tuonnin, jonka ilmoitettu alku on viimeistään vertailuvälin alku ja loppu aikaisintaan vertailuvälin loppu. Tuonnin on päätyttävä ennen valittua jaksoa. Tapahtumat poimitaan tästä tuonnista kirjauspäivän perusteella vain vertailuväliltä, molemmat rajapäivät mukaan lukien. Tyhjä tapahtumaväli on nollameno vain, jos ilmoitettu kattavuus sisältää sen. Puuttuvaa kattavuutta ei korvata nollilla, vanhemmalla kuukaudella tai useita tuonteja yhdistelemällä. Tuontijärjestys ei vaikuta.

Kuukausivertailun estosyyt: unavailable_dates, jos vastaavia osajakson päivämääriä ei ole; muutoin no_baseline, jos aiempaa tuontia ei ole, tai incomplete_baseline, jos aiempia tuonteja on mutta yksikään ei kata koko vertailuväliä. Yhteenveto toimii myös vertailun estyessä.

Usean kuukauden yli ulottuva oma jakso säilyttää alkuperäisen säännön: vertailutuonti on ajallisesti lähin aiempi tuonti eli suurin period_end ennen valitun period_startia. Jaksojen pitää olla yhtä pitkiä ja suoraan peräkkäisiä. Estosyyt tarkistetaan järjestyksessä no_baseline, different_duration, gap. Päivälaskenta käyttää UTC-kalenteripäiviä, ei paikallisen aikavyöhykkeen kesäaikavaihteluita.

Muutos = nykyinen - aiempi. Prosentti = 100 × muutos / aiempi, pyöristettynä kahteen desimaaliin. Kun aiempi on nolla, prosentti on null.

## Havainnot

Vertailun estyessä lista on tyhjä. Muulloin kustakin säännöstä näytetään enintään yksi havainto, tässä järjestyksessä:

1. total_change: kokonaismenojen nollasta poikkeava muutos.
2. largest_category_increase: suurin positiivinen kategoriakasvu, kun aiempi meno on yli nolla.
3. new_category_spend: aiemmin nolla, nyt positiivinen; valitaan suurin nykyinen summa.

Tasatilanteessa valitaan aakkosissa pienin kategoriakoodi. Unknown on sallittu ja nimetään tunnistamattomiksi menoiksi. Havainnot käyttävät samaa rajattua aineistoa kuin vertailu. Näkymä näyttää todelliset laskentavälit, summat, muutoksen ja prosentit silloin kun ne ovat määriteltyjä, ei koko lähdetuonnin päivämääriä osajakson vertailuvälinä. Ne eivät väitä ostosten syytä, hinnankorotusta tai todellista säästöä; vuosiennusteita ei tehdä. Näkymä muistuttaa, että maksujen ajoitus voi vaikuttaa eroon ja kattavuus perustuu käyttäjän ilmoitukseen.

## Varmuuskopio

UTF-8 JSON: format_version: 1, exported_at: UTC-aikaleima, currency: "EUR", imports ja transactions. Taulukot sisältävät kaikki arkkitehtuurissa määritellyt tallennuskentät. Ei CSV-alkuperäistiedostoa, kategoriasääntöjä tai laskettuja raportteja. Vienti lukee molemmat taulut samassa lukutransaktiossa.

Kopio on salaamaton. Se ladataan tiedostona paikallisesti, ei palvelimelle. Palautus hyväksyy vain tyhjän kannan eikä korvaa olemassa olevaa historiaa.

Palautuksessa tarkistetaan ennen tallennusta: enintään 16 MiB, tuettu versio, EUR, kentät ja tyypit, UUID:t, aikaleimat, yksilölliset tunnisteet, viitteet sekä kaikki yllä kuvatut tapahtuma- ja jaksorajat. Ylimääräiset kentät ja tuntemattomat kategoriakoodit hylätään. Jokaisessa tuonnissa on 1–5 000 tapahtumaa ja yksilölliset source_row-kokonaisluvut vähintään 2. Jaksoissa ei saa olla päällekkäisyyttä.

Tyhjän historian kopio on sallittu. Palautus säilyttää tunnisteet ja luokitukset. Se onnistuu kokonaan tai ei lainkaan; tyhjyys tarkistetaan vielä kirjoitustransaktion sisällä. Virhe ei muuta kantaa.

## Demojen odotusarvot

Kaikki neljä CSV:tä ovat täysin fiktiivisiä ja sisältävät yhdeksän tapahtumaa. Tiedostot voi tuoda samalle uudelle demokäyttäjälle alla olevassa järjestyksessä ilman päällekkäisyyttä. Huhti–kesäkuussa valitaan kokonainen kuukausi, heinäkuussa oma ajanjakso 1.–15.7. Toukokuun tiedosto sisältää nyt tapahtuman 31.5., joten sen tuonti päättyen 30.5. hylätään.

| Tiedosto | Ilmoitettu kattavuus | Menot | Palautukset | Menot päiviltä 1–15 |
| --- | --- | ---: | ---: | ---: |
| [demo-2026-04.csv](../frontend/tests/fixtures/demo-2026-04.csv) | 1.–30.4.2026 | 90,00 € | 5,00 € | 75,00 € |
| [demo-2026-05.csv](../frontend/tests/fixtures/demo-2026-05.csv) | 1.–31.5.2026 | 145,00 € | 5,00 € | 125,00 € |
| [s-pankki-demo-2026-06.csv](../frontend/tests/fixtures/s-pankki-demo-2026-06.csv) | 1.–30.6.2026 | 125,00 € | 0,00 € | 95,00 € |
| [s-pankki-demo-2026-07-half.csv](../frontend/tests/fixtures/s-pankki-demo-2026-07-half.csv) | 1.–15.7.2026 | 90,00 € | 0,00 € | 90,00 € |

Jokaisessa on plusmerkkinen 2 000 euron tulo, viiden euron tunnistamaton Demo Kioski -meno sekä kaksi saman päivän samansuuruista Demo Market -ostosta. Kuukausidemot sisältävät menoja molemmilla puoliskoilla sekä ensimmäisenä ja viimeisenä päivänä. Heinäkuun osajakson rajapäivät ovat 1. ja 15.7. Rivit eivät ole aikajärjestyksessä, joten tapahtumanäkymän järjestäminen tulee myös esiin.

Demomuodossa on lisäksi yksi tilisiirto ja palautus kummassakin tiedostossa. S-Pankki-demoissa on vain menoja ja tuloja: ne eivät lupaa palautusten tai omien siirtojen tunnistusta. Desimaalipilkku, etunollalliset ja ilman etunollaa kirjoitetut päivät sekä viestistä saatava puuttuvan saajanimen korvike näkyvät pankkimuodossa. Arkistointitunnukset ja tilikentät ovat keksittyjä, eikä sovitin tallenna niitä.

Huhti–toukokuun tarkistuslaskelma:

| Tapahtumat euroina | Huhtikuu | Toukokuu |
| --- | ---: | ---: |
| Demo Market, expense | -30 ja -30 | -45 ja -45 |
| Demo Cafe, expense | -10 ja -10 | -20 ja -15 |
| Demo Bus, expense | -5 | Ei riviä |
| Demo Stream, expense | Ei riviä | -15 |
| Demo Kioski, expense | -5 | -5 |
| Demo Salary, income | +2000 | +2000 |
| Demo Transfer, transfer | -100 | -100 |
| Demo Market, refund | +5 | +5 |

Marketin kaksi menoriviä ovat kummassakin tiedostossa identtisiä myös päivämäärältään. CSV-summat kirjoitetaan sovitussa muodossa, esimerkiksi -30.00.

Odotus: menot 90,00 → 145,00 euroa ja palautukset 5,00 euroa molemmissa. Havainnot: kokonaismuutos +55,00 euroa / +61,11 %, Ruokakauppa +30,00 euroa / +50 % ja uusi Tilaukset-meno 15,00 euroa. Palautetun varmuuskopion tulee antaa samat tulokset.

Kesäkuun kokonaiset menot pienenevät toukokuusta 20,00 euroa / 13,79 %. Heinäkuun osajakso vertautuu sen sijaan vain kesäkuun päiviin 1–15: 95,00 → 90,00 euroa, muutos −5,00 euroa / −5,26 %. Kesäkuun 16.–30. päivän menot, yhteensä 30,00 euroa, jäävät tästä vertailusta pois mutta säilyvät historiassa.

| Osajakson menoryhmä | 1.–15.6. | 1.–15.7. |
| --- | ---: | ---: |
| Ruokakauppa | 60,00 € | 50,00 € |
| Ravintolat | 20,00 € | 15,00 € |
| Tilaukset | 15,00 € | 15,00 € |
| Liikenne | 0,00 € | 5,00 € |
| Tunnistamattomat | 0,00 € | 5,00 € |

Osajakson havainnot ovat kokonaismenojen pienentyminen sekä uusi Liikenne-meno. Liikenne ja Tunnistamattomat ovat tasatilanteessa; kategoriakoodi transport voittaa unknown-koodin. Uusi meno tarkoittaa tässä uutta kyseisellä vertailuvälillä, ei ettei koko historiassa olisi koskaan ollut kyseisen ryhmän menoja.

Pienet aineistot osoittavat tuonnin, ryhmittelyn ja vertailun toimintaa, eivät oikean pankkiaineiston kattavaa tukea tai säännöllisten kulujen tunnistusta. Harvinaisemmat virhe- ja kokorajatilanteet testataan erillisillä testisyötteillä, ei paisuttamalla esittelytiedostoja.

Aiemmin tuotuja demoja ei korvata tai täydennetä automaattisesti. Koko päivitetty esittelypolku kannattaa kokeilla uudella fiktiivisellä demokäyttäjällä: vanhan jakson uudelleentuonti estyy, eikä käyttäjän historiaa tarvitse poistaa. Neljän onnistuneen tuonnin jälkeen kannassa on 4 tuontia ja 36 tapahtumaa. Heinäkuun koko kuukauden tuonti osajakson päälle hylätään, ja viesti nimeää jo tallennetun välin 1.–15.7.
