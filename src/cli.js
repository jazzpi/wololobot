import knex from 'knex'
import { readFileSync as readFile } from 'fs'
import wololobot from './index'
import version from './modules/version'
import florins from './modules/florins'
import raffle from './modules/raffle'
import bets from './modules/bets'
import reddit from './modules/reddit'
import streamtime from './modules/streamtime'
import drawing from './modules/drawing'
import sex from './modules/sex'
import mute from './modules/mute'
import steamConnection from './modules/steam-connection'

export default function main(confile = 'config.json') {
  const conf = JSON.parse(readFile(confile))
  const db = knex(conf.database)
  const wb = wololobot(conf)
  wb.use(version())
  wb.use(florins({ db: db }))
  wb.use(raffle())
  wb.use(bets({ db: db }))
  wb.use(reddit(conf.reddit))
  wb.use(streamtime({ db: db }))
  wb.use(drawing())
  wb.use(sex())
  wb.use(mute({ username: conf.username }))
  wb.use(steamConnection(conf.steam))

  return wb
}
