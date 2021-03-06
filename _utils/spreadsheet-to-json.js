const spreadSheetToJson = require('google-spreadsheet-to-json')
const credentials = require('../config/credentials')
const fileCreate = require('./file-create')

module.exports = async (filePath, spreadsheetId, worksheet, cb) => {
  try {
    console.log(`Spreadsheet: ${filePath}`)
    let json = await spreadSheetToJson({
      spreadsheetId,
      credentials,
      worksheet
    })

    if (cb) {
      json = cb(json)
    }

    const fileContent = JSON.stringify(json, null, 2)

    await fileCreate(filePath, fileContent)
  } catch (err) {
    console.log(err)
  }
}
