const chalk = require('chalk')
const jsonToCsv = require('../_utils/json-to-csv')

const dateFields = [
  'dpu:titres_etapes.date',
  'apu:titres_etapes.date',
  'dim:titres_etapes.date',
  'mfr:titres_etapes.date',
  'dex:titres_etapes.date',
  'dex:titres_etapes.echeance',
  'rectif:dex:titres_etapes.date'
]

const jorfDateConvert = async domaineId => {
  const jorfDemarches = jorfDemarchesLoad(domaineId)

  const jorfModified = jorfDemarches.map(demarche =>
    Object.keys(demarche).reduce(
      (demarcheNew, col) => {
        const colNew = {}
        if (dateFields.find(field => field === col)) {
          try {
            colNew[col] = dateFormat(demarche[col])
          } catch (e) {
            console.log(demarche, col, demarche[col])
            console.error(e)
            throw e
          }
        } else if (col === 'dex:titres_etapes.visas') {
          colNew[col] = demarche[col].split(';').map(l => l.replace(/\n/g, ''))
        } else if (col === 'dex:titres_etapes.surface') {
          colNew[col] = demarche[col].replace(/,/g, '.')
        } else {
          colNew[col] = demarche[col]
        }
        return Object.assign(demarcheNew, colNew)
      },
      {
        'titres.domaine_id': '',
        'titres.type_id': '',
        'titres.nom': '',
        ref_dgec: '',
        'titres_demarches.type_id': '',
        'rectif:dex:titres_etapes.date': '',
        'dpu:titres_etapes.date': '',
        'apu:titres_etapes.date': '',
        'dex:titres_etapes.date': '',
        'dim:titres_etapes.date': '',
        'mfr:titres_etapes.date': '',
        'dpu:titres_etapes.etape_statut_id': '',
        'apu:titres_etapes.etape_statut_id': '',
        'dex:titres_etapes.etape_statut_id': '',
        'dim:titres_etapes.etape_statut_id': '',
        'mfr:titres_etapes.etape_statut_id': '',
        'dex:titres_etapes.duree': '',
        'dex:titres_etapes.echeance': '',
        'dim:titres_etapes.echeance': '',
        'dex:titres_etapes.surface': '',
        'dex:titres_etapes.volume': '',
        'dex:titres_etapes.volume_stockage_autorise': '',
        'dex:titres_etapes.engagement': '',
        'dex:titres_etapes.engagement_devise': '',
        'dex:titres_etapes.visas': '',
        'dex:titres_departements.departement_id': '',
        'dex:titres_communes.commune_id': '',
        'dpu:titres_documents.jorf': '',
        'dpu:titres_documents.nor': '',
        'dpu:titres_documents.url': '',
        'dpu:titres_documents.uri': '',
        'dpu:titres_documents.fichier': '',
        'dex:titres_documents.fichier': '',
        'dpu:titres_documents.nom': '',
        'dex:titres_documents.nom': '',
        'dpu:titres_documents.type': '',
        'dex:titres_documents.type': '',
        'dex:titres_substances.substance_id': '',
        'dex:dim:titres_titulaires.entreprise_id': '',
        'ex:entreprises.id': '',
        'entreprises.nom': '',
        'ex:entreprises.nom': '',
        'dex:dim:titres_verifications': '',
        'dex:titres_points_references.systeme': '',
        'dex:titres_points.coordonnees': '',
        geo_commentaires: ''
      }
    )
  )

  const fileName = `exports/${domaineId}-jorf-demarches.csv`

  await jsonToCsv(fileName, jorfModified)
}

const jorfDemarchesLoad = domaineId =>
  require(`../sources/titres-${domaineId}-jorf.json`)

// date M/D/YYY vers YYYY-MM-DD
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

module.exports = jorfDateConvert
