// Styling shared by the species and reaction editors.

// Text inputs in two sizes: a roomy variant for the add forms,
// and a compact one for search boxes and per-item value fields.
export const TEXT_INPUT =
  'w-full px-4 py-3 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-xl text-base font-mono focus:outline-none focus:border-green-700'
export const TEXT_INPUT_SM =
  'px-3 py-2 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-lg text-sm font-mono focus:outline-none focus:border-green-700'

// Field label, shared by the species property fields and the reaction type forms.
export const FIELD_LABEL = 'block text-sm font-semibold text-gray-700 mb-2'

// As TEXT_INPUT, a step down in type size, for the lambda-function textarea holding code.
export const TEXT_INPUT_CODE =
  'px-4 py-3 border-2 border-gray-400 bg-white/10 text-gray-900 placeholder:text-gray-500 rounded-xl text-sm font-mono focus:outline-none focus:border-green-700'

// The two editors sit side by side above lg and stack below it, where two columns would leave
// neither enough room.
export const EDITOR_GRID = 'grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start'

// Keep the list column fixed so only the list scrolls within its card.
// Size it to the viewport rather than a fixed height; 10rem accounts for surrounding editor chrome.
// min-h keeps it usable on short viewports, allowing the page to scroll when needed.
export const LIST_CARD = 'flex flex-col lg:h-[calc(100vh-10rem)] lg:min-h-[24rem]'
export const LIST_CARD_CONTENT = 'flex min-h-0 flex-1 flex-col'

// Collapsed items flow and wrap; an expanded one takes a full row via `w-full`.
export const ITEM_LIST = 'flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto'

// A collapsed item: the same pill language the property selectors use.
export const ITEM_CHIP =
  'flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-4 py-2 text-[15px] font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500'

// An expanded item, occupying its own row.
export const ITEM_PANEL = 'w-full rounded-2xl border border-gray-300 bg-white p-4'
