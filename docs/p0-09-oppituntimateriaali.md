# P0-09: käyttöliittymä ja yhteinen tarkistuskomento

## Mitä tehtiin ja miksi?

Aiemmin kaikki toiminnot olivat samassa pitkässä käyttäjäpaneelissa. Nyt kirjautuminen on oma näkymänsä ja kirjautuneella käyttäjällä on neljä osiota: Yhteenveto, Tapahtumat, Tuo CSV ja Varmuuskopio. Muutos koskee olemassa olevan tiedon esittämistä, ei uusia talousominaisuuksia.

Yhteenvedossa menot ja muutos ovat pääluvut; tapahtumamäärä ja palautukset ovat lisätietoa. Menoryhmässä aiempi ja valittu summa esitetään pylväillä, mutta muutos on erillisessä kohdassa: ”30,00 € enemmän”, ”uusi meno · 15,00 €” tai ”ei muutosta”. Otsikko on Keskeiset muutokset. Vihreä erottaa nykyisen jakson ja kultainen korostaa tietoa; värit eivät arvota käyttäjän kulutusta.

Mittarimato on paikallinen brändikuva otsikossa ja tyhjän historian aloituksessa, ei talouden pistemäärä. Kirjautumissivun nimi ja kuva ovat suurempia etusivuotsikon tavoin; työtilan otsikko säilyy pienempänä. Käyttäjän antama minimal-niminen PNG kopioitiin projektiin muuttamatta alkuperäistä. Vanhoja oppituntimateriaaleja ei muokattu.

## Tärkeät tiedostot

| Tiedosto | Vastuu |
| --- | --- |
| [App.tsx](../frontend/src/App.tsx) | Kirjautumistila, aktiivinen osio ja käyttäjän paikallinen kanta. |
| [ApplicationNav.tsx](../frontend/src/components/ApplicationNav.tsx) | Osioiden painikkeet ja aktiivisen osion `aria-current`. |
| [TransactionHistory.tsx](../frontend/src/components/TransactionHistory.tsx) | Yhteinen jaksovalinta ja sivutus; joko yhteenveto tai tapahtumat. |
| [AnalysisPanel.tsx](../frontend/src/components/AnalysisPanel.tsx) | Valmiin analyysin päämuutos, vertailuvälit, eston syyt ja havainnot. |
| [CategoryComparison.tsx](../frontend/src/components/CategoryComparison.tsx) | Pylväiden yhteinen mittakaava ja erillinen muutosalue. |
| [format.ts](../frontend/src/components/format.ts) | Suomalaisten lukujen ja muutoksen sanallisen kuvauksen muotoilu. |
| [InfoHint.tsx](../frontend/src/components/InfoHint.tsx) | Palautusten lisätieto hiirelle, näppäimistölle ja napautukselle. |
| [InsightCard.tsx](../frontend/src/components/InsightCard.tsx) | Lyhyt havainto ja sen tarkempi selitys infossa. |
| [App.css](../frontend/src/App.css) | Asettelu, kultainen korostus ja mobiilin pinoutuminen. |
| [check.sh](../scripts/check.sh) | Yksi Docker-tarkistuskierros ja virheeseen pysähtyminen Bashilla. |

## Osio ja ajanjakso ovat eri tiloja

```tsx
const [section, setSection] = useState<AppSection>('overview')
```

`section` kertoo, mitä käyttäjä tekee. Historian `selectedImportId` kertoo, minkä jakson tietoja tarkastellaan. `useState` säilyttää käyttöliittymätilaa; se ei kirjoita IndexedDB:hen. Pythonista tuttu vertailukohta on toimintatilaa muistava muuttuja, mutta React myös piirtää näkymän uudelleen tilan muuttuessa.

Yksi TransactionHistory pysyy liitettynä React-puuhun ja piilotetaan tarvittaessa `hidden`-attribuutilla. Jos jokainen osio loisi uuden historian komponentin, sen sisäinen jaksovalinta voisi nollautua. Nyt yhteenvedon ja tapahtumien välillä vaihtaminen säilyttää jakson. Kirjautuminen tai sivun uudelleenavaus valitsee edelleen uusimman jakson kuten aiemmin. Piilotetut lomakkeet eivät jää näkyviin tai näppäimistön kohdistusjärjestykseen.

Navigointi käyttää tavallisia nimettyjä painikkeita, ei URL-reittejä. Tab siirtää kohdistusta ja Enter/Space aktivoi painikkeen. Paikallisen käsittelyn aikana navigointi ja uloskirjautuminen ovat estettyjä, jotta toiminnon palaute pysyy näkyvässä osiossa.

## Pylväs on esitys, ei uusi laskentasääntö

