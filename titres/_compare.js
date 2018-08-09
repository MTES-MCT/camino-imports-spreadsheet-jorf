const chalk = require('chalk')
const fileCreate = require('../_utils/file-create')
const Json2csvParser = require('json2csv').Parser
const decamelize = require('decamelize')
const slugify = require('@sindresorhus/slugify')

const dateReverse = input => {
  const arr = input
    .split('/')
    .map(i => i.padStart(2, '0'))
    .reverse()

  const tmp = arr[1]
  arr[1] = arr[2]
  arr[2] = tmp

  return arr.join('-')
}

const compare = domaineId => {
  const jorfTitres = require(`../sources/titres-${domaineId}-jorf.json`)

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

  jorfTitres.forEach(t => {
    const titre =
      exports.titres.find(ti => ti.references.DGEC === t['ref_dgec']) || {}
    const date = dateReverse(t['dpu:titres_etapes.date'])
    const dateYear = date.slice(0, 4)
    const titreId = slugify(
      `${domaineId}-${t['titres.type_id']}-${t['titres.nom']}-${dateYear}`
    )

    const demarcheIsOctroi =
      t['titres_demarches.demarche_id'] === 'prh-oct' ||
      t['titres_demarches.demarche_id'] === 'cxx-oct' ||
      t['titres_demarches.demarche_id'] === 'pxh-oct'

    titre.nom = t['titres.nom']
    titre.references = { DGEC: t['ref_dgec'] }
    titre.type_id = t['titres.type_id']
    titre.domaine_id = t['titres.domaine_id']
    titre.statut_id = 'ind'

    if (!titre.id) {
      if (demarcheIsOctroi) {
        titre.id = titreId
        exports.titres.push(titre)
      }
    }
  })

  Object.keys(exports).forEach(e => {
    const json2csvParser = new Json2csvParser()
    const csvFileName = `exports/${domaineId}-${decamelize(e, '-')}.csv`
    const csvFileContent = json2csvParser.parse(exports[e])
    fileCreate(csvFileName, csvFileContent)
  })
}

module.exports = compare
