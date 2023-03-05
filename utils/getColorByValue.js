const redValues = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]

const getColorByValue = (value) => {
  switch (true) {
    case value === 0:
      return 'green'
    case redValues.includes(value):
      return 'red'
    default:
      return 'black'
  }
}

module.exports = { getColorByValue }
