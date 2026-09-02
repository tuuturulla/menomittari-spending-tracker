# API-luonnos

Kaikki sovelluksen reitit alkavat polulla `/api`.

## Tunnistautuminen

Tunnistautuminen pidetään kurssiversiossa mahdollisimman kevyenä. Jos toteutus tehdään demokäyttäjällä, tätä osaa ei tarvitse rakentaa laajana.

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| POST | `/api/auth/register` | Luo uuden käyttäjän, jos tunnistautuminen pidetään mukana. |
| POST | `/api/auth/login` | Kirjaa käyttäjän sisään, jos tunnistautuminen pidetään mukana. |
| POST | `/api/auth/logout` | Kirjaa käyttäjän ulos. |
| GET | `/api/auth/me` | Palauttaa aktiivisen käyttäjän tiedot. |

## Tuonnit

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| GET | `/api/imports` | Palauttaa käyttäjän aiemmat tuonnit. |
| POST | `/api/imports` | Luo uuden tuonnin ja käsittelee CSV-aineiston. |
| GET | `/api/imports/{id}` | Palauttaa yhden tuonnin perustiedot. |

## Tapahtumat

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| GET | `/api/transactions` | Palauttaa tapahtumat, tarvittaessa suodatettuna tuonnin mukaan. |
| GET | `/api/transactions/{id}` | Palauttaa yhden tapahtuman tiedot. |
| PATCH | `/api/transactions/{id}` | Päivittää esimerkiksi kategorian tai nimen. |

## Kategoriat

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| GET | `/api/categories` | Palauttaa käytettävät kategoriat. |

## Analyysi

| Metodi | Reitti | Tarkoitus |
| --- | --- | --- |
| GET | `/api/summary/latest` | Palauttaa uusimman tuonnin kuluyhteenvedon. |
| GET | `/api/comparison/latest` | Vertaa uusinta tuontia edelliseen tuontiin. |
| GET | `/api/insights/latest` | Palauttaa sääntöpohjaiset havainnot uusimmasta aineistosta. |

## Mahdollinen myöhempi laajennus

Myöhemmin samaa API-rakennetta voi laajentaa recurring-tunnistukseen, hinnanmuutoshavaintoihin, muistutuksiin ja Open Banking -datalähteisiin ilman, että perusreitit menevät uusiksi.
