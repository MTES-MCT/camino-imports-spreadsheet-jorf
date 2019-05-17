const Json2csvParser = require('json2csv').Parser
const fileCreate = require('../_utils/file-create')

const jsonToCsv = async (fileName, jsonFileContent) => {
  const json2csvParser = new Json2csvParser()

  if (!jsonFileContent.length)
    console.log('empty:', fileName)

  const csvFileContent = json2csvParser.parse(jsonFileContent)
  await fileCreate(fileName, csvFileContent)
}

module.exports = jsonToCsv
