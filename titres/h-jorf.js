const chalk = require('chalk')
const path = require('path')
const spreadsheetToJson = require('../_utils/spreadsheet-to-json')
const jorfDateConvertToCsv = require('./_jorf-date-convert-to-csv')
const domaineId = 'h'
const jorfSpreadsheetId = '1h_tqp4i9hByh1KtdFmAsGephlH8Sg4phpoKbm2T97XU'

const filePathCreate = name =>
  path.join(__dirname, `../sources/${name.replace(/_/g, '-')}.json`)

module.exports = async () => {
  await Promise.all([
    await spreadsheetToJson(
      filePathCreate(`titres_${domaineId}-jorf`),
      jorfSpreadsheetId,
      `${domaineId}`
    ),
    await jorfDateConvertToCsv(domaineId)
  ])
  console.log(chalk.green.bold(`done !`))
}
