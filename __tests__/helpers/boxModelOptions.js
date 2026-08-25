// Example mechanisms declare times in whichever unit suits them ([sec], [min], [hr], [hour],
// [day]). Redux always holds seconds. These mirror the conversion ExampleLoader performs, so a
// test fixture drives the solver with the same numbers the app would.

export const durationSeconds = (options = {}) => {
  if (options['simulation length [day]'] != null) return options['simulation length [day]'] * 86400
  if (options['simulation length [hour]'] != null) return options['simulation length [hour]'] * 3600
  if (options['simulation length [hr]'] != null) return options['simulation length [hr]'] * 3600
  return options['simulation length [sec]']
}

export const stepSeconds = (options = {}, label) => {
  if (options[`${label} [min]`] != null) return options[`${label} [min]`] * 60
  return options[`${label} [sec]`]
}
