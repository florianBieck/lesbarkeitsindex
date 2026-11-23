# Lesbarkeitsindex (LÜ-LIX) selbst betreiben

Dieser Ordner enthält alles, was der Server braucht:

| Datei                | Zweck                                                          |
| -------------------- | -------------------------------------------------------------- |
| `docker-compose.yml` | startet die drei Dienste: Webserver (Caddy), Backend, R-Dienst |
| `Caddyfile`          | Einstellungen des Webservers; muss nicht angepasst werden      |
| `config.json`        | Standardkonfiguration der Berechnung und Links der Fußzeile    |
| `.env.example`       | Vorlage für die Datei `.env` mit der Domain                    |

## Voraussetzungen

- Ein Linux-Server (x86-64 oder ARM64) mit [Docker](https://docs.docker.com/engine/install/) samt Compose (`docker compose version` zeigt 2.24 oder neuer) und etwa 4 GB freiem Plattenplatz.
- Eine Domain, deren DNS-Eintrag auf den Server zeigt.
- Die Ports 80 und 443 sind aus dem Internet erreichbar. Darüber holt der Webserver das TLS-Zertifikat selbst und erneuert es.

## Starten

1. Diesen Ordner auf den Server kopieren, zum Beispiel nach `/opt/lesbarkeitsindex`.
2. Im Ordner die Vorlage kopieren und die Domain eintragen:

   ```sh
   cp .env.example .env
   nano .env        # DOMAIN=lesbarkeit.ihre-schule.de
   ```

3. Starten:

   ```sh
   docker compose up -d
   ```

Beim ersten Start lädt Docker rund 1 GB herunter. Danach braucht der R-Dienst etwa eine Minute, erst dann startet das Backend. `docker compose ps` zeigt den Stand; sobald alle drei Dienste laufen, ist das Werkzeug unter `https://<Ihre Domain>` erreichbar.

Die Dienste starten nach einem Neustart des Servers von selbst wieder.

## Auf eine neue Version aktualisieren

Die Version steht in der `docker-compose.yml` hinter den beiden Images (`…/backend:v1.0.0` und `…/r-sidecar:v1.0.0`).

1. Die `docker-compose.yml` durch die der neuen Version ersetzen. Sie liegt unter `https://github.com/florianBieck/lesbarkeitsindex/tree/<Version>/deploy`, zum Beispiel `…/tree/v1.1.0/deploy`. Liegt dort auch eine geänderte `Caddyfile`, diese ebenfalls ersetzen. Ihre `config.json` und Ihre `.env` bleiben, wie sie sind.
2. Die neue Version laden und starten:

   ```sh
   docker compose pull
   docker compose up -d --force-recreate
   ```

Das Werkzeug ist dabei für etwa eine Minute nicht erreichbar. Zurück zur alten Version geht es genauso mit der alten `docker-compose.yml`.

## Standardkonfiguration ändern

Die Datei `config.json` legt fest, womit das Werkzeug rechnet, solange jemand auf der Seite unter „Erweiterte Einstellungen“ nichts anderes einträgt:

| Eintrag                        | Bedeutung                                           | Standard |
| ------------------------------ | --------------------------------------------------- | -------- |
| `alpha`                        | Gewicht des Wortkomplexitäts-Zuschlags α (0 bis 10) | 0.3      |
| `weightComplexSyllables`       | Gewicht „komplexe Silben“                           | 50       |
| `weightMultiMemberedGraphemes` | Gewicht „mehrgliedrige Grapheme“                    | 25       |
| `weightRareGraphemes`          | Gewicht „seltene Grapheme“                          | 12.5     |
| `weightConsonantClusters`      | Gewicht „Konsonantencluster“                        | 12.5     |

Alle fünf Einträge müssen vorhanden sein. Dezimalzahlen stehen mit Punkt (`12.5`), nicht mit Komma. Die vier Gewichte müssen zusammen nicht 100 ergeben.

Die Datei bearbeiten und speichern, zum Beispiel mit `nano config.json`. Die Änderung gilt sofort für die nächste Berechnung; ein Neustart ist nicht nötig.

Ist die Datei fehlerhaft (ein Tippfehler, ein fehlender oder unbekannter Eintrag), rechnet das Werkzeug nicht, sondern zeigt auf der Seite eine Fehlermeldung. Was genau falsch ist, steht im Protokoll des Backends (siehe „Protokolle lesen“). Sobald die Datei wieder stimmt, läuft das Werkzeug weiter.

## Links zu Impressum und Datenschutzerklärung

Die Fußzeile der Seite zeigt zwei Links, sobald ihre Adressen in der `config.json` stehen. Die beiden Seiten selbst liegen bei Ihnen, das Werkzeug verlinkt sie nur.

```json
{
  "alpha": 0.3,
  "weightComplexSyllables": 50,
  "weightMultiMemberedGraphemes": 25,
  "weightRareGraphemes": 12.5,
  "weightConsonantClusters": 12.5,
  "impressumUrl": "https://www.ihre-schule.de/impressum",
  "datenschutzUrl": "https://www.ihre-schule.de/datenschutz"
}
```

Jede Adresse beginnt mit `https://` oder `http://`. Fehlt ein Eintrag, fehlt der zugehörige Link. Auf das Komma am Ende jeder Zeile außer der letzten achten.

## Protokolle lesen

```sh
docker compose ps                 # Laufen alle drei Dienste?
docker compose logs backend       # Backend, u. a. Fehler in der config.json
docker compose logs r-sidecar     # R-Dienst (Sprachanalyse)
docker compose logs caddy         # Webserver, u. a. das TLS-Zertifikat
```

`docker compose logs -f backend` zeigt neue Zeilen laufend an (beenden mit Strg+C).

## Anhalten

```sh
docker compose down
```

`docker compose up -d` startet wieder. Die Option `-v` bei `down` weglassen: Sie löscht auch das gespeicherte TLS-Zertifikat.

## Datenschutz: Texte werden nicht gespeichert

Das Werkzeug speichert und protokolliert die eingegebenen Texte nicht. Ein Text wird an den Server geschickt, dort im Arbeitsspeicher ausgewertet und danach verworfen; das Ergebnis geht nur an den Browser zurück, der es angefragt hat. Es gibt keine Datenbank, keine Benutzerkonten, keine Cookies und kein Zugriffsprotokoll. In den Protokollen stehen der Start der Dienste und Fehler, aber keine Texte und keine Ergebnisse.

Damit niemand den Server überlastet, zählt das Backend die Anfragen je IP-Adresse (höchstens 60 Berechnungen pro Minute). Diese Zählung liegt nur im Arbeitsspeicher und verfällt nach einer Minute.

Das Werkzeug lädt nichts von fremden Servern nach: Schriften, Skripte und Symbole kommen von Ihrer eigenen Domain.
