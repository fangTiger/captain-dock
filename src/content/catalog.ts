import type { Ecosystem, Project } from './types'

export const ecosystems = [
  {
    slug: 'arc',
    name: 'Arc',
    index: '01',
    statement: 'A settlement-aware laboratory for agents, markets, and forecasts.',
    description:
      'Arc brings together projects for paid AI calls, onchain asset issuance, and prediction markets, with an emphasis on the loop from user action to a verifiable settlement record.',
    theme: {
      accent: '#7dd3fc',
      surface: '#07111f',
      glow: 'rgba(125, 211, 252, 0.45)',
      motif: 'orbital-circuit',
    },
    scenePreset: 'arc-orbit',
    seo: {
      title: 'Arc Projects | Captain Dock',
      description: 'A collection of Arc projects: SIGNAL/LEDGER, HADRON, and ArcPredict.',
    },
  },
  {
    slug: 'rialo',
    name: 'Rialo',
    index: '02',
    statement: 'A reactive protection system for real-world triggers.',
    description:
      'Rialo organizes flight monitoring, protection purchase, delay detection, automated settlement, and evidence-based explanation into a readable product experience.',
    theme: {
      accent: '#fbbf24',
      surface: '#18110a',
      glow: 'rgba(251, 191, 36, 0.38)',
      motif: 'reactive-radar',
    },
    scenePreset: 'rialo-radar',
    seo: {
      title: 'Rialo Projects | Captain Dock',
      description: 'A Rialo Captain flight protection case study from the Rialo ecosystem.',
    },
  },
] as const satisfies readonly Ecosystem[]

