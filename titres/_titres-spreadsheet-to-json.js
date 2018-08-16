const path = require('path')
const spreadsheetToJson = require('../_utils/spreadsheet-to-json')

const filePathCreate = name =>
  path.join(__dirname, `../sources/${name.replace(/_/g, '-')}.json`)

const titresCb = json =>
  json.map(j =>
    Object.keys(j).reduce((res, cur) => {
      res[cur] = cur === 'references' ? JSON.parse(j[cur]) : j[cur]
      return res
    }, {})
  )

const tables = [
  { name: '', cb: titresCb },
  { name: '_demarches', cb: null },
  { name: '_etapes', cb: null },
  { name: '_points', cb: null },
  { name: '_substances', cb: null },
  { name: '_titulaires', cb: null },
  { name: '_amodiataires', cb: null },
  { name: '_utilisateurs', cb: null },
  { name: '_emprises', cb: null },
  { name: '_verifications', cb: null }
]

module.exports = async (dbSpreadsheetId, jorfSpreadsheetId, domaineId) => {
  await Promise.all([
    spreadsheetToJson(
      filePathCreate(`titres_${domaineId}-jorf`),
      jorfSpreadsheetId,
      `${domaineId}`
    ),
    ...tables.map(t => {
      return spreadsheetToJson(
        filePathCreate(`titres_${domaineId}${t.name}`),
        dbSpreadsheetId,
        `titres${t.name}`,
        t.cb
      )
    })
  ])
}
