// The page of each reaction type in the mechanism configuration docs.
const DOCS_URL = 'https://mechanismconfiguration.readthedocs.io/en/latest/v1/reactions'
const DOCS_PAGES = {
  ARRHENIUS: 'arrhenius',
  BRANCHED_NO_RO2: 'branched',
  EMISSION: 'emission',
  FIRST_ORDER_LOSS: 'first_order_loss',
  LAMBDA_RATE_CONSTANT: 'lambda_rate_constant',
  PHOTOLYSIS: 'photolysis',
  SURFACE: 'surface',
  TERNARY_CHEMICAL_ACTIVATION: 'ternary_chemical_activation',
  TROE: 'troe',
  TUNNELING: 'tunneling',
  USER_DEFINED: 'user_defined',
}

// A link to this reaction type in the mechanism configuration docs, for above the Add button.
export function ReactionDocsLink({ type }) {
  const page = DOCS_PAGES[type]
  if (!page) return null
  return (
    <p className="text-center text-sm text-muted">
      See{' '}
      <a
        href={`${DOCS_URL}/${page}.html`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-action underline hover:text-action-hover"
      >
        here
      </a>{' '}
      for more information
    </p>
  )
}
