# Menomittari - kurssiprojekti

Menomittari on pieni full stack -sovellus toistuvien menojen hallintaan. Käyttajä voi luoda tilin, kirjautua sisään ja hallita omia kuukausittaisia tai vuosittaisia menojaan.

Tama repository sisaltaa vain harjoitusprojektin rajauksen. Laajemmat tuoteideat, brändi ja tulevaisuuden roadmap ovat erillisessa yksityisessa projektissa.

## Toiminnallisuus

- rekisteröityminen, kirjautuminen ja uloskirjautuminen
- omien toistuvien menojen lisaaminen, katselu, muokkaus ja poisto
- kuukausi- ja vuosikustannusten yhteenveto
- tulevien maksujen näkymä

## Teknologiat

- React + TypeScript + Vite
- Python + FastAPI
- MariaDB
- Docker Compose
- Git ja GitLab

## Projektirakenne

```text
frontend/             React-kayttoliittyma
backend/              FastAPI-sovellus
database/migrations/  tietokantamuutokset
tests/                automaattitestit
docs/                 suunnitelma ja API-kuvaus
```

## Dokumentaatio

- [Projektisuunnitelma](docs/project-plan.md)
- [API-luonnos](docs/api.md)

## Tila

Suunnittelu valmis. Seuraava toteutusvaihe on projektin tekninen pystytys ja ensimmainen tietokantamigraatio.
