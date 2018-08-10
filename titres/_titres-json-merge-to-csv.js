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

const etapesSort = (titreDemarcheId, jorfDemarche) => {
  const etapes = []
  if (jorfDemarche['dpu:titres_etapes.date']) {
    etapes.push({
      id: `${titreDemarcheId}-dpu`,
      year: new Date(dateFormat(jorfDemarche['dpu:titres_etapes.date']))
    })
  }
  if (jorfDemarche['dex:titres_etapes.date']) {
    etapes.push({
      id: `${titreDemarcheId}-dex`,
      year: new Date(dateFormat(jorfDemarche['dex:titres_etapes.date']))
    })
  }
  if (jorfDemarche['mfr:titres_etapes.date']) {
    etapes.push({
      id: `${titreDemarcheId}-mfr`,
      year: new Date(dateFormat(jorfDemarche['mfr:titres_etapes.date']))
    })
  }
  if (jorfDemarche['dim:titres_etapes.date']) {
    etapes.push({
      id: `${titreDemarcheId}-dim`,
      year: new Date(dateFormat(jorfDemarche['dim:titres_etapes.date']))
    })
  }
  if (jorfDemarche['apu:titres_etapes.date']) {
    etapes.push({
      id: `${titreDemarcheId}-apu`,
      year: new Date(dateFormat(jorfDemarche['apu:titres_etapes.date']))
    })
  }

  return etapes.sort((a, b) => Number(a.year) - Number(b.year))
}

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
const logInvalidDates = []

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
  console.log(logInvalidDates)
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
        demarche_id: 'test',
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
    ]
    // titresSubstances: [],
    // titresTitulaires: [],
    // titresEmprises: [],
    // titresVerifications: [],
    // titresPoints: []
    // titresAmodiataires: [],
    // titresUtilisateurs: []
  }

  jorfDemarches.forEach(jorfDemarche => {
    const titre = {}
    const titreDemarche = {}
    const titreDemarcheEtapes = []

    const tOctroi = demarcheIsOctroi(jorfDemarche)
      ? jorfDemarche
      : titreDemarcheOctroiFind(jorfDemarche, jorfDemarches)

    const date = tOctroi
      ? dateFormat(tOctroi['dpu:titres_etapes.date'])
      : '0000'

    const dateYear = date.slice(0, 4)
    const titreId = slugify(
      `${domaineId}-${jorfDemarche['titres.type_id']}-${
        jorfDemarche['titres.nom']
      }-${dateYear}`
    )
    const demarcheId = jorfDemarche['titres_demarches.demarche_id']
    const titreDemarcheId = slugify(
      `${domaineId}-${demarcheId}-${jorfDemarche['titres.nom']}-${dateYear}`
    )

    const etapesSorted = etapesSort(titreDemarcheId, jorfDemarche)

    const sourceTitre = sources.titres.find(source =>
      refExists(source.references.DGEC, jorfDemarche['ref_dgec'])
    )

    const sourceTitreDemarche = sourceTitre
      ? sources.titresDemarches.find(
          td => td.titre_id === sourceTitre.id && td.demarche_id === demarcheId
        )
      : null

    titre.id = titreId
    titre.nom = jorfDemarche['titres.nom']
    titre.type_id = jorfDemarche['titres.type_id']
    titre.domaine_id = jorfDemarche['titres.domaine_id']
    titre.statut_id = 'ind'
    titre.references = { DGEC: jorfDemarche['ref_dgec'] }
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

    if (jorfDemarche['dpu:titres_etapes.date']) {
      const etapeId = `${titreDemarcheId}-dpu`
      titreDemarcheEtapes.push({
        id: etapeId,
        titre_demarche_id: titreDemarcheId,
        etape_id: 'dpu',
        etape_statut_id:
          jorfDemarche['dpu:dex:dim:titres_etapes.etape_statut_id'],
        ordre: etapesSorted.findIndex(e => e.id === etapeId),
        date: dateFormat(jorfDemarche['dpu:titres_etapes.date'])
      })
    }

    if (jorfDemarche['dex:titres_etapes.date']) {
      const etapeId = `${titreDemarcheId}-dex`
      const tde = {
        id: etapeId,
        titre_demarche_id: titreDemarcheId,
        etape_id: 'dex',
        etape_statut_id:
          jorfDemarche['dpu:dex:dim:titres_etapes.etape_statut_id'],
        ordre: etapesSorted.findIndex(e => e.id === etapeId),
        date: dateFormat(jorfDemarche['dex:titres_etapes.date'])
      }

      if (jorfDemarche['dex:titres_etapes.duree']) {
        tde.duree = jorfDemarche['dex:titres_etapes.duree']
      }

      if (jorfDemarche['dex:dim:titres_etapes.echeance']) {
        tde.echeance = dateFormat(
          jorfDemarche['dex:dim:titres_etapes.echeance']
        )
      }

      if (jorfDemarche['dex:titres_etapes.surface']) {
        tde.surface = jorfDemarche['dex:titres_etapes.surface']
      }

      if (jorfDemarche['dex:titres_etapes.volume']) {
        tde.volume = jorfDemarche['dex:titres_etapes.volume']
      }

      if (jorfDemarche['dex:titres_etapes.engagement']) {
        tde.engagement = jorfDemarche['dex:titres_etapes.engagement']
      }

      if (jorfDemarche['dex:titres_etapes.engagement_devise']) {
        tde.engagement_devise =
          jorfDemarche['dex:titres_etapes.engagement_devise']
      }

      if (jorfDemarche['dex:titres_etapes.visas']) {
        tde.visas = jorfDemarche['dex:titres_etapes.visas']
          .split(';')
          .map(l => l.replace(/\n/g, ''))
      }

      titreDemarcheEtapes.push(tde)
    }

    if (jorfDemarche['mfr:titres_etapes.date']) {
      const etapeId = `${titreDemarcheId}-mfr`
      titreDemarcheEtapes.push({
        id: etapeId,
        titre_demarche_id: titreDemarcheId,
        etape_id: 'mfr',
        etape_statut_id: jorfDemarche['mfr:titres_etapes.etape_statut_id'],
        ordre: etapesSorted.findIndex(e => e.id === etapeId),
        date: dateFormat(jorfDemarche['mfr:titres_etapes.date'])
      })
    }

    //
    if (demarcheIsOctroi(jorfDemarche)) {
      exports.titres.push(titre)
    }

    exports.titresDemarches.push(titreDemarche)
    titreDemarcheEtapes.forEach(e => {
      exports.titresEtapes.push(e)
    })
  })

  sources.titres.forEach(t => {
    const check = jorfDemarches.find(ti =>
      refExists(t.references.DGEC, ti['ref_dgec'])
    )
    if (!check) {
      console.log(t.nom)
    }
  })

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
