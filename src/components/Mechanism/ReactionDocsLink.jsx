// The struct of each reaction type in the mechanism configuration docs.
const DOCS_URL = 'https://mechanismconfiguration.readthedocs.io/en/latest/api/index.html'
const DOCS_STRUCTS = {
  ARRHENIUS: 'Arrhenius',
  BRANCHED_NO_RO2: 'Branched',
  EMISSION: 'Emission',
  FIRST_ORDER_LOSS: 'FirstOrderLoss',
  LAMBDA_RATE_CONSTANT: 'LambdaRateConstant',
  PHOTOLYSIS: 'Photolysis',
  SURFACE: 'Surface',
  TERNARY_CHEMICAL_ACTIVATION: 'TernaryChemicalActivation',
  TROE: 'Troe',
  TUNNELING: 'Tunneling',
  USER_DEFINED: 'UserDefined',
}

// Anchor ids follow the Sphinx C++ domain's mangling: namespace, the length of the name, the name.
const docsUrl = (struct) =>
  `${DOCS_URL}#_CPPv4N23mechanism_configuration5types${struct.length}${struct}E`

// A link to this reaction type in the mechanism configuration docs, for above the Add button.
export function ReactionDocsLink({ type }) {
  const struct = DOCS_STRUCTS[type]
  if (!struct) return null
  return (
    <p className="text-center text-sm text-muted">
      See{' '}
      <a
        href={docsUrl(struct)}
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
