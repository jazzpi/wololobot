import Steam from 'steam'
import fs from 'fs'
import crypto from 'crypto'
import assign from 'object-assign'

const debug = require('debug')('wololobot:steam-connection')

const makeSha = bytes => {
  let hash = crypto.createHash('sha1')
  hash.update(bytes)
  return hash.digest()
}

export default function steamConnection(opts) {

  opts = assign({ sentryLocation: 'steam-sentryfile.bin' }, opts)

  if (opts.username === undefined || opts.password === undefined) {
    console.error('Steam user or password not given - Aborting Steam login.')
    debug(opts)
    return () => null
  }

  let steam = {}
  steam.client = new Steam.SteamClient()
  steam.user = new Steam.SteamUser(steam.client)
  steam.friends = new Steam.SteamFriends(steam.client)

  let connected = false
  let checkedSentry = false
  let sentryHash = null
  const logon = () => {
    if (connected && checkedSentry) {
      debug('Logging in...')
      if (sentryHash !== null) {
        steam.user.logOn({
          account_name: opts.username
        , password: opts.password
        , sha_sentryfile: sentryHash
        })
      } else if (opts.steamGuard !== undefined) {
        steam.user.logOn({
          account_name: opts.username
        , password: opts.password
        , auth_code: opts.steamGuard
        })
      } else {
        steam.user.logOn({
          account_name: opts.username
        , password: opts.password
        })
      }
    }
  }

  // Handlers required for initial connection
  steam.client.on('connected', () => {
    debug('Connected!')
    connected = true
    logon()
  })
  steam.client.on('logOnResponse', function(response) {
    switch (response.eresult) {
      case Steam.EResult.OK:
      debug('Logged in!')
      break
      case Steam.EResult.AccountLogonDenied:
      console.error('Steam Login denied - Please add your Steam Guard code to the config.json file')
      return () => null
      case Steam.EResult.InvalidLoginAuthCode:
      console.error('Invalid Steam Guard code!')
      return () => null
      case Steam.EResult.ExpiredLoginAuthCode:
      console.error('Steam Guard code expired!')
      return () => null
      default:
      console.error('Login failed!')
      debug('Login failed with response:')
      debug(response)
    }
  })
  steam.user.on('updateMachineAuth', (response, callback) => {
    // The sentry file is required so we don't need a Steam Guard code on every login
    debug('Writing sentry...')
    fs.writeFile(opts.sentryLocation, response.bytes)
    callback({ sha_file: makeSha(response.bytes) })
  })
  steam.client.connect()
  debug('Connecting...')
  fs.access(opts.sentryLocation, fs.F_OK | fs.R_OK, err => {
    if (err) {
      debug('No sentry file found or no read access')
      checkedSentry = true
    } else {
      debug('Found sentry file')
      fs.readFile(opts.sentryLocation, (err, data) => {
        if (err) {
          console.error('Error while reading the sentry file!')
          debug(err)
          return () => null
        }
        sentryHash = makeSha(data)
        debug('Read sentry file')
        checkedSentry = true
        logon()
      })
    }
  })

  return (bot) => {
    bot.steam = steam
  }

}
