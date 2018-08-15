const chalk = require('chalk')
const fileCreate = require('../_utils/file-create')
const Json2csvParser = require('json2csv').Parser
const decamelize = require('decamelize')
const slugify = require('@sindresorhus/slugify')
const leftPad = require('left-pad')

const etapeIds = ['dpu', 'apu', 'dex', 'dim', 'mfr']
const etapeProps = [
  'duree',
  'echeance',
  'surface',
  'volume',
  'engagement',
  'engagement_devise',
  'visas'
]
const documentsProps = ['jorf', 'nor', 'url', 'uri', 'fichier', 'nom', 'type']

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
  titre['titres_demarches.demarche_id'] === 'oct'

// trouve la démarche d'octroi correspondant à une démarche
const titreDemarcheOctroiFind = (jorfDemarche, jorfDemarches) =>
  // soit la démarche d'octroi avec la même ref existe
  jorfDemarches.find(
    d => d['ref_dgec'] === jorfDemarche['ref_dgec'] && demarcheIsOctroi(d)
  )
// soit on retourne la plus vieille démarche avec la même ref
// ||
// jorfDemarches.reduce(
//   (demarcheOlder, d) =>
//     d['ref_dgec'] === jorfDemarche['ref_dgec'] &&
//     dateYearCalc(demarcheOlder['dpu:titres_etapes.date']) >
//       dateYearCalc(d['dpu:titres_etapes.date'])
//       ? d
//       : demarcheOlder,
//   jorfDemarche
// )

const titreDemarcheOrderFind = (jorfDemarche, jorfDemarches) =>
  jorfDemarches
    .filter(
      d =>
        d['ref_dgec'] === jorfDemarche['ref_dgec'] &&
        d['titres_demarches.demarche_id'] ===
          jorfDemarche['titres_demarches.demarche_id']
    )
    .sort(
      (a, b) =>
        Number(dateFormat(a['dpu:titres_etapes.date'])) -
        Number(dateFormat(b['dpu:titres_etapes.date']))
    )
    .findIndex(d => jorfDemarche === d)

const etapesSort = (titreDemarcheId, jorfDemarche) =>
  etapeIds
    .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
    .map(etapeId => ({
      id: `${titreDemarcheId}-${etapeId}`,
      year: new Date(dateFormat(jorfDemarche[`${etapeId}:titres_etapes.date`]))
    }))
    .sort((a, b) => Number(a.year) - Number(b.year))

const titreFind = (refSource, refJorf) => {
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
  // console.log(
  //   chalk.red.bold(
  //     `${logTitresWithNoSource
  //       .filter((elem, pos, arr) => arr.indexOf(elem) === pos)
  //       .join('\n')}`
  //   )
  // )
  // console.log(
  //   chalk.green.bold(
  //     `${logTitresWithASource
  //       .filter((elem, pos, arr) => arr.indexOf(elem) === pos)
  //       .join('\n')}`
  //   )
  // )
}

