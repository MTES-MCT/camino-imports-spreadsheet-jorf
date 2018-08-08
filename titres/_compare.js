const chalk = require('chalk')
const fileCreate = require('../_utils/file-create')
const Json2csvParser = require('json2csv').Parser
const decamelize = require('decamelize')

const titreIdFind = (jorfTitre, titres) => {
  const ref = jorfTitre['ref_dgec']
  const t = titres.find(t => t.references.DGEC === ref)
  if (t) {
    return t.id
  } else {
    console.log(chalk.red.bold(`${ref}`))
  }
}

const compare = domaineId => {
  const exports = {
    titres: require(`../sources/titres-${domaineId}.json`),
    titresDemarches: require(`../sources/titres-${domaineId}-demarches.json`),
    titresEtapes: require(`../sources/titres-${domaineId}-etapes.json`),
    titresSubstances: require(`../sources/titres-${domaineId}-substances.json`),
    titresTitulaires: require(`../sources/titres-${domaineId}-titulaires.json`),
    titresEmprises: require(`../sources/titres-${domaineId}-emprises.json`),
    titresVerifications: require(`../sources/titres-${domaineId}-verifications.json`),
    titresPoints: require(`../sources/titres-${domaineId}-points.json`)
    // titresAmodiataires: require(`../sources/titres-${domaineId}-amodiataires.json`),
    // titresUtilisateurs: require(`../sources/titres-${domaineId}-utilisateurs.json`)
  }
  const jorfTitres = require(`../sources/titres-${domaineId}-jorf.json`)
  // jorfTitres.forEach(t => {
  //   const titreId = titreIdFind(t, exports.titres)
  //   console.log(titreId)
  //   if (!titreId) {
  //     //
  //   }
  //   const titre = {
  //     id: titreId,
  //     nom: t['titres.nom']
  //   }
  // })
  Object.keys(exports).forEach(e => {
    const json2csvParser = new Json2csvParser()
    const csvFileName = `exports/${domaineId}-${decamelize(e, '-')}.csv`
    const csvFileContent = json2csvParser.parse(exports[e])
    fileCreate(csvFileName, csvFileContent)
  })
}

module.exports = compare
