const titresSpreadsheetToJson = require('./_titres-spreadsheet-to-json')
const compare = require('./_compare.js')
const type = 'h'
const dbSpreadsheetId = '1ROInBEn06q1zvsw88kUFvtsz4yyXsHnF8hDSSPNoYw0'
const jorfSpreadsheetId = '1h_tqp4i9hByh1KtdFmAsGephlH8Sg4phpoKbm2T97XU'

module.exports = async () => {
  // await titresSpreadsheetToJson(dbSpreadsheetId, jorfSpreadsheetId, type)
  compare(type)
}
