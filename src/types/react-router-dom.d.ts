declare module 'react-router-dom' {
  import type { ReactNode } from 'react'

  export interface Location {
    pathname: string
    search: string
    hash: string
    state: unknown
    key: string
  }

  export function HashRouter(props: { children?: ReactNode }): ReactNode
  export function Routes(props: { children?: ReactNode }): ReactNode
  export function Route(props: { path?: string; element?: ReactNode }): ReactNode
  export function Navigate(props: { to: string; replace?: boolean }): ReactNode
  export function useLocation(): Location
  export function useNavigate(): (to: string, options?: { replace?: boolean; state?: unknown }) => void
}
