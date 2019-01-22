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

const typeIds = ['dex', 'apu', 'dpu', 'dim', 'mfr']

// colonnes de la table titres_etapes
const etapeCols = [
  'duree',
  'date_debut',
  'surface',
  'volume',
  'engagement',
  'engagement_devise',
  'visas'
]

// colonnes de la table titres_documents
const documentsCols = ['jorf', 'nor', 'url', 'uri', 'nom', 'type', 'fichier']

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
      type_id: '',
      statut_id: '',
      ordre: '',
      date: '',
      duree: '',
      date_debut: '',
      date_fin: '',
      surface: '',
      points: '',
      substances: '',
      titulaires: ''
    }
  ],
  titresPoints: [],
  titresDocuments: [],
  titresSubstances: [],
  titresTitulaires: [],
  // titresEmprises: [],
  // titresVerifications: [],
  titresAmodiataires: [],
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
  const jorfDemarcheId = jorfDemarche['titres_demarches.type_id']
  const jorfNom = jorfDemarche['titres.nom']

  // renvoi le parent si la démarche est un rectificatif
  const jorfDemarcheParent = jorfDemarche['rectif:dex:titres_etapes.date']
    ? demarcheParentFind(jorfDemarche, jorfDemarches)
    : null

  let demarcheOctroiDate = jorfDemarcheParent
    ? demarcheOctroiDateFind(jorfDemarcheParent, jorfDemarches)
    : demarcheOctroiDateFind(jorfDemarche, jorfDemarches)

  if (!demarcheOctroiDate) {
    // console.log({ jorfDemarche, jorfDemarcheParent })
    demarcheOctroiDate = '0000-00-00'
  }

  // console.log({ demarcheOctroiDate })

  const octroiFake =
    demarcheOctroiDate.slice(5) === '00-00' &&
    jorfDemarche['titres_demarches.type_id'] === 'oct'

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
    references: {
      RNTM: jorfDemarche['ref_rntm'],
      BRGM: jorfDemarche['ref_brgm'],
      DEB: jorfDemarche['ref_deb'],
      DEAL: jorfDemarche['ref_deal973'],
    },
  }

  const titreDemarche = {
    id: titreDemarcheId,
    type_id: jorfDemarcheId,
    titre_id: titreId,
    statut_id: 'ind',
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
  typeIds
    .filter(typeId => {
      let date = jorfDemarche[`${typeId}:titres_etapes.date`]
      if (!date && typeId === 'dpu') {
        date = jorfDemarche[`dex:titres_etapes.date`]
        jorfDemarche[`dpu:titres_etapes.date`] = date
        jorfDemarche[`dpu:titres_etapes.statut_id`] = jorfDemarche[`dex:titres_etapes.statut_id`]
      }
      return date
    })
    .map(typeId => {
      const titreEtapeOrder = leftPad(
        etapeOrderFind(typeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )

      const titreEtapeId = `${titreDemarcheId}-${typeId}${titreEtapeOrder}`
      const etapesSorted = etapesSort(
        titreDemarcheId,
        jorfDemarche,
        jorfDemarcheParent
      )
      const etape = {
        id: titreEtapeId,
        titre_demarche_id: titreDemarcheId,
        type_id: typeId,
        ordre: etapesSorted.findIndex(e => e.id === titreEtapeId) + 1,
        statut_id:
          jorfDemarche[`${typeId}:titres_etapes.statut_id`],
        date: jorfDemarche[`${typeId}:titres_etapes.date`],
        date_fin: jorfDemarche[`${typeId}:titres_etapes.echeance`]
      }

      etapeCols.forEach(col => {
        if (jorfDemarche[`${typeId}:titres_etapes.${col}`]) {
          etape[col] = jorfDemarche[`${typeId}:titres_etapes.${col}`]
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
  typeIds
    .filter(typeId => jorfDemarche[`${typeId}:titres_etapes.date`])
    .map(typeId => {
      const jorfTypeId = jorfDemarche['titres.type_id']
      const jorfDemarcheId = jorfDemarche['titres_demarches.type_id']
      const titreEtapeOrder = leftPad(
        etapeOrderFind(typeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )
      const titreEtapeId = `${titreDemarcheId}-${typeId}${titreEtapeOrder}`

      const sourceTitre = sources.titres.find(sourceTitre =>
        titreFindByRef(sourceTitre.references.DGEC, jorfDemarche['ref_dgec'])
      )

      if (sourceTitre) logObject[sourceTitre.id] = true

      const sourceDemarche = sourceTitre
        ? sources.titresDemarches.find(
            std =>
              std.titre_id === sourceTitre.id &&
              std.type_id === jorfDemarcheId
          )
        : null

      const sourceEtape = sourceDemarche
        ? sources.titresEtapes.find(
            ste =>
              ste.titre_demarche_id === sourceDemarche.id &&
              ste.type_id === typeId
          )
        : null

      const sourcePoints = sourceEtape
        ? sources.titresPoints
            .filter(stp => stp.titre_etape_id === sourceEtape.id)
              .map(stp => {
                return {
                  ...stp,
                  titre_etape_id: titreEtapeId,
                  id: stp.id.replace(sourceEtape.id, titreEtapeId)
                }
            })
        : null

      //if (sourcePoints)
        // sourcePoints.forEach(sourcePoint => (logObject[sourcePoint.id] = true))

      return sourcePoints
    })
    .filter(titreEtapePoints => titreEtapePoints)
    .reduce((points, titreEtapePoints) => [...points, ...titreEtapePoints], [])

const titreEtapesDocumentsCreate = (
  jorfDemarche,
  titreDemarcheId,
  jorfDemarcheParent
) =>
  typeIds
    .filter(typeId => jorfDemarche[`${typeId}:titres_etapes.date`])
    .filter(typeId =>
      documentsCols.reduce(
        (res, col) => res || jorfDemarche[`${typeId}:titres_documents.${col}`],
        false
      )
    )
    .map(typeId => {
      const titreEtapeId = `${titreDemarcheId}-${typeId}${leftPad(
        etapeOrderFind(typeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )}`

      return documentsCols.reduce(
        (res, col) =>
          jorfDemarche[`${typeId}:titres_documents.${col}`]
            ? Object.assign(res, {
                id: `${titreEtapeId}-${cryptoRandomString(8)}`,
                [col]: jorfDemarche[`${typeId}:titres_documents.${col}`]
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
  typeIds
    .filter(
      typeId =>
        jorfDemarche[`${typeId}:titres_etapes.date`] &&
        jorfDemarche[`${typeId}:titres_substances.substance_id`]
    )
    .reduce(
      (substances, typeId) => [
        ...substances,
        ...jorfDemarche[`${typeId}:titres_substances.substance_id`]
          .replace(/ ;/g, ';')
          .split(';')
          .map(substanceId => ({
            titre_etape_id: `${titreDemarcheId}-${typeId}${leftPad(
              etapeOrderFind(typeId, jorfDemarcheParent) + 1,
              2,
              '0'
            )}`,
            substance_id: substanceId.trim()
          }))
      ],
      []
    )

const titreEtapesTitulairesCreate = (
  jorfDemarche,
  titreDemarcheId,
  jorfDemarcheParent
) =>
  typeIds
    .filter(
      typeId =>
        jorfDemarche[`${typeId}:titres_etapes.date`] &&
        jorfDemarche[`${typeId}:titres_titulaires.entreprise_id`]
    )
    .reduce(
      (titulaires, typeId) => [
        ...titulaires,
        ...jorfDemarche[`${typeId}:titres_titulaires.entreprise_id`]
          .split(';')
          .map(titulaireId => ({
            titre_etape_id: `${titreDemarcheId}-${typeId}${leftPad(
              etapeOrderFind(typeId, jorfDemarcheParent) + 1,
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
        .find(d => titre['titres_demarches.type_id'] === d.type_id)
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
  jorfDemarche['titres_demarches.type_id'] === 'oct'

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
      d['titres_demarches.type_id'] ===
        jorfDemarche['titres_demarches.type_id'] &&
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
        d['titres_demarches.type_id'] ===
          jorfDemarche['titres_demarches.type_id']
    )
    .sort(
      (a, b) =>
        Number(a['dex:titres_etapes.date']) -
        Number(b['dex:titres_etapes.date'])
    )
    .findIndex(d => jorfDemarche === d)

const etapeOrderFind = (typeId, jorfDemarcheParent) =>
  jorfDemarcheParent && jorfDemarcheParent[`${typeId}:titres_etapes.date`]
    ? 1
    : 0

// renvoi un tableau avec les étapes { id, date } classées par date
const etapesSort = (titreDemarcheId, jorfDemarche, jorfDemarcheParent) =>
  typeIds
    .filter(typeId => jorfDemarche[`${typeId}:titres_etapes.date`])
    .map(typeId => ({
      id: `${titreDemarcheId}-${typeId}${leftPad(
        etapeOrderFind(typeId, jorfDemarcheParent) + 1,
        2,
        '0'
      )}`,
      year: new Date(jorfDemarche[`${typeId}:titres_etapes.date`])
    }))
    .sort((a, b) => Number(a.year) - Number(b.year))

// renvoi true si une réf de titre existe dans les sources et dans jorf
const titreFindByRef = (sourceTitreRef, jorfTitreRef) => {
  if (!sourceTitreRef) {
    return false
  }

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
