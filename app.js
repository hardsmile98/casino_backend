require('dotenv').config()
const WebSocket = require('ws')
const express = require('express')
const { createServer } = require('http')
const cors = require('cors')
const app = express()
const port = 3030
const wssPort = 8030
const server = createServer(app).listen(wssPort)
const hrefs = require('./constants/hrefs.json')

const URL = 'wss://dga.pragmaticplaylive.net/ws'
const PING_INTERVAL = 1000 * 10

function appStart () {
  const gamesResult = {}
  let casinoWss = null

  const wssServer = new WebSocket.Server({ server })

  wssServer.on('connection', ws => {
    ws.send(JSON.stringify({
      event: 'init',
      data: gamesResult
    }))
  })

  const connectToCasino = () => {
    const wssCasino = new WebSocket(URL, {})
    let intervalId = null

    wssCasino.onmessage = (event) => {
      const json = JSON.parse(event?.data || {})
      const { tableId, tableName, last20Results } = json || {}

      const result = {
        tableName,
        tableId,
        resultGames: (last20Results || []).map((game) => ({
          color: game.color,
          result: game.result
        })),
        href: hrefs[tableId] || '-'
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
      casinoWss = null
    }

    wssCasino.onerror = () => {}

    wssCasino.onopen = () => {
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

  casinoWss = connectToCasino()

  app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
  }))
  app.use(express.json())

  app.post('/api/reconnect', function (_, res) {
    if (casinoWss?.readyState === WebSocket.OPEN) {
      casinoWss.close()
    }
    casinoWss = connectToCasino()
    res.status(200).json({ success: true })
  })

  app.get('/api/infoConnect', function (_, res) {
    const isOpen = casinoWss?.readyState === WebSocket.OPEN
    res.status(200).json({ success: true, isOpen })
  })

  app.listen(port, () => {
    console.log(`server app on port ${port}`)
  })
};

appStart()
