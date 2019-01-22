const chalk = require('chalk');

const titresSpreadsheetToJsonAndMergeToCsv = require('./_titres-spreadsheet-tojson-and-merge-to-csv')
const domaines = [
  {
    id: 'h',
    dbSpreadsheetId: '1ROInBEn06q1zvsw88kUFvtsz4yyXsHnF8hDSSPNoYw0'
  }
]

const jorfSpreadsheetId = '1h_tqp4i9hByh1KtdFmAsGephlH8Sg4phpoKbm2T97XU'

module.exports = async () => {
  await Promise.all([
    ...domaines.map(async domaine =>
      titresSpreadsheetToJsonAndMergeToCsv(
        domaine.id,
        domaine.dbSpreadsheetId,
        jorfSpreadsheetId
      )
    )
  ])
  console.log(chalk.green.bold(`Terminé.`))
}
