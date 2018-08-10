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

const refExists = (refSource, refJorf) => {
  const f = refSource.slice(0, 1)
  const ref =
    f === 'D' || f === 'E' || f === 'M' || f === 'N' || f === 'P'
      ? refSource.slice(1)
      : refSource

  return ref === refJorf
}

const logTitresWithNoSource = []
const logTitresWithASource = []

const log = () => {
  console.log(
    chalk.red.bold(
      `${logTitresWithNoSource
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos)
        .join('\n')}`
    )
  )

  console.log(
    chalk.green.bold(
      `${logTitresWithASource
        .filter((elem, pos, arr) => arr.indexOf(elem) === pos)
        .join('\n')}`
    )
  )
}

const compare = async domaineId => {
  const jorfTitres = require(`../sources/titres-${domaineId}-jorf.json`)

  const sources = {
    titres: require(`../sources/titres-${domaineId}.json`),
    titresDemarches: require(`../sources/titres-${domaineId}-demarches.json`),
    titresEtapes: require(`../sources/titres-${domaineId}-etapes.json`),
    titresSubstances: require(`../sources/titres-${domaineId}-substances.json`),
    titresTitulaires: require(`../sources/titres-${domaineId}-titulaires.json`),
    titresEmprises: require(`../sources/titres-${domaineId}-emprises.json`),
    titresVerifications: require(`../sources/titres-${domaineId}-verifications.json`),
    titresPoints: require(`../sources/titres-${domaineId}-points.json`),
    titresAmodiataires: require(`../sources/titres-${domaineId}-amodiataires.json`),
    titresUtilisateurs: require(`../sources/titres-${domaineId}-utilisateurs.json`)
  }

  const exports = {
    titres: [],
    titresDemarches: [],
    titresEtapes: []
    // titresSubstances: [],
    // titresTitulaires: [],
    // titresEmprises: [],
    // titresVerifications: [],
    // titresPoints: []
    // titresAmodiataires: [],
    // titresUtilisateurs: []
  }

  jorfTitres.forEach(t => {
    const titre = {}
    const titreDemarche = {}
    const titreDemarcheEtapes = []

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

    const sourceTitre = sources.titres.find(source =>
      refExists(source.references.DGEC, t['ref_dgec'])
    )

    const sourceTitreDemarche = sourceTitre
      ? sources.titresDemarches.find(
          td => td.titre_id === sourceTitre.id && td.demarche_id === demarcheId
        )
      : null

    titre.id = titreId
    titre.nom = t['titres.nom']
    titre.type_id = t['titres.type_id']
    titre.domaine_id = t['titres.domaine_id']
    titre.statut_id = 'ind'
    titre.references = { DGEC: t['ref_dgec'] }
    titreDemarche.id = titreDemarcheId
    titreDemarche.demarche_id = demarcheId
    titreDemarche.titre_id = titreId
    titreDemarche.demarche_statut_id = 'ind'
    titreDemarche.ordre = 0

    if (!sourceTitre) {
      logTitresWithNoSource.push(titreId)
    } else {
      logTitresWithASource.push(titreId)
    }

    if (t['dpu:titres_etapes.date']) {
      titreDemarcheEtapes.push({
        id: `${titreDemarcheId}-dpu`,
        demarche_id: demarcheId,
        etape_id: 'dpu',
        etape_statut_id: t['dpu:dex:dim:titres_etapes.etape_statut_id'],
        date: dateFormat(t['dpu:titres_etapes.date'])
      })
    }

    if (t['dex:titres_etapes.date']) {
      const tde = {
        id: `${titreDemarcheId}-dex`,
        demarche_id: demarcheId,
        etape_id: 'dex',
        etape_statut_id: t['dpu:dex:dim:titres_etapes.etape_statut_id'],
        date: dateFormat(t['dex:titres_etapes.date'])
      }

      if (t['dex:titres_etapes.duree']) {
        tde.duree = t['dex:titres_etapes.duree']
      }

      if (t['dex:dim:titres_etapes.echeance']) {
        tde.echeance = t['dex:dim:titres_etapes.echeance']
      }

      if (t['dex:titres_etapes.surface']) {
        tde.surface = t['dex:titres_etapes.surface']
      }

      if (t['dex:titres_etapes.volume_extrait_autorise']) {
        tde.surface = t['dex:titres_etapes.volume_extrait_autorise']
      }

      if (t['dex:titres_etapes.engagement_financier']) {
        tde.surface = t['dex:titres_etapes.engagement_financier']
      }

      if (t['dex:titres_etapes.engagement_financier_devise']) {
        tde.surface = t['dex:titres_etapes.engagement_financier_devise']
      }

      titreDemarcheEtapes.push(tde)
    }

    if (demarcheIsOctroi(t)) {
      exports.titres.push(titre)
    }
    exports.titresDemarches.push(titreDemarche)
    titreDemarcheEtapes.forEach(e => {
      exports.titresEtapes.push(e)
    })
  })

  sources.titres.forEach(t => {
    const check = jorfTitres.find(ti =>
      refExists(t.references.DGEC, ti['ref_dgec'])
    )
    if (!check) {
      console.log(t.nom)
    }
  })

  await Promise.all([
    ...Object.keys(exports).map(async e => {
      const json2csvParser = new Json2csvParser({ quote: '' })
      const csvFileName = `exports/${domaineId}-${decamelize(e, '-')}.csv`
      const csvFileContent = json2csvParser.parse(exports[e])
      await fileCreate(csvFileName, csvFileContent)
    })
  ])

  // log()
}

module.exports = compare