Domain antaa edelleen aiemman summan, nykyisen summan, euromuutoksen ja prosenttimuutoksen. Näkymä ei laske vaihtoehtoista talousraporttia.

```ts
const maximum = Math.max(1, ...categories.flatMap(
  (item) => [item.previous_cents, item.current_cents],
))
```

`flatMap` kerää kaikkien ryhmien molemmat summat yhteen listaan. `...` antaa listan jäsenet `Math.max`-funktion argumenteiksi. Suurin summa määrää yhteisen asteikon: pylvään leveys on `100 * cents / maximum` prosenttia. Vähintään 1 estää nollalla jakamisen kokonaan nollamenoisessa aineistossa.

Yhteinen asteikko estää 90 euron ja 15 euron palkkeja näyttämästä yhtä pitkiltä oman rivinsä erillisten asteikkojen vuoksi. Rahasummat ja sarjojen nimet näkyvät myös tekstinä. Näkymä järjestää kopion ryhmistä nykyisen menosumman mukaan eikä muuta domainin tulosta. Muutos on erillisessä sarakkeessa, puhelimessa pylväiden alapuolella.

Palautusten laskenta ei muuttunut: 100 € ostoksia ja 20 € palautuksia tarkoittaa edelleen 100 € menoja sekä 20 € palautuksia, ei 80 € menoja. Nollan arvoinen palautusrivi piilotetaan. Muutoskortissa euromuutos ja sanallinen prosenttimuutos ovat eri riveillä; vertailusumma nimetään ”Vertailujakson menot” ja sen vieressä näkyvät laskennassa käytetyt päivämäärät.

## Miksi info ei ole pelkkä hiiren päällä näkyvä title?

Pelkkä hover-tieto olisi vaikea löytää näppäimistöllä tai puhelimessa. InfoHint käyttää oikeaa painiketta ja tilaa: osoitin, kohdistus tai napautus avaa tiedon. Toinen napautus tai Escape sulkee sen. `aria-describedby` yhdistää painikkeen selitykseen ja `aria-expanded` kertoo näkyvyydestä. Näkyvä ympyrä on pieni, mutta kosketuskohde pysyy suurempana. Selitys ankkuroidaan omaan korttiinsa; `useLayoutEffect` mittaa sen ennen piirtämistä ja avaa tiedon tarvittaessa ylöspäin.

Havaintokortin otsikko kertoo muutoksen suoraan: ”Kokonaismenot pienenivät”, ”Ruokakauppa: menot kasvoivat” tai ”Uusi meno: Tilaukset”. Eurot ja mahdollinen prosentti tukevat havaintoa. Tarkempi havaintosääntö ja aiempi/nykyinen summa ovat infossa. Uuden menon kohdalla selitetään, että uutuus koskee kyseistä vertailuväliä, ei koko historiaa tai tunnistettua tilausta. Yleinen tulkintahuomautus on vertailun infossa; vain osajaksolle näkyy lyhyt huomio. Osajakso tunnistetaan ilmoitetuista kuukauden rajoista, ei ensimmäisestä tai viimeisestä ostoksesta.

## Tarkistukset yhdellä komennolla

```bash
bash scripts/check.sh
```

Skripti löytää projektikansion omasta sijainnistaan. Se tarkistaa Dockerin, rakentaa lukitut kuvat ja ajaa frontendin testit, tyyppitarkistuksen, lintin ja julkaisuversiokoosteen. Backendille se ajaa Alembicin migraatiot, tarkistaa mallien ja migraatioiden vastaavuuden sekä suorittaa testit.

PowerShell-versio korvattiin Bashilla käyttäjän työskentelytavan mukaisesti. `set -euo pipefail` pysäyttää käsittelemättömät komentovirheet, puuttuvien muuttujien käytön ja putkien virheet. `run_checked_docker` tarkistaa Dockerin paluukoodin myös itse, jotta virheviesti kertoo epäonnistuneen vaiheen. Virhe palauttaa exit-koodin 1 ja onnistuminen 0. Pelkkä komentolista voisi jatkaa virheen jälkeen ja näyttää lopuksi onnistumisen.

### Bash-skriptin lukeminen

