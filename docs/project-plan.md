# Projektisuunnitelma

## Tarkoitus

Menomittari on pienimuotoinen harjoitusprojekti. Se on pieni mutta kokonainen sovellus, jossa kayttäjä hallitsee omia toistuvia menojaan.

## Tavoite

Käyttäjä pystyy:

- rekisteröitymään ja kirjautumaan sisään
- lisäämään toistuvan menon
- selaamaan omia menojaan
- muokkaamaan ja poistamaan menon
- näkemaan menoista lasketun kuukausi- ja vuosikustannuksen
- näkemaan seuraavat maksut

## Tekninen toteutus

- Kayttöliittymä: React, TypeScript ja Vite
- Palvelin: Python ja FastAPI
- Tietokanta: MariaDB
- Paikallinen ajo: Docker Compose
- Versionhallinta: Git ja GitLab

## Tietomallit

Alkuun otetaan vain seuraavat taulut:

- `users`
- `categories`
- `recurring_expenses`

Jokaisella kayttajakohtaisella tiedolla on `user_id`. Rahasummat tallennetaan sentteinä kokonaislukuina, jotta laskenta pysyy tarkkana.

## Rajaus

Projektiin ei toteuteta CSV-tuontia, automaattista kulujen tunnistusta, AI-toimintoja, mobiilisovellusta tai maksullisuutta tässä vaiheessa.


## Valmiin projektin kriteerit

- sovellusta voi kayttaa alusta loppuun ilman suoraa tietokantakayttöä
- kayttäjä näkee vain oman datansa
- perustestit menevat läpi
- sovellus käynnistyy yhdellä paikallisella kehityskokonaisuudella
- README kertoo käynnistyksen, testauksen ja esittelyn olennaiset vaiheet

## Jatkettavuus

Kayttöliittymä kommunikoi vain REST API:n kanssa, liiketoimintalogiikka sijaitsee backendissa ja tietokantamuutokset tehdaan migraatioina. Tällä rakenteella sovellusta voi myöhemmin laajentaa ilman, etta laajennuksia tarvii toteuttaa kurssityössä. 
