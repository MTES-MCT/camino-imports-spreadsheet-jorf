// ---------------------------------------------------------
// json merge and convert to csv
// ---------------------------------------------------------

// importe les fichiers sources et jorf au format json
// les convertis en objet avec la structure de la bdd de camino
// exporte ces tables au format csv

// ---------------------------------------------------------
// dépendances
// ---------------------------------------------------------

const chalk = require('chalk')
const decamelize = require('decamelize')
const slugify = require('@sindresorhus/slugify')
const leftPad = require('left-pad')
const cryptoRandomString = require('crypto-random-string')
const fileCreate = require('../_utils/file-create')
const jsonToCsv = require('../_utils/json-to-csv')

// ---------------------------------------------------------
// script principal
// ---------------------------------------------------------

// importe les fichiers sources et jorf au format json
// les convertis en objet avec la structure de la bdd de camino
// exporte ces tables au format csv
const jsonMergeToCsv = async domaineId => {
  const jorfDemarches = jorfDemarchesLoad(domaineId)
  const sources = sourcesLoad(domaineId)
  const json = jsonCreate(domaineId, jorfDemarches, sources)

  // sourcesCompare(sources, jorfDemarches)

  await Promise.all([...Object.keys(json).map(csvCreate(domaineId, json))])

  // log()
}

// ---------------------------------------------------------
// variables de structure
// ---------------------------------------------------------

const logObject = {}

const etapeIds = ['dpu', 'apu', 'dex', 'dim', 'mfr']

// colonnes de la table titres_etapes
const etapeCols = [
  'duree',
  'echeance',
  'surface',
  'volume',
  'engagement',
  'engagement_devise',
  'visas'
]

// colonnes de la table titres_documents
const documentsCols = ['jorf', 'nor', 'url', 'uri', 'fichier', 'nom', 'type']

// objet qui reçoit le contenu transformé
// avec la structure de la bdd camino
// avant d'être exporté en csv
const dbStructure = {
  titres: [],
  titresDemarches: [],
  titresEtapes: [
    {
      id: '',
      titre_demarche_id: '',
      etape_id: '',
      etape_statut_id: '',
      ordre: '',
      date: '',
      duree: '',
      echeance: '',
      surface: '',
      points: '',
      substances: '',
      titulaires: ''
    }
  ],
  titresPoints: [],
  titresDocuments: [],
  titresSubstances: [],
  titresTitulaires: []
  // titresEmprises: [],
  // titresVerifications: [],
  // titresAmodiataires: [],
  // titresUtilisateurs: []
}

// ---------------------------------------------------------
// scripts
// ---------------------------------------------------------

// charge le fichier jorfDemarches depuis un fichier json
const jorfDemarchesLoad = domaineId =>
  require(`../sources/titres-${domaineId}-jorf.json`)

// charge les fichiers sources depuis des fichiers json
const sourcesLoad = domaineId => ({
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
})

// transforme le fichier jorfDemarches
// vers le format de la bdd camino (dbStructure)
// chaque ligne du tableau jorfDemarches représente une démarche
const jsonCreate = (domaineId, jorfDemarches, sources) =>
  jorfDemarches.reduce(
    (exp, jorfDemarche) =>
      demarcheProcess(domaineId, sources, jorfDemarches, jorfDemarche, exp),
    dbStructure
  )

