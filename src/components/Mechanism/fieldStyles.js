// Styling shared by the species and reaction editors.

export const TEXT_INPUT =
  'w-full h-9 px-2 border border-border bg-white text-ink placeholder:text-gray-400 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'
export const TEXT_INPUT_SM =
  'h-9 px-2 border border-border bg-white text-ink placeholder:text-gray-400 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-action focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

// Field label, shared by the species property fields and the reaction type forms.
export const FIELD_LABEL = 'block text-sm font-semibold text-ink mb-2'

// As TEXT_INPUT, a step down in type size, for the lambda-function textarea holding code.
export const TEXT_INPUT_CODE =
  'px-4 py-3 border-2 border-border bg-white text-ink placeholder:text-muted rounded-xl text-sm font-mono focus:outline-none focus:border-action'

// The two editors sit side by side above lg and stack below it, where two columns would leave
// neither enough room.
export const EDITOR_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start'

// Keep the list column fixed so only the list itself scrolls.
export const LIST_CARD = 'flex flex-col lg:h-[calc(100vh-10rem)] lg:min-h-[24rem]'
export const LIST_CARD_CONTENT = 'flex min-h-0 flex-1 flex-col'

// Collapsed items wrap naturally; expanded items take a full row with w-full
export const ITEM_LIST =
  'flex min-h-0 flex-1 flex-wrap items-start content-start gap-2 overflow-y-auto'

// A collapsed item: the same pill language the property selectors use.
export const ITEM_CHIP =
  'flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-[15px] text-ink transition-colors hover:bg-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-assist-secondary-ring'

// An expanded item, occupying its own row.
export const ITEM_PANEL = 'w-full rounded-2xl border border-border bg-white p-4'

// A UnitDropdown paired with a value input below it, e.g. mol m-3 / ppb concentration fields.
export const DROPDOWN_WRAPPER = 'relative w-full flex-shrink-0'
export const DROPDOWN_BUTTON =
  'flex items-center gap-1 w-full h-9 px-2 border border-gray-300 rounded-lg text-sm text-gray-800 hover:bg-gray-50'
