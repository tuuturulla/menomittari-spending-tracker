# Käynnistyksen ja tarkistusten toistettavuus

## Tarkistettu ympäristö

12.10.2026: Windows, Git Bash, Docker Engine 27.1.1 ja Docker Compose 2.29.1. Testattava lähdekoodi oli versio `09a1d36`. Käynnistys- ja tarkistuskomennot ovat [README:ssa](../README.md#käynnistäminen).

Projektista tehtiin puhdas kopio `git archive` -komennolla: mukana olivat vain versionhallinnan tiedostot, eivät paikalliset riippuvuudet, `.env`, tietokannat tai muistiinpanot. Docker-projektilla oli uudet riippuvuus- ja tietokantavolumet. Dockerin olemassa olevaa rakennusvälimuistia käytettiin; kyse ei ollut täysin tyhjästä Docker-asennuksesta tai uudesta koneesta.

## Tulokset

| Tarkistus | Tulos |
| --- | --- |
| Kuvien rakennus ja `bash scripts/check.sh` | Onnistui puhtaasta projektikopiosta. |
| Frontend | 171 testiä 22 testitiedostossa; tyyppitarkistus, lint ja build onnistuivat. |
| Backend | 9 testiä; testikannan migraatiot versioon 0002 ja `alembic check` onnistuivat. |
| Tyhjän sovelluskannan alustus | README:n migraatiokomento onnistui uuteen Docker-volumeen. |
| Palvelujen käynnistys | Molemmat palvelut käynnistyivät `docker compose up -d` -komennolla. |
| HTTP-tarkistus | Frontend palautti HTTP 200:n ja backend `{status: "ok"}`. |
| Käyttäjätili | Fiktiivisen tilin CSRF, rekisteröinti, kirjautuminen ja istunnon luku onnistuivat HTTP-rajapinnassa. |
| Mukana tarvittavat tiedostot | Neljä demo-CSV:tä, maskottikuva, Dockerfilet, asetukset ja lukitustiedostot olivat kopiossa. |

Käynnistystestissä käytettiin erillistä Compose-projektia ja loopback-portteja 5186/8006, jotta tavallisen sovelluksen portteihin tai tietokantaan ei koskettu. Vain testikopion portit, CORS-osoite ja frontendin API-osoite muutettiin tätä eristystä varten. Projektin oletusosoitteet ovat edelleen 5173/8000.

## Tarkistuksen rajat

- Tämä kierros varmisti tiedostojen riittävyyden, automaattiset tarkistukset, HTTP-käynnistyksen ja tunnistautumisen. Se ei ollut uusi koko käyttöliittymän selainkäyttötesti.
- Käyttöliittymän tuonti- ja palautuskokeilut ovat [P0-08-käyttötestissä](p0-08-kayttotesti.md); P0-09:n esitystavan tarkistus on sen [työselosteessa](p0-09-oppituntimateriaali.md#tarkistusnäyttö).
- Linux- ja macOS-isäntäympäristöjä sekä täysin välimuistitonta rakennusta ei testattu. Ensimmäinen rakennus tarvitsee verkkoyhteyden kuvien ja riippuvuuksien hakemiseen.
