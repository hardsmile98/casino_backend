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
const tables = require('./constants/tables')

function appStart () {
  // * Global values * //
  const resultGames = {}
  let wsTables = {}
  let sessionId = ''

  const wssServer = new WebSocket.Server({ server })

  wssServer.on('connection', ws => {
    const isOpenWebsokets = Object.values(wsTables)
      .filter((wsTable) => wsTable.readyState === WebSocket.OPEN).length > 0

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
      const reconnect = 0

      connectToTable({
        table,
        sessionId,
        resultGames,
        wssServer,
        reconnect,
        wsTables
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
    Object.values(wsTables).forEach((wsTable) => {
      if (wsTable.readyState === WebSocket.OPEN) {
        wsTable.close()
      }
    })

    wsTables = {}
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

  app.get('/api/infoTables', function (req, res) {
    const countOpenTables = Object.values(wsTables)
      .filter((wsTable) => wsTable.readyState === WebSocket.OPEN).length

    const response = {
      tables,
      targets: {
        all: tables.length,
        open: countOpenTables
      }
    }

    res.status(200).json({ success: true, data: response })
  })

  app.post('/api/reconnectAll', function (req, res) {
    closeAllTables()
    connectToAllTables()

    res.status(200).json({ success: true })
  })

  app.listen(port, () => {
    console.log(`server app on port ${port}`)
  })
};

appStart()
