const chalk = require('chalk')
const titresSpreadsheetToJson = require('./_titres-spreadsheet-to-json')
const titresJsonMergeToCsv = require('./_titres-json-merge-to-csv.js')

module.exports = async (domaineId, dbSpreadsheetId, jorfSpreadsheetId) => {
  await Promise.all([
    await titresSpreadsheetToJson(
      dbSpreadsheetId,
      jorfSpreadsheetId,
      domaineId
    ),
    await titresJsonMergeToCsv(domaineId)
  ])
  console.log(chalk.green.bold(`Terminé: ${domaineId}`))
}
