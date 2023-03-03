const request = require('request')
const WebSocket = require('ws')

const gamesCount = 20
const RECONNECT_TIMEOUT = 1000 * 10

// Получение данных из стола
function connectToTable ({
  table,
  sessionId,
  resultGames,
  wssServer,
  reconnect,
  wsTables
}) {
  const { casinoUrl, tableId } = table || {}

  const wsUrl = `wss://${casinoUrl}/game?JSESSIONID=${sessionId}&tableId=${tableId}`
  const getHistoryUrl = `https://${casinoUrl}/api/ui/statisticHistory?tableId=${tableId}&numberOfGames=${gamesCount}&JSESSIONID=${sessionId}`

  const ws = new WebSocket(wsUrl, {})

  const sendGames = () => {
    console.log('send games')

    try {
      request(
        getHistoryUrl,
        (_err, _response, body) => {
          const json = JSON.parse(body)
          const results = json?.history?.map(game => game?.gameResult)

          resultGames[tableId] = results

          // Отсылаем результаты игр на клиент через сокет
          wssServer.clients.forEach(function each (client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                event: 'games',
                tableId,
                data: results
              }))
            }
          })
        }
      )
    } catch (error) {
      console.log(error)
    }
  }

  const reconnected = () => {
    delete wsTables[tableId]

    connectToTable({
      table,
      sessionId,
      resultGames,
      wssServer,
      wsTables
    })

    reconnect++
  }

  ws.onclose = () => {
    if (reconnect === 0) {
      reconnected()
      return
    }

    if (reconnect === 1) {
      setTimeout(() => {
        reconnected()
      }, RECONNECT_TIMEOUT)
    }
  }

  ws.onopen = () => {
    sendGames()

    wsTables[tableId] = ws
  }

  ws.onerror = () => {}

  ws.on('message', (data) => {
    const chank = data.toString().replace(/^\d+/, '')
    if (chank !== '') {
      // выпадение числа
      const isEndGame = chank.includes('zoomOut')

      if (isEndGame) {
        reconnect = 0

        sendGames()

        ws.send('<ping />')
      }
    }
  })

  return ws
}

module.exports = { connectToTable }