// transformation d'une démarche normale (non rectificatif)
// renvoi un objet au format dbStructure
// une démarche est traitée diffèrement s'il s'agit d'un rectificatif
const demarcheProcess = (
  domaineId,
  sources,
  jorfDemarches,
  jorfDemarche,
  exp
) => {
  const jorfTypeId = jorfDemarche['titres.type_id']
  const jorfDemarcheId = jorfDemarche['titres_demarches.demarche_id']
  const jorfNom = jorfDemarche['titres.nom']

  // renvoi le parent si la démarche est un rectificatif
  const jorfDemarcheParent = jorfDemarche['rectif:dex:titres_etapes.date']
    ? demarcheParentFind(jorfDemarche, jorfDemarches)
    : null

  const demarcheOctroiDate = jorfDemarcheParent
    ? demarcheOctroiDateFind(jorfDemarcheParent, jorfDemarches)
    : demarcheOctroiDateFind(jorfDemarche, jorfDemarches)

  const octroiFake =
    demarcheOctroiDate.slice(5) === '00-00' &&
    jorfDemarche['titres_demarches.demarche_id'] === 'oct'

  const titreDemarcheOrder = leftPad(
    (jorfDemarcheParent
      ? demarcheOrderFind(jorfDemarcheParent, jorfDemarches)
      : demarcheOrderFind(jorfDemarche, jorfDemarches)) + 1,
    2,
    '0'
  )

  const titreId = slugify(
    `${domaineId}-${jorfTypeId}-${jorfNom}-${demarcheOctroiDate.slice(0, 4)}`
  )

  const titreDemarcheId = slugify(
    `${titreId}-${jorfDemarcheId}${titreDemarcheOrder}`
  )

  const titre = {
    id: titreId,
    nom: jorfNom,
    type_id: jorfTypeId,
    domaine_id: domaineId,
    statut_id: 'ind',
    references: { DGEC: jorfDemarche['ref_dgec'] }
  }

  const titreDemarche = {
    id: titreDemarcheId,
    demarche_id: jorfDemarcheId,
    titre_id: titreId,
    demarche_statut_id: 'ind',
    ordre: 1
  }

  const titreEtapes = titreEtapesCreate(
    jorfDemarche,
    titreDemarcheId,
    jorfDemarcheParent
  )

  const titreEtapesPoints = titreEtapesPointsCreate(
    jorfDemarche,
    titreDemarcheId,
    sources,
    jorfDemarcheParent
  )

  const titreEtapesDocuments = titreEtapesDocumentsCreate(
    jorfDemarche,
    titreDemarcheId,
    jorfDemarcheParent
  )

  const titreEtapesSubstances = titreEtapesSubstancesCreate(
    jorfDemarche,
    titreDemarcheId,
    jorfDemarcheParent
  )

  const titreEtapesTitulaires = titreEtapesTitulairesCreate(
    jorfDemarche,
    titreDemarcheId,
    jorfDemarcheParent
  )

  // etapesTsvFilesCreate(titreEtapes)

  exp.titres =
    demarcheIsOctroiTest(jorfDemarche) && !jorfDemarcheParent
      ? [...exp.titres, titre]
      : exp.titres

  if (!octroiFake) {
    exp.titresDemarches = !jorfDemarcheParent
      ? [...exp.titresDemarches, titreDemarche]
      : exp.titresDemarches
    exp.titresEtapes = [...exp.titresEtapes, ...titreEtapes]
    exp.titresPoints = [...exp.titresPoints, ...titreEtapesPoints]
    exp.titresDocuments = [...exp.titresDocuments, ...titreEtapesDocuments]
    exp.titresSubstances = [...exp.titresSubstances, ...titreEtapesSubstances]
    exp.titresTitulaires = [...exp.titresTitulaires, ...titreEtapesTitulaires]
  }

  return exp
}

