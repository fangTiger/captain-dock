export type ProductionResponseFacts = Readonly<{
  isMainFrameNavigation: boolean
  parsedUrl?: URL
  requestHeaders: Readonly<Record<string, string>>
  resourceType: string
  responseHeaders: Readonly<Record<string, string>>
  status: number
  url: string
}>

export type ProductionResponsePolicy = Readonly<{
  allowDocument404?: boolean
  baseURL?: string
  expectedUnknownPath?: string
}>

export type ProductionResponseClassification = Readonly<{
  error?: string
  expectedUnknownRsc404: boolean
  shouldReadScriptBody: boolean
}>

type TrustedUnknownRoute = Readonly<{
  origin: string
  path: string
}>

function headerValue(headers: Readonly<Record<string, string>>, name: string) {
  const expectedName = name.toLowerCase()

  for (const [headerName, value] of Object.entries(headers)) {
    if (headerName.toLowerCase() === expectedName) {
      return value
    }
  }

  return undefined
}

function resolveTrustedUnknownRoute(
  policy: ProductionResponsePolicy,
): TrustedUnknownRoute | undefined {
  if (
    policy.allowDocument404 !== true ||
    !policy.baseURL ||
    !policy.expectedUnknownPath ||
    !policy.expectedUnknownPath.startsWith('/') ||
    policy.expectedUnknownPath.includes('?') ||
    policy.expectedUnknownPath.includes('#')
  ) {
    return undefined
  }

  try {
    const baseUrl = new URL(policy.baseURL)

    if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
      return undefined
    }

    const expectedUrl = new URL(policy.expectedUnknownPath, baseUrl)

    if (
      expectedUrl.origin !== baseUrl.origin ||
      expectedUrl.pathname !== policy.expectedUnknownPath ||
      expectedUrl.search ||
      expectedUrl.hash
    ) {
      return undefined
    }

    return {
      origin: baseUrl.origin,
      path: expectedUrl.pathname,
    }
  } catch {
    return undefined
  }
}

function isExpectedMainDocument404(
  facts: ProductionResponseFacts,
  trustedRoute: TrustedUnknownRoute | undefined,
) {
  if (!facts.parsedUrl || !trustedRoute) {
    return false
  }

  return (
    facts.status === 404 &&
    facts.resourceType === 'document' &&
    facts.isMainFrameNavigation &&
    facts.parsedUrl.origin === trustedRoute.origin &&
    facts.parsedUrl.pathname === trustedRoute.path &&
    facts.parsedUrl.search === '' &&
    facts.parsedUrl.hash === ''
  )
}

function isExpectedUnknownRouteRsc404(
  facts: ProductionResponseFacts,
  trustedRoute: TrustedUnknownRoute | undefined,
) {
  if (
    facts.status !== 404 ||
    facts.resourceType !== 'fetch' ||
    !facts.parsedUrl ||
    facts.parsedUrl.origin !== trustedRoute?.origin ||
    facts.parsedUrl.pathname !== trustedRoute.path
  ) {
    return false
  }

  const rscToken = facts.parsedUrl.searchParams.get('_rsc')
  const contentType = headerValue(facts.responseHeaders, 'content-type')

  return (
    Boolean(rscToken?.trim()) &&
    headerValue(facts.requestHeaders, 'rsc') === '1' &&
    headerValue(facts.requestHeaders, 'next-router-prefetch') === '1' &&
    headerValue(facts.requestHeaders, 'next-url') === '/_not-found' &&
    Boolean(headerValue(facts.requestHeaders, 'next-router-segment-prefetch')?.trim()) &&
    /^text\/x-component(?:\s*;|$)/i.test(contentType ?? '')
  )
}

function resolveTrustedOrigin(baseURL: string | undefined) {
  if (!baseURL) {
    return undefined
  }

  try {
    const parsedBaseUrl = new URL(baseURL)

    return parsedBaseUrl.protocol === 'http:' || parsedBaseUrl.protocol === 'https:'
      ? parsedBaseUrl.origin
      : undefined
  } catch {
    return undefined
  }
}

export function classifyProductionResponse(
  facts: ProductionResponseFacts,
  policy: ProductionResponsePolicy,
): ProductionResponseClassification {
  const trustedRoute = resolveTrustedUnknownRoute(policy)
  const expectedMainDocument404 = isExpectedMainDocument404(facts, trustedRoute)
  const expectedUnknownRsc404 = isExpectedUnknownRouteRsc404(facts, trustedRoute)

  if (facts.status >= 400 && !expectedMainDocument404 && !expectedUnknownRsc404) {
    return {
      error: `${facts.resourceType} ${facts.status} ${facts.url}`,
      expectedUnknownRsc404,
      shouldReadScriptBody: false,
    }
  }

  if (facts.status < 400 && facts.resourceType === 'script') {
    if (!facts.parsedUrl) {
      return {
        error: `script url invalid ${facts.url}`,
        expectedUnknownRsc404,
        shouldReadScriptBody: false,
      }
    }

    return {
      expectedUnknownRsc404,
      shouldReadScriptBody:
        facts.parsedUrl.origin === resolveTrustedOrigin(policy.baseURL),
    }
  }

  return {
    expectedUnknownRsc404,
    shouldReadScriptBody: false,
  }
}
