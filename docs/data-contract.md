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

Käyttäjä antaa period_start- ja period_end-päivät, molemmat mukaan lukien. Alku ei saa ylittää loppua ja jokaisen tapahtuman kirjauspäivän tulee olla jakson sisällä. Jaksoa ei päätellä ostospäivistä. Käyttöohje edellyttää koko jakson tuontia; sovellus ei voi todistaa tiedoston täydellisyyttä.

Koko aineisto validoidaan ennen tallennusta. Virhe ilmoittaa kentän ja tietuenumeron, ei koko sisältöä. Otsikko on tietue 1; tyhjät tietueet huomioidaan numeroinnissa, lainatun kentän sisäiset rivinvaihdot eivät kasvata numeroa. Tämä on myös source_row-kentän määritelmä.

Tuontijaksot eivät saa olla miltään osin päällekkäisiä. Saman tiedoston uudelleentuonti hylätään tällä säännöllä. Tuonnin sisäiset identtiset rivit säilyvät erillisinä ostoksina. Ei osittaista yhdistelyä tai aiemman tuonnin korvaamista.

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

Vertailujakso on ajallisesti lähin aiempi tuonti: suurin period_end ennen valitun period_startia. Tuontijärjestys ei vaikuta. Päivälaskenta käyttää kalenteripäiviä, ei paikallisen aikavyöhykkeen kesäaikavaihteluita.

Vertailu edellyttää yhtä pitkiä, peräkkäisiä jaksoja. Estävä syy tarkistetaan järjestyksessä no_baseline, different_duration, gap. Yhteenveto toimii myös vertailun estyessä. Eri pituisten kuukausien normalisointia ei tehdä.

Muutos = nykyinen - aiempi. Prosentti = 100 × muutos / aiempi, pyöristettynä kahteen desimaaliin. Kun aiempi on nolla, prosentti on null.

## Havainnot

Vertailun estyessä lista on tyhjä. Muulloin kustakin säännöstä näytetään enintään yksi havainto, tässä järjestyksessä:

1. total_change: kokonaismenojen nollasta poikkeava muutos.
2. largest_category_increase: suurin positiivinen kategoriakasvu, kun aiempi meno on yli nolla.
3. new_category_spend: aiemmin nolla, nyt positiivinen; valitaan suurin nykyinen summa.

Tasatilanteessa valitaan aakkosissa pienin kategoriakoodi. Unknown on sallittu ja nimetään tunnistamattomiksi menoiksi. Havainnot näyttävät jaksot, summat, muutoksen ja prosentit silloin kun ne ovat määriteltyjä. Ne eivät väitä ostosten syytä, hinnankorotusta tai todellista säästöä; vuosiennusteita ei tehdä.

## Varmuuskopio

UTF-8 JSON: format_version: 1, exported_at: UTC-aikaleima, currency: "EUR", imports ja transactions. Taulukot sisältävät kaikki arkkitehtuurissa määritellyt tallennuskentät. Ei CSV-alkuperäistiedostoa, kategoriasääntöjä tai laskettuja raportteja. Vienti lukee molemmat taulut samassa lukutransaktiossa.

Kopio on salaamaton. Se ladataan tiedostona paikallisesti, ei palvelimelle. Palautus hyväksyy vain tyhjän kannan eikä korvaa olemassa olevaa historiaa.

Palautuksessa tarkistetaan ennen tallennusta: enintään 16 MiB, tuettu versio, EUR, kentät ja tyypit, UUID:t, aikaleimat, yksilölliset tunnisteet, viitteet sekä kaikki yllä kuvatut tapahtuma- ja jaksorajat. Ylimääräiset kentät ja tuntemattomat kategoriakoodit hylätään. Jokaisessa tuonnissa on 1–5 000 tapahtumaa ja yksilölliset source_row-kokonaisluvut vähintään 2. Jaksoissa ei saa olla päällekkäisyyttä.

Tyhjän historian kopio on sallittu. Palautus säilyttää tunnisteet ja luokitukset. Se onnistuu kokonaan tai ei lainkaan; tyhjyys tarkistetaan vielä kirjoitustransaktion sisällä. Virhe ei muuta kantaa.

## Demojen odotusarvot

P0-05 tuottaa jaksot 2026-04-01–2026-04-30 ja 2026-05-01–2026-05-30, kumpikin 30 päivää.

| Tapahtumat euroina | Huhtikuu | Toukokuu |
| --- | ---: | ---: |
| Demo Market, expense | -30 ja -30 | -45 ja -45 |
| Demo Cafe, expense | -20 | -40 |
| Demo Bus, expense | -10 | Ei riviä |
| Demo Stream, expense | Ei riviä | -15 |
| Demo Salary, income | +2000 | +2000 |
| Demo Transfer, transfer | -100 | -100 |
| Demo Market, refund | +5 | +5 |

Marketin kaksi menoriviä ovat kummassakin tiedostossa identtisiä myös päivämäärältään. Kaikki päivät osuvat omalle jaksolleen. CSV-summat kirjoitetaan sovitussa muodossa, esimerkiksi -30.00.

Odotus: menot 90,00 → 145,00 euroa ja palautukset 5,00 euroa molemmissa. Havainnot: kokonaismuutos +55,00 euroa / +61,11 %, Ruokakauppa +30,00 euroa / +50 % ja uusi Tilaukset-meno 15,00 euroa. Palautetun varmuuskopion tulee antaa samat tulokset.
