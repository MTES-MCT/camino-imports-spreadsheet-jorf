const chalk = require('chalk')
const titresSpreadsheetToJson = require('./_titres-spreadsheet-to-json')
const titresJsonMergeToCsv = require('./_titres-json-merge-to-csv.js')
const domaineId = 'h'
const dbSpreadsheetId = '1ROInBEn06q1zvsw88kUFvtsz4yyXsHnF8hDSSPNoYw0'
const jorfSpreadsheetId = '1h_tqp4i9hByh1KtdFmAsGephlH8Sg4phpoKbm2T97XU'

module.exports = async () => {
  await Promise.all([
    await titresSpreadsheetToJson(
      dbSpreadsheetId,
      jorfSpreadsheetId,
      domaineId
    ),
    await titresJsonMergeToCsv(domaineId)
  ])
  console.log(chalk.green.bold(`done !`))
}