1. `#!/usr/bin/env bash` kertoo skriptin komentotulkin. Komento `bash scripts/check.sh` valitsee Bashin myös suoraan.
2. `${BASH_SOURCE[0]}` antaa skriptin polun. `dirname` ja `cd` löytävät projektihakemiston; lainausmerkit säilyttävät myös välilyöntejä sisältävät polut yhtenä argumenttina. Skripti ajetaan omassa Bash-prosessissa, joten sen `cd` ei vaihda kutsuvan komentotulkin hakemistoa. Älä käytä `source`-komentoa tämän skriptin ajamiseen.
3. Funktiossa `$1` on vaiheen nimi. `shift` poistaa sen argumenttilistasta ja `"$@"` välittää loput Dockerille erillisinä argumentteina, ei yhtenä tekstijonona.
4. `if ...; then ...; else ...; fi` erottaa onnistumisen ja virheen. `$?` poimitaan heti epäonnistuneen Docker-kutsun jälkeen ennen muita komentoja. `>&2` ohjaa virheviestin stderr-virtaan.
5. `for task_check in test typecheck lint build` ajaa neljä frontend-tarkistusta järjestyksessä. Backendin `sh -c` saa yhden lainatun komentojonon, jonka `&&` pysäyttää seuraavat tarkistukset ensimmäiseen virheeseen.
6. `MSYS_NO_PATHCONV=1` koskee Docker-kutsua: Git Bash ei saa muuntaa kontin `/tmp`-polkua Windows-poluksi. `.gitattributes` säilyttää Bash-tiedostojen LF-rivinvaihdot Windows-checkoutissakin.

Migraatiot käyttävät poistuvan kontin `/tmp`-kantaa. Python-testit käyttävät omia tilapäisiä tai muistikantojaan; frontendin tallennustestit `fake-indexeddb`:tä. Tavallista käyttäjäkantaa ei migroida testikierroksessa eikä selainhistoriaa tyhjennetä. Node.js ja Python pysyvät konteissa; Python käyttää `uv`:ta. Selainkäyttötesti ei ole automaattisesti mukana eikä paikallinen skripti muuta GitLab-putkea.

## Tarkistusnäyttö

12.10.2026 Git Bashilla ajetussa Docker-tarkistuksessa frontendissä oli 171 hyväksyttyä testiä ja backendissä 9. Tyyppitarkistus, lint ja julkaisuversio onnistuivat. Migraatiot nousivat versioon 0002, ja `alembic check` ei löytänyt puuttuvia muutoksia. Bash-syntaksi tarkistettiin komennolla `bash -n scripts/check.sh`.

Dockerin testikorvikkeella simuloitiin exit-koodi 42 erikseen kaikissa kahdeksassa vaiheessa: kierros pysähtyi kyseiseen vaiheeseen, myöhemmät tarkistukset jäivät ajamatta ja skripti palautti 1. Onnistumisen testikorvike ajoi kaikki vaiheet ja palautti 0 myös projektihakemiston ulkopuolelta kutsuttaessa. Puuttuva Docker-komento pysäytti suorituksen ennen tarkistuksia. Testikorvike ei ajanut Dockeria tai kirjoittanut tiedostoja. Linux- ja macOS-isäntäympäristöjä ei testattu.

Selaintarkistus tehtiin Codexin sisäisessä Chromium-selaimessa erillisessä osoitteessa `http://127.0.0.1:5184`, fiktiivisen testikäyttäjän kannassa. Tilapäinen testisivu simuloi vain kirjautumisvastaukset; App, CSV-tuonti, laskenta ja IndexedDB olivat varsinaista toteutusta. Tämä tarkisti käyttöliittymää, ei korvannut backendin tunnistautumistestejä. Testiapurit poistettiin ennen commitointia.

Tarkistettiin tyhjän historian ohjaus tuontiin, neljän jakson luvut, valinnan säilyminen osioiden välillä, ensimmäisen jakson estynyt vertailu, virheellisen CSV:n paikallinen palaute, varmuuskopion oma osio, infon kohdistus ja Escape sekä klikkauksella avaaminen ja sulkeminen. Yhteenveto ja muutosrivit tarkistettiin myös 390 pikselin leveydessä ilman vaakavieritystä. Kirjautumisnäkymään siirtyminen ja paluu yhteenvetoon toimivat simuloiduilla kirjautumisvastauksilla.

## Koodinlukuharjoitukset

1. Etsi Appista `section`. Missä sitä käytetään näkymän valintaan ja missä ajanjakso valitaan erikseen?
2. Miksi `hidden` säilyttää komponentin tilan, mutta ehdollinen poistaminen voisi nollata sen?
3. Lue CategoryComparisonin `maximum`. Miksi siihen otetaan kaikkien ryhmien molemmat sarjat?
4. Mitkä InfoHintin tilat avaavat tiedon? Miten Escape sulkee sen kohdistusta siirtämättä?
5. Etsi check.sh:n `shift`, `"$@"` ja `$?`. Mitä Dockerille välitetään ja milloin virhekoodi talletetaan?

MVP:n rajat eivät muuttuneet laskennan tai tietojen käsittelyn osalta: ei toistuvuuden tunnistusta, vuoden yleiskuvaa, tuontien yhdistelyä tai taloustietojen palvelintallennusta. Tarkat rajaukset ovat [projektisuunnitelmassa](project-plan.md#mvpn-rajaukset).
