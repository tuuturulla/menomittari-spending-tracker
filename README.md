# Menomittari - kurssiprojekti

Menomittari on pieni full stack -kurssiprojekti, jonka ydinidea on auttaa käyttäjää ymmärtämään, mihin rahat menevät. Ensimmäinen toteutus pidetään tarkoituksella hyvin pienenä: käyttäjä tuo tilioteaineiston itse, sovellus ryhmittelee tapahtumia, näyttää kulutuksen yhteenvedon, vertaa kahta aineistoa keskenään ja nostaa esiin muutaman yksinkertaisen havainnon.

Tämä repository sisältää vain kurssiprojektin rajatun MVP-version. Laajempi tuoteajatus, pidempi historiatulkinta ja mahdolliset pankki-integraatiot jatkokehitetään myöhemmin.

## Mitä kurssiprojektiin tehdään nyt

- CSV-muotoinen tiliotteen tuonti yhdelle käyttäjälle
- tapahtumien tallennus ja listaus
- yksinkertainen luokittelu kauppias- tai kategoriatasolle
- yhteenveto: mihin rahat menivät tässä aineistossa
- vertailu nykyisen ja edellisen tuonnin välillä
- muutama sääntöpohjainen havainto, esimerkiksi suurin kulukasvu, uusi kulutuskohde tai poikkeavan kallis kategoria

## Mitä ei rakenneta vielä

- Open Banking -integraatiot
- automaattisesti oppiva baseline tai pidemmän aikavälin käyttäytymismalli
- recurring-maksujen varma tunnistus
- hinnankorotus- tai kampanjamuistutukset
- automaattiset säästöoptimoinnit tai AI-suositukset
- monimutkainen monen käyttäjän tuotetaso

## Teknologiat

- React + TypeScript + Vite
- Python + FastAPI
- SQLite
- SQLAlchemy ja Alembic
- Docker Compose
- Git ja GitLab

## Projektirakenne

```text
frontend/             React-käyttöliittymä
backend/              FastAPI-sovellus
database/migrations/  tietokantamuutokset
tests/                automaattitestit
docs/                 suunnitelma ja API-kuvaus
```

## Dokumentaatio

- [Projektisuunnitelma](docs/project-plan.md)
- [API-luonnos](docs/api.md)

## Tila

Suunnitelma päivitetty uuteen MVP-rajaukseen. Seuraava toteutusvaihe on pystyttää tietomalli tuonneille ja tapahtumille sekä rakentaa ensin yksinkertainen analyysinäkymä.
