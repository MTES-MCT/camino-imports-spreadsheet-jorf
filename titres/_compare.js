const chalk = require('chalk')

const check = (jorfTitre, titres) => {
  const ref = jorfTitre['ref_dgec']
  const a = titres.find(t => t.references.DGEC === ref)
  if (a) {
    return a.nom
  } else {
    console.log(chalk.red.bold(`${ref}`))
  }
}

const compare = domaineId => {
  console.log('Type:', domaineId)
  const jorfTitres = require(`../sources/titres-${domaineId}-jorf.json`)
  const titres = require(`../sources/titres-${domaineId}.json`)
  jorfTitres
    .map(jorfTitre => check(jorfTitre, titres))
    .filter(t => t !== undefined)
    .forEach(t => {
      console.log(t)
    })
}

module.exports = compare
