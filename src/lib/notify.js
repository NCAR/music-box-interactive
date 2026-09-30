// The project's toast conventions, in one place so every notification looks and reads the same.
//
// Variants:
//   invalidInput / error -> red     a value or action was rejected
//   success              -> green   a confirmation that something was done
//   warning              -> yellow  a limit, or a side effect the user should know about
//   removed              -> red     something was deleted
//   info                 -> blue    a neutral notice (the default style)
export const createNotify = (toast) => ({
  invalidInput: (description) => toast({ title: 'Invalid Input', description, variant: 'destructive' }),
  error: (title, description) => toast({ title, description, variant: 'destructive' }),
  success: (title, description) => toast({ title, description, variant: 'success' }),
  info: (title, description) => toast({ title, description }),
  warning: (title, description) => toast({ title, description, variant: 'warning' }),
  removed: (title, description) => toast({ title, description, variant: 'delete' }),
})
