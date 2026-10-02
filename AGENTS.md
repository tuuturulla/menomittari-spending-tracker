# Agentin työohje

Koskee vain lopputyo/menomittari-kansiota. Git-repositoryn juuri on sara_pyky_web-ohjelmointi, jossa on myös kurssiharjoituksia. Älä muuta harjoituksia. Tämä on projektin ainoa agenttikohtainen ohjetiedosto.

## Ehdoton main-suoja

- Älä committoi, yhdistä, cherry-pickaa tai puske mainiin äläkä siirrä sen viitettä muullakaan tavalla.
- Kielto koskee myös etäpalvelun rajapintoja, mainiin osoittavia refspecejä, kaikkien haarojen pushia, peilausta, MR:n hyväksymistä/yhdistämistä ja automergeä.
- Käyttäjä lukee muutokset ja suorittaa yhdistämisen itse. Testitulokset, itsenäinen työskentely tai yleinen commitointilupa eivät korvaa tätä.
- Älä muuta tai kierrä haarasuojausta. Ohjetiedosto ei ole tekninen esto; GitLabin suojausta ei ole todennettu tai asetettu tämän dokumentin perusteella.

## Aloitus

1. Lue README.md, docs/project-plan.md ja docs/backlog.md. Lue toteutettavaan tehtävään liittyvät docs/architecture.md, docs/data-contract.md ja docs/api.md. Paikalliset muistiinpanot eivät ole vaatimuksia.
2. Tarkista git rev-parse --show-toplevel, git status --short --branch, git diff --cached ja git worktree list. Kirjaa lähtöcommit ja tarkista aiempi toteutus.
3. Toteuta vain toimeksiannon tehtävät. Backlog ei ole lupa aloittaa kaikkea, ajastaa työtä, julkaista tai hankkia maksullisia palveluita. Ristiriita käyttäjän muutoksen tai tuotepäätöksen kanssa selvitetään ennen siihen perustuvaa toteutusta.

## Haara ja oikeudet

Käytä tehtävähaaraa, esimerkiksi menomittari/p0-01-runko. Tarkista nimen vapaus. Älä korvaa olemassa olevaa haaraa tai stäshää, nollaa tai committoi muiden muutoksia. Samaan tehtävään kuuluvat muutokset voi säilyttää luomalla uuden haaran nykyisessä työpuussa mainin viitettä muuttamatta.

Rinnakkaiseen tai taustalla tehtävään työhön käytä erillistä worktreetä kurssirepositoryn ulkopuolella. Committoimattomat muutokset eivät siirry siihen; käytä hyväksyttyä commitoitua lähtötilaa. Älä poista worktreetä tai haaraa automaattisesti.

Agentti saa tehdä committeja tarkistetulle aktiiviselle tehtävähaaralle ilman erillistä lupaa, kun muutokset kuuluvat käyttäjän antamaan toimeksiantoon. Tee pieniä, loogisia committeja, jotta historia pysyy selkeänä ja muutosten syyt ovat jäljitettävissä. Yksi commit käsittelee yhtä kokonaisuutta; erota toisistaan itsenäisesti tarkastettavat toteutus-, testi- ja dokumentaatiomuutokset, mutta älä pilko tiiviisti yhteen kuuluvaa muutosta keinotekoisesti.

Lisää stageen vain nimetyt tehtävätiedostot, ei koko repositoryn `git add .` -komentoa. Tarkista koko staged-diff ennen committia ja aja muutoksen laajuuteen sopivat tarkistukset. Säilytä kehityscommitit; älä muuta vanhoja committeja tai force-pushaa. Tehtävähaaran push tarvitsee erillisen luvan, ja kohteen on oltava tarkistettu tehtävähaara, ei main. MR:n voi valmistella vain toimeksiannon rajoissa. Käyttäjä tarkistaa ja yhdistää tehtävähaaran mainiin.

## Toteutus ja seuranta

