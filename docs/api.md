# API-luonnos

Kaikki sovelluksen reitit alkavat polulla `/api`.

## Tunnistautuminen

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| POST | `/api/auth/register` | Luo uuden käyttäjän. |
| POST | `/api/auth/login` | Kirjaa käyttäjän sisaan. |
| POST | `/api/auth/logout` | Kirjaa käyttäjän ulos. |
| GET | `/api/auth/me` | Palauttaa kirjautuneen käyttäjän tiedot. |

## Kategoriat

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| GET | `/api/categories` | Palauttaa menokategoriat. |

## Toistuvat menot

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| GET | `/api/expenses` | Palauttaa kirjautuneen käyttäjän menot. |
| POST | `/api/expenses` | Luo uuden menon. |
| GET | `/api/expenses/{id}` | Palauttaa yhden menon. |
| PATCH | `/api/expenses/{id}` | Paivittaa menon. |
| DELETE | `/api/expenses/{id}` | Poistaa menon. |

## Yhteenvedot

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| GET | `/api/summary` | Palauttaa kuukausi- ja vuosikustannukset. |
| GET | `/api/upcoming` | Palauttaa seuraavat maksupaivat. |
