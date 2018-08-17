# Camino imports spreadsheet jorf

Scripts pour convertir les données sur les titres miniers publiées au JORF (au format `.gsheet`) en fichiers csv.

- Les fichiers sources sont importés depuis une google spreadsheet, convertis au format `.json` et placés dans le dossier `/sources`.
- Les fichiers transformés sont enrgeistrés au format `.csv` dans le dossier `/exports`.

```bash
# installation
npm i

# imports des fichiers depuis les spreadheets
# converti le contenu en fichiers .json
# transforme le contenu et crée des fichiers .csv
npm run titres-h
```