1. Valitse sallituista tehtävistä ensimmäinen Ei aloitettu, jonka riippuvuudet ovat Valmis. Hyväksytyssä usean tehtävän yhteishaarassa testattu Tarkistettavana-riippuvuus riittää, jos toteutus on mukana samassa haarassa.
2. Merkitse tehtävä Työn alla. Toteuta vain sen hyväksymisehdot, testit ja tarvittavat dokumentaatiopäivitykset.
3. Aja tehtävän testit ja vaikutusalueen regressiotestit. P0-01 lisää README:hen oikeasti todennetut komennot; älä keksi myöhemmissä tehtävissä testaustuloksia.
4. Merkitse testattu työ Tarkistettavana. Estynyt-tilaan kirjataan täsmällinen este. Valmis edellyttää käyttäjän hyväksyntää ja todennettua yhdistämistä mainiin.
5. Pidä julkinen backlog tiiviinä: päivitä tehtävän tila ja hyväksymisehdot, mutta jätä haara-, commit- ja työpäiväkirjat Git-historiaan. Lopeta toimeksiannon rajaan.
6. Commitoi tarkistettu työ tehtävähaaralle loogisina kokonaisuuksina ja luovuta käyttäjälle tiedostot, testitulokset sekä commit-tunnisteet. Älä pushaa ilman erillistä lupaa. Mainiin ei tehdä committeja tai tilapäivityksiä; käyttäjä tarkistaa ja yhdistää tehtävähaaran itse.

## Koodikommentit

- Kommentoi tärkeät työvaiheet, komponenttien vastuut ja vaikeasti pääteltävät ratkaisut selkeällä englannilla. Kommentin tulee auttaa tekijää muistamaan myöhemmin, mitä osa tekee, ja antaa tarkastajalle nopeasti oikea asiayhteys.
- Kerro ensisijaisesti tarkoitus tai syy. Älä toista kommentissa suoraan sitä, minkä yksittäinen koodirivi jo ilmaisee.
- Pidä kommentointi maltillisena: käytä lyhyitä kommentteja kokonaisuuksien, rajapintojen ja olennaisten rajoitteiden kohdalla, älä jokaisella rivillä.
- Päivitä tai poista kommentti samalla, kun sitä kuvaava toteutus muuttuu. Vanhentunut kommentti on virheellistä dokumentaatiota.

## Toteutuksen suojarajat

- Pino ja scope ovat projektisuunnitelmassa. Backend rajataan käyttäjätileihin ja palvelinpuolisiin istuntoihin. Älä lisää taloustietojen palvelintallennusta, yleistä repository-kehystä tai roadmap-ominaisuuksia varmuuden vuoksi.
- Domain-laskenta ei tuo Reactia, Dexietä, IndexedDB:tä tai selain-API:a. Säilytä arkkitehtuurikuvauksen osarajat.
- Käytä vain fiktiivistä aineistoa. Ei tapahtumia, summia, kuvauksia, kategorioita, analyysejä tai raakaa CSV:tä backendin pyyntöihin, palvelintietokantaan, lokeihin, analytiikkaan tai AI-palveluun. Ei ulkoisia ajonaikaisia skriptejä tai CDN-fontteja.
- Testit käyttävät omaa tietokantaa ja selainprofiilia. Älä tyhjennä käyttäjän historiaa. Worktree ei eristä IndexedDB:tä: pidä työtilojen osoitteet/portit erillään ja yhden työtilan portti vakaana (Vite strictPort, vain loopback).
- .local-notes/ on versionhallinnan ulkopuolista taustaa, ei riippuvuus sovelluksen ajamiselle tai toteuttamiselle. Älä lisää sitä Gitiin edes force-addilla. Pysyvät päätökset kuuluvat dokumentaatioon, todennetut työtulokset backlogiin.
- Älä poista vanhoja kansioita tarkistamatta niiden nykyistä sisältöä. 