const titreEtapesCreate = (jorfDemarche, titreDemarcheId, jorfDemarcheParent) =>
  etapeIds
    .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
    .map(etapeId => {
      const titreEtapeOrder = leftPad(
        etapeOrderFind(etapeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )

      const titreEtapeId = `${titreDemarcheId}-${etapeId}${titreEtapeOrder}`
      const etapesSorted = etapesSort(
        titreDemarcheId,
        jorfDemarche,
        jorfDemarcheParent
      )
      const etape = {
        id: titreEtapeId,
        titre_demarche_id: titreDemarcheId,
        etape_id: etapeId,
        ordre: etapesSorted.findIndex(e => e.id === titreEtapeId) + 1,
        etape_statut_id:
          jorfDemarche[`${etapeId}:titres_etapes.etape_statut_id`],
        date: jorfDemarche[`${etapeId}:titres_etapes.date`]
      }

      etapeCols.forEach(col => {
        if (jorfDemarche[`${etapeId}:titres_etapes.${col}`]) {
          etape[col] = jorfDemarche[`${etapeId}:titres_etapes.${col}`]
        }
      })

      return etape
    })

const titreEtapesPointsCreate = (
  jorfDemarche,
  titreDemarcheId,
  sources,
  jorfDemarcheParent
) =>
  etapeIds
    .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
    .map(etapeId => {
      const jorfTypeId = jorfDemarche['titres.type_id']
      const jorfDemarcheId = jorfDemarche['titres_demarches.demarche_id']
      const titreEtapeOrder = leftPad(
        etapeOrderFind(etapeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )
      const titreEtapeId = `${titreDemarcheId}-${etapeId}${titreEtapeOrder}`

      const sourceTitre = sources.titres.find(sourceTitre =>
        titreFindByRef(sourceTitre.references.DGEC, jorfDemarche['ref_dgec'])
      )

      if (sourceTitre) logObject[sourceTitre.id] = true

      const sourceDemarche = sourceTitre
        ? sources.titresDemarches.find(
            std =>
              std.titre_id === sourceTitre.id &&
              std.demarche_id === `${jorfTypeId}-${jorfDemarcheId}`
          )
        : null

      const sourceEtape = sourceDemarche
        ? sources.titresEtapes.find(
            ste =>
              ste.titre_demarche_id === sourceDemarche.id &&
              ste.etape_id === etapeId
          )
        : null

      const sourcePoints = sourceEtape
        ? sources.titresPoints
            .filter(stp => stp.titre_etape_id === sourceEtape.id)
            .map(stp => {
              stp.titre_etape_id = titreEtapeId
              stp.id = stp.id.replace(sourceEtape.id, titreEtapeId)
              return stp
            })
        : null

      // if (sourcePoints)
      //   sourcePoints.forEach(sourcePoint => (logObject[sourcePoint.id] = true))

      return sourcePoints
    })
    .filter(titreEtapePoints => titreEtapePoints)
    .reduce((points, titreEtapePoints) => [...points, ...titreEtapePoints], [])

const titreEtapesDocumentsCreate = (
  jorfDemarche,
  titreDemarcheId,
  jorfDemarcheParent
) =>
  etapeIds
    .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
    .filter(etapeId =>
      documentsCols.reduce(
        (res, col) => res || jorfDemarche[`${etapeId}:titres_documents.${col}`],
        false
      )
    )
    .map(etapeId => {
      const titreEtapeId = `${titreDemarcheId}-${etapeId}${leftPad(
        etapeOrderFind(etapeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )}`

      return documentsCols.reduce(
        (res, col) =>
          jorfDemarche[`${etapeId}:titres_documents.${col}`]
            ? Object.assign(res, {
                id: `${titreEtapeId}-${cryptoRandomString(8)}`,
                [col]: jorfDemarche[`${etapeId}:titres_documents.${col}`]
              })
            : res,
        {
          titre_etape_id: titreEtapeId
        }
      )
    })

const titreEtapesSubstancesCreate = (
  jorfDemarche,
  titreDemarcheId,
  jorfDemarcheParent
) =>
  etapeIds
    .filter(
      etapeId =>
        jorfDemarche[`${etapeId}:titres_etapes.date`] &&
        jorfDemarche[`${etapeId}:titres_substances.substance_id`]
    )
    .reduce(
      (substances, etapeId) => [
        ...substances,
        ...jorfDemarche[`${etapeId}:titres_substances.substance_id`]
          .split(';')
          .map(substanceId => ({
            titre_etape_id: `${titreDemarcheId}-${etapeId}${leftPad(
              etapeOrderFind(etapeId, jorfDemarcheParent) + 1,
              2,
              '0'
            )}`,
            substance_id: substanceId
          }))
      ],
      []
    )

const titreEtapesTitulairesCreate = (
  jorfDemarche,
  titreDemarcheId,
  jorfDemarcheParent
) =>
  etapeIds
    .filter(
      etapeId =>
        jorfDemarche[`${etapeId}:titres_etapes.date`] &&
        jorfDemarche[`${etapeId}:titres_titulaires.entreprise_id`]
    )
    .reduce(
      (titulaires, etapeId) => [
        ...titulaires,
        ...jorfDemarche[`${etapeId}:titres_titulaires.entreprise_id`]
          .split(';')
          .map(titulaireId => ({
            titre_etape_id: `${titreDemarcheId}-${etapeId}${leftPad(
              etapeOrderFind(etapeId, jorfDemarcheParent) + 1,
              2,
              '0'
            )}`,
            entreprise_id: titulaireId
          }))
      ],
      []
    )

const sourcesCompare = (sources, jorfDemarches) =>
  sources.titres.forEach(t => {
    const titre = jorfDemarches.find(ti =>
      titreFindByRef(t.references.DGEC, ti['ref_dgec'])
    )
    if (!titre) {
      console.log(chalk.red.bold(t.nom))
    } else {
      const demarche = sources.titresDemarches
        .filter(d => d.titre_id === t.id)
        .find(d => titre['titres_demarches.demarche_id'] === d.demarche_id)
      if (!demarche) {
        console.log('--> ', t.nom)
      }
    }
  })

const csvCreate = (domaineId, json) => async table => {
  const fileName = `exports/${domaineId}-${decamelize(table, '-')}.csv`
  await jsonToCsv(fileName, json[table])
}

const etapesTsvFilesCreate = titreEtapes =>
  titreEtapes.forEach(titreEtape => {
    const tsvFileName = `exports/etapes/${titreEtape.id}.tsv`
    fileCreate(tsvFileName, '')
  })

// ---------------------------------------------------------
// utils
// ---------------------------------------------------------

// renvoi true si la démarche est un octroi
const demarcheIsOctroiTest = jorfDemarche =>
  jorfDemarche['titres_demarches.demarche_id'] === 'oct'

// renvoi la démarche d'octroi correspondant à une démarche
const demarcheOctroiDateFind = (jorfDemarche, jorfDemarches) => {
  const demarcheOctroi = demarcheIsOctroiTest(jorfDemarche)
    ? jorfDemarche
    : jorfDemarches.find(
        d =>
          d['ref_dgec'] === jorfDemarche['ref_dgec'] && demarcheIsOctroiTest(d)
      )

  return demarcheOctroi ? demarcheOctroi['dpu:titres_etapes.date'] : '1111'
}

// renvoi la démarche parente d'une démarche rectificative
const demarcheParentFind = (jorfDemarche, jorfDemarches) =>
  jorfDemarches.find(
    d =>
      d['ref_dgec'] === jorfDemarche['ref_dgec'] &&
      !d['rectif:dex:titres_etapes.date'] &&
      d['dex:titres_etapes.date'] ===
        jorfDemarche['rectif:dex:titres_etapes.date']
  )

// renvoi l'index de la démarche
// parmi les autres démarches avec une id identique classées par date
const demarcheOrderFind = (jorfDemarche, jorfDemarches) =>
  jorfDemarches
    .filter(
      d =>
        d['ref_dgec'] === jorfDemarche['ref_dgec'] &&
        d['titres_demarches.demarche_id'] ===
          jorfDemarche['titres_demarches.demarche_id']
    )
    .sort(
      (a, b) =>
        Number(a['dex:titres_etapes.date']) -
        Number(b['dex:titres_etapes.date'])
    )
    .findIndex(d => jorfDemarche === d)

const etapeOrderFind = (etapeId, jorfDemarcheParent) =>
  jorfDemarcheParent && jorfDemarcheParent[`${etapeId}:titres_etapes.date`]
    ? 1
    : 0

// renvoi un tableau avec les étapes { id, date } classées par date
const etapesSort = (titreDemarcheId, jorfDemarche, jorfDemarcheParent) =>
  etapeIds
    .filter(etapeId => jorfDemarche[`${etapeId}:titres_etapes.date`])
    .map(etapeId => ({
      id: `${titreDemarcheId}-${etapeId}${leftPad(
        etapeOrderFind(etapeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )}`,
      year: new Date(jorfDemarche[`${etapeId}:titres_etapes.date`])
    }))
    .sort((a, b) => Number(a.year) - Number(b.year))

// renvoi true si une réf de titre existe dans les sources et dans jorf
const titreFindByRef = (sourceTitreRef, jorfTitreRef) => {
  const f = sourceTitreRef.slice(0, 1)
  const ref =
    f === 'D' || f === 'E' || f === 'M' || f === 'N' || f === 'P'
      ? sourceTitreRef.slice(1)
      : sourceTitreRef

  return ref === jorfTitreRef
}

const log = () => {
  console.log(Object.keys(logObject).length)
}

module.exports = jsonMergeToCsv
