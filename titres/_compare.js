const chalk = require('chalk')
const fileCreate = require('../_utils/file-create')
const Json2csvParser = require('json2csv').Parser
const decamelize = require('decamelize')
const slugify = require('@sindresorhus/slugify')

// M/D/YYY vers YYYY-MM-DD
const dateFormat = input => {
  const arr = input
    .split('/')
    .map(i => i.padStart(2, '0'))
    .reverse()

  const tmp = arr[1]
  arr[1] = arr[2]
  arr[2] = tmp

  return arr.join('-')
}

// string M/D/YYY vers number YYYY
const dateYearCalc = str => Number(dateFormat(str).slice(0, 4))

const demarcheIsOctroi = titre =>
  titre['titres_demarches.demarche_id'] === 'prh-oct' ||
  titre['titres_demarches.demarche_id'] === 'cxx-oct' ||
  titre['titres_demarches.demarche_id'] === 'pxh-oct'

// trouve la démarche d'octroi correspondant à une démarche
const titreDemarcheOctroiFind = (titre, jorfTitres) =>
  // soit la démarche d'octroi avec la même ref existe
  jorfTitres.find(
    t => t['ref_dgec'] === titre['ref_dgec'] && demarcheIsOctroi(t)
  )
// soit on retourne la plus vieille démarche avec la même ref
// ||
// jorfTitres.reduce(
//   (acc, t) =>
//     t['ref_dgec'] === titre['ref_dgec'] &&
//     dateYearCalc(acc['dpu:titres_etapes.date']) >
//       dateYearCalc(t['dpu:titres_etapes.date'])
//       ? t
//       : acc,
//   titre
// )

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
      exports.titres.find(ti => {
        const ref =
          ti.references.DGEC.slice(0, 1) === 'C'
            ? ti.references.DGEC
            : ti.references.DGEC.slice(1)

        return ref === t['ref_dgec']
      }) || {}

    const tOctroi = demarcheIsOctroi(t)
      ? t
      : titreDemarcheOctroiFind(t, jorfTitres)

    const date = tOctroi
      ? dateFormat(tOctroi['dpu:titres_etapes.date'])
      : '0000'

    const dateYear = date.slice(0, 4)
    const titreId = slugify(
      `${domaineId}-${t['titres.type_id']}-${t['titres.nom']}-${dateYear}`
    )
    const demarcheId = t['titres_demarches.demarche_id']
    const titreDemarcheId = slugify(
      `${domaineId}-${demarcheId}-${t['titres.nom']}-${dateYear}`
    )

    const titreDemarche =
      exports.titresDemarches.find(td => td.id === titreDemarcheId) || {}

    titre.nom = t['titres.nom']
    titre.references = { DGEC: t['ref_dgec'] }
    titre.type_id = t['titres.type_id']
    titre.domaine_id = t['titres.domaine_id']
    titre.statut_id = 'ind'

    if (!titre.id) {
      if (demarcheIsOctroi(t)) {
        titre.id = titreId
        exports.titres.push(titre)
      }
    }

    titreDemarche.demarche_id = demarcheId
    titreDemarche.titre_id = titreId
    titreDemarche.demarche_statut_id = 'ind'
    titreDemarche.ordre = 0

    if (!titreDemarche.id) {
      // console.log(chalk.red.bold(`${titreDemarcheId}`))
      titreDemarche.id = titreDemarcheId
      exports.titresDemarches.push(titreDemarche)
    }
  })

  exports.titres.forEach(t => {
    const check = jorfTitres.find(ti => t.references.DGEC === ti['ref_dgec'])
    if (!check) {
      console.log(t.nom)
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
