# Projektisuunnitelma

## Tarkoitus

Menomittari on pienimuotoinen harjoitusprojekti, jossa käyttäjä saa nopean vastauksen kysymykseen: mihin rahat menevät. Kurssiversio ei yritä ratkaista koko henkilökohtaisen taloudenhallinnan kenttää, vaan toteuttaa pienen analyysityökalun, joka toimii manuaalisesti ladatun tilioteaineiston päällä.

## Ydinkonsepti

Kurssiprojektin ajatus tiivistyy kolmeen vaiheeseen:

1. tunnista, mihin rahat menevät
2. vertaa uutta aineistoa aiempaan aineistoon
3. nosta esiin muutama säästö- tai huomiohavainto

Tarkoitus ei ole rakentaa vielä aidosti "älykästä" talousvalmentajaa, vaan siisti ensimmäinen versio, josta on helppo jatkaa myöhemmin.

## Tavoite

Käyttäjä pystyy:

- tuomaan CSV-muotoisen tiliotteen sovellukseen
- selaamaan aineiston tapahtumia
- näkemään kulutuksen yhteenvedon kategorioittain tai kauppiaittain
- vertaamaan uusinta tuontia edelliseen tuontiin
- näkemään muutaman yksinkertaisen havainnon kulutuksen muutoksista

## Kurssiprojektin MVP-rajaus

Tähän toteutukseen otetaan vain ominaisuudet, jotka ehtii tehdä luotettavasti parissa opiskelupäivässä:

- yksi kevyt käyttäjävirta tai vaihtoehtoisesti demokäyttäjä ilman laajaa tunnistautumislogiikkaa
- CSV-tuonti valmiiksi tunnetulla tiliotepohjalla
- tapahtumien perustallennus tietokantaan
- kevyt luokittelu ennalta määritellyillä säännöillä
- analyysin etusivu, joka näyttää:
  - kokonaiskulut
  - suurimmat kategoriat tai kauppiaat
  - uusimman tuonnin erot edelliseen tuontiin
  - 2-3 havaintoa sääntöpohjaisesti

## Mitä jätetään myöhemmäksi

Seuraavat ominaisuudet sopivat hyvin jatkopoluksi, mutta ne eivät kuulu kurssin ensimmäiseen toteutukseen:

- pidempi historiallinen baseline käyttäjän normaalille kulutukselle
- käyttäytymismuutosten tarkempi tunnistus usean kuukauden yli
- recurring-maksujen automaattinen tunnistus ja seuranta
- hinnankorotusten tunnistus
- kampanjoiden tai sopimusten päättymismuistutukset
- konkreettiset säästöehdotukset, kuten palvelujen päällekkäisyydet
- useiden pankkien tai tilien tuki
- Open Banking -integraatiot
- AI-pohjainen tulkinta tai keskusteleva avustaja

## Tekninen toteutus

- Käyttöliittymä: React, TypeScript ja Vite
- Palvelin: Python ja FastAPI
- Tietokanta: SQLite
- Tietokantakerros: SQLAlchemy ja Alembic
- Paikallinen ajo: Docker Compose
- Versionhallinta: Git ja GitLab

SQLite on kurssiversion ja ensimmäisen pilotin kevyt tietokanta. SQLAlchemy erottaa sovelluslogiikan tietokannasta, ja Alembic tallentaa tietokantarakenteen muutokset migraatioiksi. Kun sovellus kasvaa usean käyttäjän palveluksi, tietokanta voidaan vaihtaa PostgreSQL:ään ilman sovelluslogiikan uudelleenkirjoitusta.

## Tietomallit

Alkuun riittävät seuraavat taulut:

- `users` tai vaihtoehtoisesti yksinkertainen demo-user-ratkaisu
- `imports`
- `transactions`
- `categories`
- `merchant_rules` tai muu hyvin kevyt luokittelusääntöjen rakenne

Keskeinen ajatus on, että analyysi rakentuu yksittäisistä tapahtumista, ei vain käsin syötetyistä kuukausimaksuista. Rahasummat tallennetaan sentteinä kokonaislukuina, jotta laskenta pysyy tarkkana.

## Arkkitehtuurin jatkopolku

Kurssiversio kannattaa suunnitella niin, että myöhemmät laajennukset istuvat samaan malliin ilman uudelleenkirjoitusta:

- `imports` mahdollistaa aineiston vertailun eri ajankohtien välillä
- `transactions` toimii pohjana baseline-analyysille, recurring-tunnistukselle ja hinnanmuutoksille
- luokittelusäännöt voi myöhemmin korvata paremmalla tunnistuksella
- sääntöpohjaiset havainnot voi myöhemmin korvata rikkaammalla insights-kerroksella
- CSV-tuonti voidaan myöhemmin vaihtaa Open Banking -syötteeseen ilman, että analyysin perusmalli muuttuu

### Muistisääntö: tietokantariippumaton sovelluskoodi

Sovelluskoodi ei saa olla riippuvainen SQLite:stä. Tietokantayhteys ja -asetukset pidetään yhdessä paikassa, mallit ja kyselyt tehdään SQLAlchemyllä, ja rakenteen muutokset tehdään Alembic-migraatioina. SQLite-kohtaista SQL:ää, tiedostopolkuja tai ominaisuuksia ei käytetä sovelluslogiikassa. Näin PostgreSQL voidaan ottaa käyttöön myöhemmin vaihtamalla yhteysasetus ja ajamalla samat migraatiot.

## Valmiin projektin kriteerit

- käyttäjä saa tuotua ainakin yhden tunnetun CSV-aineiston onnistuneesti
- sovellus tallentaa tapahtumat ja näyttää ne käyttöliittymässä
- sovellus tuottaa yhteenvedon siitä, mihin rahat menivät
- jos aineistoja on vähintään kaksi, sovellus näyttää yksinkertaisen vertailun niiden välillä
- sovellus nostaa esiin ainakin muutaman selitettävän havainnon
- perustestit menevät läpi
- README kertoo käynnistyksen, rajauksen ja esittelyn olennaiset vaiheet
