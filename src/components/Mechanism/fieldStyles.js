// Styling shared by the species and reaction editors.

export const TEXT_INPUT =
  'w-full h-9 px-2 border border-border bg-white dark:bg-surface text-ink placeholder:text-gray-400 dark:placeholder:text-muted rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
export const TEXT_INPUT_SM =
  'h-9 px-2 border border-border bg-white dark:bg-surface text-ink placeholder:text-gray-400 dark:placeholder:text-muted rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

// Field label, shared by the species property fields and the reaction type forms.
export const FIELD_LABEL = 'block text-sm font-semibold text-ink mb-2'

// As TEXT_INPUT, a step down in type size, for the lambda-function textarea holding code.
export const TEXT_INPUT_CODE =
  'px-4 py-3 border-2 border-border bg-white dark:bg-surface text-ink placeholder:text-muted rounded-xl text-sm font-mono focus:outline-none focus:border-action'

// The add row at the top of the species and reaction tables.
export const ADD_INPUT = `w-full min-w-[6rem] ${TEXT_INPUT_SM.replace('text-center', 'text-left')}`
export const ADD_BUTTON =
  'border-0 bg-assist-secondary text-assist-secondary-foreground hover:bg-assist-secondary-hover hover:text-assist-secondary-foreground'

// Keep the list column fixed so only the list itself scrolls.
export const LIST_CARD = 'flex flex-col lg:h-[calc(100vh-10rem)] lg:min-h-[24rem]'

// A Mechanism editor: the Add card, then the table card. Above lg it takes the height that
// MechanismPage leaves below its tabs, so the page does not scroll and only the table scrolls
// inside its card.
export const EDITOR_COLUMN = 'flex flex-col gap-4 lg:min-h-0 lg:flex-1'
export const TABLE_CARD = 'flex min-h-0 flex-1 flex-col'
export const LIST_CARD_CONTENT = 'flex min-h-0 flex-1 flex-col'

// A UnitDropdown paired with a value input below it, e.g. mol m-3 / ppb concentration fields.
export const DROPDOWN_WRAPPER = 'relative w-full flex-shrink-0'
export const DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-9 px-2 border border-gray-300 dark:border-border rounded-lg text-sm text-gray-800 dark:text-ink hover:bg-gray-50 dark:hover:bg-surface-hover'
