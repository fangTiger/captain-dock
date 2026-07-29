'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type SceneErrorBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  onFailure?: (error: Error) => void
}

type SceneErrorBoundaryState = {
  failed: boolean
}

export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = {
    failed: false,
  }

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return {
      failed: true,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo)
    this.props.onFailure?.(error)
  }

  render() {
    if (this.state.failed) {
      return this.props.fallback
    }

    return this.props.children
  }
}
