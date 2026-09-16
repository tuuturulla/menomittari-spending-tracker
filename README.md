# Menomittari

Menomittari on kurssityönä toteutettava selainsovellus, joka auttaa ymmärtämään omaa rahankäyttöä. Se ryhmittelee menot, vertaa kahta ajanjaksoa ja näyttää, mikä kulutuksessa muuttui.

## Näin sovellusta käytetään

1. Tuo sovellukseen esimerkkitiedosto ja anna sen ajanjakso.
2. Tarkastele tapahtumia ja menoja ryhmittäin.
3. Tuo toinen jakso ja katso muutokset aiempaan verrattuna.
4. Lataa tarvittaessa varmuuskopio. Sen voi palauttaa tyhjään sovellukseen toisessa selaimessa.

Ensimmäinen versio käyttää vain keksittyjä tapahtumia ja yhtä sovittua taulukkomuotoista tekstitiedostoa (CSV). Se ei vielä lue pankkien omia tiliotteita eikä ole valmis oikeiden taloustietojen käsittelyyn.

## Missä tiedot säilyvät?

Tiedostot käsitellään ja historia tallennetaan omassa selaimessa. Tätä kutsutaan local-first-toteutukseksi. Tapahtumia ei lähetetä palvelimelle.

Tiedot eivät siirry automaattisesti toiselle laitteelle. Selaimen sivustotietojen poistaminen voi poistaa historian, joten varmuuskopio kannattaa ladata. Kurssiversion varmuuskopio ei ole salattu.

## Projektin tila

Projekti on suunnitteluvaiheessa. Sovellusta ei vielä voi käynnistää; asennus- ja käyttöohjeet lisätään toteutuksen ensimmäisessä vaiheessa. Toteutuskansiot ovat toistaiseksi tyhjiä.

## Dokumentaatio

| Tiedosto | Sisältö |
| --- | --- |
| [Projektisuunnitelma](docs/project-plan.md) | Tavoite, kurssityön rajaus, aikataulu ja teknologiat |
| [Työlista](docs/backlog.md) | Toteutusjärjestys ja valmistumisen ehdot |
| [Arkkitehtuuri](docs/architecture.md) | Tekninen rakenne ja tallennus |
| [Aineisto ja laskenta](docs/data-contract.md) | Tiedostomuoto, laskentasäännöt ja testien odotusarvot |
| [Sovelluksen sisäiset toiminnot](docs/api.md) | Tekninen kuvaus osien välisestä tiedonkulusta |
| [Agenttiohje](AGENTS.md) | Tekoälyavustajan työskentely ja rajatut oikeudet |