const compare = async domaineId => {
  const jorfDemarches = require(`../sources/titres-${domaineId}-jorf.json`)

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
    titresEtapes: [
      {
        id: 'test',
        titre_demarche_id: 'test',
        etape_id: 'test',
        etape_statut_id: 'test',
        ordre: 'test',
        date: 'test',
        duree: 'test',
        echeance: 'test',
        surface: 'test',
        points: 'test',
        substances: 'test',
        titulaires: 'test'
      }
    ],
    titresPoints: [],
    titresDocuments: []
    // titresSubstances: [],
    // titresTitulaires: [],
    // titresEmprises: [],
    // titresVerifications: [],
    // titresAmodiataires: [],
    // titresUtilisateurs: []
  }

  jorfDemarches.forEach(jorfDemarche => {
    const titre = {}
    const titreDemarche = {}
    const jorfDomaineId = jorfDemarche['titres.domaine_id']
    const jorfTypeId = jorfDemarche['titres.type_id']
    const jorfDemarcheId = jorfDemarche['titres_demarches.demarche_id']
    const jorfNom = jorfDemarche['titres.nom']

    const tOctroi = demarcheIsOctroi(jorfDemarche)
      ? jorfDemarche
      : titreDemarcheOctroiFind(jorfDemarche, jorfDemarches)

    const date = tOctroi
      ? dateFormat(tOctroi['dpu:titres_etapes.date'])
      : '0000'

    const dateYear = date.slice(0, 4)
    const titreId = slugify(`${domaineId}-${jorfTypeId}-${jorfNom}-${dateYear}`)
    const titreDemarcheOrder = leftPad(
      titreDemarcheOrderFind(jorfDemarche, jorfDemarches) + 1,
      2,
      '0'
    )
    const titreDemarcheId = slugify(
      `${domaineId}-${jorfTypeId}-${jorfNom}-${dateYear}-${jorfDemarcheId}-${titreDemarcheOrder}`
    )

    const etapesSorted = etapesSort(titreDemarcheId, jorfDemarche)

    const sourceTitre = sources.titres.find(sourceTitre =>
      titreFind(sourceTitre.references.DGEC, jorfDemarche['ref_dgec'])
    )

    const sourceTitreDemarche = sourceTitre
      ? sources.titresDemarches.find(
          titreDemarche =>
            titreDemarche.titre_id === sourceTitre.id &&
            titreDemarche.demarche_id === `${jorfTypeId}-${jorfDemarcheId}`
        )
      : null

    titre.id = titreId
    titre.nom = jorfNom
    titre.type_id = jorfTypeId
    titre.domaine_id = jorfDomaineId
    titre.statut_id = 'ind'
    titre.references = { DGEC: jorfDemarche['ref_dgec'] }
    titreDemarche.id = titreDemarcheId
    titreDemarche.demarche_id = jorfDemarcheId
    titreDemarche.titre_id = titreId
    titreDemarche.demarche_statut_id = 'ind'
    titreDemarche.ordre = 0

    if (!sourceTitre) {
      logTitresWithNoSource.push(titreId)
    } else {
      logTitresWithASource.push(titreId)
    }

    const titreEtapes = etapeIds
      .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
      .map(etapeId => {
        const titreEtapeId = `${titreDemarcheId}-${etapeId}`
        const etape = {
          id: `${titreDemarcheId}-${etapeId}`,
          titre_demarche_id: titreDemarcheId,
          etape_id: etapeId,
          etape_statut_id:
            jorfDemarche[`${etapeId}:titres_etapes.etape_statut_id`],
          ordre: etapesSorted.findIndex(e => e.id === titreEtapeId),
          date: dateFormat(jorfDemarche[`${etapeId}:titres_etapes.date`])
        }

        etapeProps.forEach(prop => {
          if (jorfDemarche[`${etapeId}:titres_etapes.${prop}`]) {
            etape[prop] = jorfDemarche[`${etapeId}:titres_etapes.${prop}`]
          }
        })

        if (etape.visas) {
          etape.visas = etape.visas.split(';').map(l => l.replace(/\n/g, ''))
        }

        if (etape.echeance) {
          etape.echeance = dateFormat(etape.echeance)
        }

        if (etape.surface) {
          etape.surface = etape.surface.replace(/,/g, '.')
        }

        return etape
      })

    const titreEtapesPoints = etapeIds
      .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
      .map(etapeId => {
        const sourceTitreEtape = sourceTitreDemarche
          ? sources.titresEtapes.find(
              titreEtape =>
                titreEtape.titre_demarche_id === sourceTitreDemarche.id &&
                titreEtape.etape_id === etapeId
            )
          : null

        return sourceTitreEtape
          ? sources.titresPoints
              .filter(
                titrePoint => titrePoint.titre_etape_id === sourceTitreEtape.id
              )
              .map(titrePoint => {
                const titreEtapeId = `${titreDemarcheId}-${etapeId}`
                titrePoint.titre_etape_id = titreEtapeId
                titrePoint.id = titrePoint.id.replace(
                  sourceTitreEtape.id,
                  titreEtapeId
                )
                return titrePoint
              })
          : null
      })
      .filter(titreEtapePoints => titreEtapePoints)

    const titreEtapesDocuments = etapeIds
      .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
      .filter(etapeId =>
        documentsProps.reduce(
          (res, prop) =>
            res || jorfDemarche[`${etapeId}:titres_documents.${prop}`],
          false
        )
      )
      .map(etapeId =>
        documentsProps.reduce(
          (res, prop) =>
            jorfDemarche[`${etapeId}:titres_documents.${prop}`]
              ? Object.assign(res, {
                  [prop]: jorfDemarche[`${etapeId}:titres_documents.${prop}`]
                })
              : res,
          { titre_etape_id: `${titreDemarcheId}-${etapeId}` }
        )
      )
    if (demarcheIsOctroi(jorfDemarche)) {
      exports.titres.push(titre)
    }

    exports.titresDemarches.push(titreDemarche)
    titreEtapes.forEach(titreEtape => {
      const tsvFileName = `exports/etapes/${titreEtape.id}.tsv`
      fileCreate(tsvFileName, '')
      exports.titresEtapes.push(titreEtape)
    })

    titreEtapesPoints.forEach(titreEtapePoints => {
      titreEtapePoints.forEach(titrePoint => {
        exports.titresPoints.push(titrePoint)
      })
    })

    titreEtapesDocuments.forEach(titreEtapeDocument => {
      exports.titresDocuments.push(titreEtapeDocument)
    })
  })

  // sources.titres.forEach(t => {
  //   const titre = jorfDemarches.find(ti =>
  //     titreFind(t.references.DGEC, ti['ref_dgec'])
  //   )
  //   if (!titre) {
  //     console.log(chalk.red.bold(t.nom))
  //   } else {
  //     const demarche = sources.titresDemarches
  //       .filter(d => d.titre_id === t.id)
  //       .find(d => titre['titres_demarches.demarche_id'] === d.demarche_id)
  //     if (!demarche) {
  //       console.log('--> ', t.nom)
  //     }
  //   }
  // })

  await Promise.all([
    ...Object.keys(exports).map(async e => {
      const json2csvParser = new Json2csvParser()
      const csvFileName = `exports/${domaineId}-${decamelize(e, '-')}.csv`
      const csvFileContent = json2csvParser.parse(exports[e])
      await fileCreate(csvFileName, csvFileContent)
    })
  ])

  // log()
}

module.exports = compare