export const projects = [
  {
    slug: 'signal-ledger',
    ecosystem: 'arc',
    name: 'SIGNAL/LEDGER',
    tagline: 'Budgets, payments, and receipt records for agent calls.',
    statement: 'Every autonomous action leaves a receipt worth trusting.',
    summary:
      'SIGNAL/LEDGER breaks a paid AI call into a budget, payment source, generated report, and receipt record so agent activity can be reviewed beyond the chat transcript.',
    status: ['TESTNET', 'EXPERIMENTAL'],
    liveUrl: 'https://arc-signal-ledger.vercel.app/',
    roles: ['Product design', 'Frontend engineering', 'Settlement flow'],
    tags: ['AI Agents', 'Usage receipt', 'Payment rail'],
    coreLoop: [
      {
        label: 'Set budget',
        description: 'The user sets a visible budget for a research task or call before the agent begins.',
      },
      {
        label: 'Select payment source',
        description: 'The interface places available balance, payment source, and call context together for review.',
      },
      {
        label: 'Pay for call',
        description: 'The call records payment intent, execution status, and traceable transaction cues.',
      },
      {
        label: 'Generate report',
        description: 'The research result appears beside its payment context for a grounded review of the call.',
      },
      {
        label: 'Record receipt',
        description: 'The call summary, amount status, and evidence are assembled into a reviewable receipt record.',
      },
    ],
    evidence: [
      {
        label: 'Research workspace',
        description: 'Shows the budget, research request, and agent run state with data used for the demo flow.',
        status: 'DEMO',
      },
      {
        label: 'TX Feed',
        description: 'Uses testnet transaction cues to show where a paid call occurs without claiming mainnet revenue.',
        status: 'TESTNET',
      },
      {
        label: 'Receipt view',
        description: 'Places the call result and payment evidence in one file for review.',
        status: 'EXPERIMENTAL',
      },
    ],
    stack: [
      {
        lane: 'Interface',
        items: ['Next.js', 'React', 'Transaction feed UI'],
      },
      {
        lane: 'Data/Realtime',
        items: ['Agent run state', 'Budget state', 'Receipt timeline'],
      },
      {
        lane: 'Settlement/Trust',
        items: ['Testnet payment trace', 'Receipt record', 'User-confirmed spend'],
      },
      {
        lane: 'AI/Operations',
        items: ['Research agent framing', 'Report generation', 'Human-readable audit trail'],
      },
    ],
    gallery: [
      {
        src: '/projects/arc/signal-ledger/live-research.webp',
        alt: 'SIGNAL/LEDGER live research interface with budget, agent status, and transaction record areas.',
        caption: 'The live research interface shows how an agent call connects a budget, payment, and receipt.',
      },
    ],
    limits: [
      'The content represents demo and testnet experiments; it does not claim real revenue or mainnet settlement volume.',
      'The external project opens independently, and this site does not probe its availability during builds.',
      'The receipt is presented as a product evidence format; its final trust level depends on the deployed network and transaction source.',
    ],
    theme: {
      accent: '#38bdf8',
      aura: 'rgba(56, 189, 248, 0.22)',
      motif: 'ledger',
    },
    seo: {
      title: 'SIGNAL/LEDGER | Arc Project',
      description: 'An Arc case study for agent-call budgets, payment sources, research reports, and receipt records.',
      image: '/projects/arc/signal-ledger/live-research.webp',
    },
  },
  {
    slug: 'hadron',
    ecosystem: 'arc',
    name: 'HADRON',
    tagline: 'An onchain asset issuance, order book, and USDC settlement experiment.',
    statement: 'Issue the asset. Watch the market find its price.',
    summary:
      'HADRON connects issuance, quotes, trades, settlement, and position views in an asset-market prototype that makes each market action legible to participants.',
    status: ['TESTNET', 'EXPERIMENTAL'],
    liveUrl: 'https://arc-hadron.vercel.app/',
    roles: ['Market UX', 'Frontend engineering', 'Protocol interaction design'],
    tags: ['Asset issuance', 'Order book', 'USDC settlement'],
    coreLoop: [
      {
        label: 'Issue asset',
        description: 'Creates a tradable asset with explicit supply, price discovery, and participation conditions.',
      },
      {
        label: 'Place order / bid',
        description: 'Buyers and sellers express price intent through an order book that exposes depth and pending states.',
      },
      {
        label: 'Match trade',
        description: 'A successful match reveals the trade record, order source, and state change.',
      },
      {
        label: 'Settle in USDC',
        description: 'Settlement emphasizes the stablecoin amount, participants, and testnet context.',
      },
      {
        label: 'Review position / yield',
        description: 'The position view lets users review assets, displayed yield changes, and available next actions.',
      },
    ],
    evidence: [
      {
        label: 'Market list',
        description: 'Shows issued assets and market entry points with values presented as demo or test-environment examples.',
        status: 'DEMO',
      },
      {
        label: 'Order book',
        description: 'Explains the interaction structure for orders, bids, and depth without claiming real liquidity.',
        status: 'EXPERIMENTAL',
      },
      {
        label: 'Settlement and positions',
        description: 'Shows how post-trade USDC settlement and position changes are visualized in a testnet context.',
        status: 'TESTNET',
      },
    ],
    stack: [
      {
        lane: 'Interface',
        items: ['Market list', 'Order book surface', 'Position dashboard'],
      },
      {
        lane: 'Data/Realtime',
        items: ['Quote state', 'Trade timeline', 'Portfolio state'],
      },
      {
        lane: 'Settlement/Trust',
        items: ['USDC settlement framing', 'Testnet transaction states', 'Order audit trail'],
      },
      {
        lane: 'AI/Operations',
        items: ['No autonomous trading claims', 'Operator-facing market explanation'],
      },
    ],
    gallery: [
      {
        src: '/projects/arc/hadron/hadron-market.webp',
        alt: 'HADRON market interface showing the asset list, order book, and settlement areas.',
        caption: 'The market interface shows the product path from issuance and orders to trades and positions.',
      },
    ],
    limits: [
      'Market depth, trades, and yield content are for demo and testnet explanation, not real investment results.',
      'No investment advice is provided; the page describes only the product and interaction structure.',
      'The external project opens independently; this site does not embed or copy the full application.',
    ],
    theme: {
      accent: '#a78bfa',
      aura: 'rgba(167, 139, 250, 0.2)',
      motif: 'market',
    },
    seo: {
      title: 'HADRON | Arc Project',
      description: 'An Arc case study for onchain issuance, order books, trades, USDC settlement, and position views.',
      image: '/projects/arc/hadron/hadron-market.webp',
    },
  },
  {
    slug: 'arcpredict',
    ecosystem: 'arc',
    name: 'ArcPredict',
    tagline: 'Prediction markets, challenge windows, and a claim path.',
    statement: 'Uncertainty becomes a market before it becomes a decision.',
    summary:
      'ArcPredict follows a prediction market from opening and participation through outcome proposal, challenge or confirmation, and claim, clarifying the boundary between probability, disputes, and final settlement.',
    status: ['TESTNET', 'EXPERIMENTAL'],
    liveUrl: 'https://web-arcpredict.vercel.app/',
    roles: ['Prediction market UX', 'Frontend engineering', 'Settlement boundary design'],
    tags: ['Prediction market', 'Oracle flow', 'Challenge window'],
    coreLoop: [
      {
        label: 'Open market',
        description: 'Creates a prediction market with a clear question, deadline, and settlement conditions.',
      },
      {
        label: 'Place prediction',
        description: 'The user takes a position while the interface shows odds, funds, and risk cues.',
      },
      {
        label: 'Propose outcome',
        description: 'After the market closes, an outcome proposal waits for confirmation or challenge.',
      },
      {
        label: 'Challenge / confirm',
        description: 'The dispute window makes clear why a proposed result can be challenged or confirmed.',
      },
      {
        label: 'Claim',
        description: 'After confirmation, eligible users enter the claim path for the corresponding outcome.',
      },
    ],
    evidence: [
      {
        label: 'Market home',
        description: 'Shows available prediction markets and status labels with demo-context amounts and probabilities.',
        status: 'DEMO',
      },
      {
        label: 'Oracle path',
        description: 'Shows how outcome proposal and confirmation states are presented to users.',
        status: 'EXPERIMENTAL',
      },
      {
        label: 'Challenge window',
        description: 'Highlights the boundary of challenge and confirmation so AI explanation is not mistaken for final adjudication.',
        status: 'TESTNET',
      },
    ],
    stack: [
      {
        lane: 'Interface',
        items: ['Market cards', 'Betting state', 'Claim flow'],
      },
      {
        lane: 'Data/Realtime',
        items: ['Market lifecycle', 'Odds display', 'Challenge window state'],
      },
      {
        lane: 'Settlement/Trust',
        items: ['Oracle proposal', 'Challenge confirmation', 'Claim eligibility'],
      },
      {
        lane: 'AI/Operations',
        items: ['AI Lens explanation', 'Human-readable risk framing', 'No final settlement authority'],
      },
    ],
    gallery: [
      {
        src: '/projects/arc/arcpredict/crypto-home.webp',
        alt: 'ArcPredict prediction-market home showing market cards, probabilities, and participation entry points.',
        caption: 'The market home shows the full state line from opening and participation to outcome proposal and claim.',
      },
    ],
    limits: [
      'AI does not participate in final settlement; it only helps explain markets, risks, and states.',
      'Market and probability data are shown in a demo or testnet context and are not investment advice.',
      'Claim eligibility depends on the external project contracts and deployment state.',
    ],
    theme: {
      accent: '#22d3ee',
      aura: 'rgba(34, 211, 238, 0.18)',
      motif: 'probability',
    },
    seo: {
      title: 'ArcPredict | Arc Project',
      description: 'An Arc case study for opening a prediction market, participating, proposing outcomes, resolving challenges, and claiming.',
      image: '/projects/arc/arcpredict/crypto-home.webp',
    },
  },
  {
    slug: 'rialo-captain',
    ecosystem: 'rialo',
    name: 'Rialo Captain',
    tagline: 'Flight-delay protection from observation and trigger to automated settlement.',
    statement: 'Disruption becomes evidence, settlement, and a clear next move.',
    summary:
      'Rialo Captain organizes flight-risk observation, protection purchase, delay detection, automated settlement, and evidence explanation in a reactive protection console.',
    status: ['DEMO', 'EXPERIMENTAL'],
    liveUrl: 'https://captain-rialo.vercel.app/login',
    roles: ['Insurance-like flow design', 'Frontend engineering', 'Evidence UX'],
    tags: ['Flight risk', 'Reactive settlement', 'Evidence copilot'],
    coreLoop: [
      {
        label: 'Observe flight',
        description: 'The user begins with flight risk, timing, and status cues to assess whether protection is relevant.',
      },
      {
        label: 'Purchase cover',
        description: 'The purchase step shows the protection scope, trigger conditions, and demo amount.',
      },
      {
        label: 'Detect delay',
        description: 'Flight-status changes act as trigger cues that explain how delay conditions are observed.',
      },
      {
        label: 'Settle automatically',
        description: 'After a trigger, the interface shows the automated settlement path and current state without repeated refreshes.',
      },
      {
        label: 'Review evidence and AI explanation',
        description: 'Flight evidence, settlement state, and AI explanation appear together to clarify why the trigger occurred.',
      },
    ],
    evidence: [
      {
        label: 'Flight risk panel',
        description: 'Shows flights, risk, and protection entry points with flight and amount data presented as demo examples.',
        status: 'DEMO',
      },
      {
        label: 'Protection purchase path',
        description: 'Explains the interface structure for scope, trigger conditions, and purchase state.',
        status: 'EXPERIMENTAL',
      },
      {
        label: 'Evidence / Copilot',
        description: 'Shows how evidence and AI explanation help users understand delay triggers and settlement reasons.',
        status: 'DEMO',
      },
    ],
    stack: [
      {
        lane: 'Interface',
        items: ['Flight dashboard', 'Coverage purchase flow', 'Evidence timeline'],
      },
      {
        lane: 'Data/Realtime',
        items: ['Flight observation state', 'Delay trigger state', 'Settlement timeline'],
      },
      {
        lane: 'Settlement/Trust',
        items: ['Coverage condition', 'Reactive settlement', 'Evidence-backed explanation'],
      },
      {
        lane: 'AI/Operations',
        items: ['Copilot explanation', 'Operational summary', 'No hidden claim adjudication'],
      },
    ],
    gallery: [
      {
        src: '/projects/rialo/rialo-captain/rialo-tower.webp',
        alt: 'Rialo Captain flight protection interface showing flight risk, protection, and evidence explanation areas.',
        caption: 'The flight protection interface shows the reactive path through observation, purchase, detection, settlement, and explanation.',
      },
    ],
    limits: [
      'Flights, amounts, and settlement states are presented as DEMO content and do not claim real insurance underwriting outcomes.',
      'AI explanation helps interpret evidence and does not replace final protection terms or settlement rules.',
      'The external project handles sign-in; this site does not copy its authentication flow.',
    ],
    theme: {
      accent: '#f59e0b',
      aura: 'rgba(245, 158, 11, 0.2)',
      motif: 'flight',
    },
    seo: {
      title: 'Rialo Captain | Rialo Project',
      description: 'A Rialo case study for flight observation, protection purchase, delay detection, automated settlement, and evidence explanation.',
      image: '/projects/rialo/rialo-captain/rialo-tower.webp',
    },
  },
] as const satisfies readonly Project[]
