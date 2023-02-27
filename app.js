require('dotenv').config()
const WebSocket = require('ws')
const express = require('express')
const { createServer } = require('http')
const cors = require('cors')
const app = express()
const port = 3030
const wssPort = 8030
const server = createServer(app).listen(wssPort)
const { connectToTable } = require('./connectToTable')

// * Переменные казино  *//
const tables = [
  // https://bey7pokerdom.com/slots/roulette-1-azure-583578
  {
    casinoUrl: 'gs5.pragmaticplaylive.net',
    tableId: 'g03y1t9vvuhrfytl'
  },
  // https://bey7pokerdom.com/slots/speed-roulette-1-559478
  {
    casinoUrl: 'gs5.pragmaticplaylive.net',
    tableId: 'fl9knouu0yjez2wi'
  },
  // https://bey7pokerdom.com/slots/auto-roulette-1-805778
  {
    casinoUrl: 'gs6.pragmaticplaylive.net',
    tableId: '5bzl2835s5ruvweg'
  },
  // https://bey7pokerdom.com/slots/roulette-a-768278
  {
    casinoUrl: 'gs5.pragmaticplaylive.net',
    tableId: '5kvxlw4c1qm3xcyn'
  },
  // https://bey7pokerdom.com/slots/roulette-4-russian-791878
  {
    casinoUrl: 'gs5.pragmaticplaylive.net',
    tableId: 't4jzencinod6iqwi'
  }
]

function appStart () {
  // * Global values * //
  const resultGames = {}
  let wsTables = []
  let sessionId = ''

  const wssServer = new WebSocket.Server({ server })

  wssServer.on('connection', ws => {
    wsTables.forEach(el => {
      console.log(el.wsTable.readyState)
    })
    const isOpenWebsokets = wsTables.filter(({ wsTable }) => wsTable.readyState === WebSocket.OPEN).length === tables.length

    if (!isOpenWebsokets) {
      ws.send(JSON.stringify({ event: 'noConnection' }))
      return
    }

    ws.send(JSON.stringify({
      event: 'init',
      data: resultGames
    }))
  })

  const connectToAllTables = () => {
    tables.forEach((table) => {
      const connect = { count: 0 }

      const wsTable = connectToTable({
        table,
        sessionId,
        resultGames,
        wssServer,
        wsTables,
        connect
      })

      wsTables.push({
        wsTable,
        tableId: table.tableId
      })
    })

    wssServer.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          event: 'connection'
        }))
      }
    })
  }

  const closeAllTables = () => {
    wsTables.forEach(({ wsTable }) => {
      if (wsTable.OPEN) {
        wsTable.close()
      }
    })

    wsTables = []
  }

  connectToAllTables()

  app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL
  }))
  app.use(express.json())

  app.post('/api/newSessionId', function (req, res) {
    const { body } = req
    const { sessionId: newId } = body

    console.log('newSessionId', newId)

    closeAllTables()

    sessionId = newId

    connectToAllTables()

    res.status(200).send({ success: true })
  })

  app.listen(port, () => {
    console.log(`server app on port ${port}`)
  })
};

appStart()
