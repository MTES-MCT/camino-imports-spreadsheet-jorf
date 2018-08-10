const spreadSheetToJson = require('google-spreadsheet-to-json')
const credentials = require('../config/credentials')
const fileCreate = require('./file-create')
const path = require('path')

module.exports = async (spreadsheetId, fileName, worksheet, cb) => {
  try {
    console.log(`Spreadsheet: ${fileName}`)
    let json = await spreadSheetToJson({
      spreadsheetId,
      credentials,
      worksheet
    })

    if (cb) {
      json = cb(json)
    }

    const fileContent = JSON.stringify(json, null, 2)
    const filePath = path.join(
      __dirname,
      `../sources/${fileName.replace(/_/g, '-')}.json`
    )

    await fileCreate(filePath, fileContent)
  } catch (err) {
    console.log(err)
  }
}
