require('dotenv').config()
const WebSocket = require('ws')
const express = require('express')
const { createServer } = require('http')
const cors = require('cors')
const app = express()
const port = 3030
const wssPort = 8030
const server = createServer(app).listen(wssPort)
const {
  hrefsPragmatic,
  eziguTablesIDS,
  ezugiInfoTables
} = require('./constants')
const { getColorByValue } = require('./utils/getColorByValue')

const URL_PGRAGMATIC = 'wss://dga.pragmaticplaylive.net/ws'
const URL_EZUGI = 'wss://engine.livetables.io/GameServer/lobby'
const PING_INTERVAL = 1000 * 10

function appStart () {
  const gamesResult = {}
  let pragmaticWss = null
  let ezugiWss = null

  const wssServer = new WebSocket.Server({ server })

  wssServer.on('connection', ws => {
    ws.send(JSON.stringify({
      event: 'init',
      data: gamesResult
    }))
  })

  const connectToPragmatic = () => {
    const wssCasino = new WebSocket(URL_PGRAGMATIC, {})
    let intervalId = null

    wssCasino.onmessage = (event) => {
      const json = JSON.parse(event?.data || {})
      const { tableId, tableName, last20Results } = json || {}

      const result = {
        provaiderName: 'pragmatic',
        tableName,
        tableId,
        resultGames: (last20Results || []).map((game) => ({
          color: game.color,
          result: game.result
        })),
        href: hrefsPragmatic[tableId] || '-'
      }
      gamesResult[tableId] = result

      wssServer.clients.forEach(function each (client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            event: 'games',
            tableId,
            data: result
          }))
        }
      })
    }

    wssCasino.onclose = () => {
      clearInterval(intervalId)
      pragmaticWss = null
    }

    wssCasino.onerror = () => {}

    wssCasino.onopen = () => {
      pragmaticWss = wssCasino

      wssCasino.send(JSON.stringify({
        type: 'subscribe',
        casinoId: 'ppcdg00000003811',
        key: [204, 225, 201, 230, 203, 227, 545, 240, 205, 229, 234, 221, 206],
        currency: 'RUB'
      }))

      intervalId = setInterval(() => {
        wssCasino.send(JSON.stringify({ event: 'ping' }))
      }, PING_INTERVAL)
    }

    return wssCasino
  }

  const connectToEzugi = () => {
    const wssCasino = new WebSocket(URL_EZUGI, {})
    let intervalId = null

    wssCasino.onmessage = (event) => {
      const json = JSON.parse(event?.data || {})
      const { tableId, subMessageType, History } = json || {}
      const isNeedTable = eziguTablesIDS.includes(Number(tableId))
      const isEventHistory = subMessageType === 'UPDATED_TABLE_HISTORY'
      const isHistoryEmpty = History === undefined

      if (isEventHistory && isNeedTable && !isHistoryEmpty) {
        const info = ezugiInfoTables[tableId] || {}

        const resultGames = (History || []).slice(-20).reverse().map(({ WinningNumber }) => ({
          result: WinningNumber,
          color: getColorByValue(WinningNumber)
        }))

        const result = {
          provaiderName: 'ezugi',
          tableName: info.tableName,
          tableId,
          resultGames,
          href: info.href
        }

        gamesResult[tableId] = result

        wssServer.clients.forEach(function each (client) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              event: 'games',
              tableId,
              data: result
            }))
          }
        })
      }
    }

    wssCasino.onclose = () => {
      clearInterval(intervalId)
      ezugiWss = null
    }

    wssCasino.onerror = () => {}

    wssCasino.onopen = () => {
      ezugiWss = wssCasino

      intervalId = setInterval(() => {
        wssCasino.send('EzugiPingMessage')
      }, PING_INTERVAL)
    }
  }

  connectToPragmatic()
  connectToEzugi()

  app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
  }))
  app.use(express.json())

  app.post('/api/reconnect', function (_, res) {
    if (pragmaticWss?.readyState === WebSocket.OPEN) {
      pragmaticWss.close()
    }
    if (ezugiWss?.readyState === WebSocket.OPEN) {
      pragmaticWss.close()
    }

    connectToPragmatic()
    connectToPragmatic()

    res.status(200).json({ success: true })
  })

  app.get('/api/infoConnect', function (_, res) {
    const isOpen = pragmaticWss?.readyState === WebSocket.OPEN &&
      ezugiWss?.readyState === WebSocket.OPEN

    res.status(200).json({ success: true, isOpen })
  })

  app.listen(port, () => {
    console.log(`server app on port ${port}`)
  })
};

appStart()
