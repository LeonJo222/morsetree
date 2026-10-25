# MorseTree

Interaktiver Morsecode-Trainer als Progressive Web App. Der klassische Morse-Binärbaum wird im Leiterplatten-Look dargestellt: Kupferbahnen, LED-Knoten, grüne und rote Leuchtpfade.

## Funktionen

- **Baum:** Knoten antippen spielt den Code ab und lässt den Pfad Schritt für Schritt aufleuchten. Ziehen zum Verschieben, zwei Finger oder Mausrad zum Zoomen.
- **Morsetaste:** Eine Taste wie bei einer echten Handtaste. Die Haltedauer entscheidet über Punkt oder Strich (Grenze einstellbar, Standard 200 ms). Der Ton klingt, solange die Taste gedrückt ist. Am Desktop dient die Leertaste als Morsetaste.
- **Übung:** Buchstabe → Code, Wort → Code oder Hören → Code, mit Hinweis, Trefferzähler und Serie.
- **Nachschlagen:** Text eingeben, Code als Liste sehen und mit korrektem Timing abspielen (Zeichenabstand 3, Wortabstand 7 Einheiten).
- **Einstellungen:** Baum-Ausrichtung (Strich links / Punkt links), Tonfrequenz 500–900 Hz, Punktlänge mit WpM-Anzeige nach PARIS-Norm, Lautstärke, Ziffern-Ebene, Umlaute und CH.
- **Offline:** Nach dem ersten Aufruf läuft die App ohne Netz. Auf Android über Chrome → „App installieren“ als eigene App mit Icon.

## Aufbau

```
src/            Quelldateien (index.html, manifest.webmanifest, sw.js)
build.js        kopiert src/ nach public/ und rendert die App-Icons als PNG (Node, keine Abhängigkeiten)
vercel.json     Build- und Header-Konfiguration für Vercel
.github/        Workflow für GitHub Pages
```

Lokal bauen und testen:

```bash
node build.js
npx serve public
```

## Deployment

- **Vercel:** Repo importieren. Build-Befehl und Ausgabeordner kommen aus `vercel.json`.
- **GitHub Pages:** Unter Settings → Pages die Quelle auf „GitHub Actions“ stellen. Jeder Push auf `main` baut und veröffentlicht automatisch.

Alle Pfade sind relativ, die App läuft daher unter `/` ebenso wie unter `/morsetree/`.

## Lizenz

MIT, siehe [LICENSE](LICENSE).
