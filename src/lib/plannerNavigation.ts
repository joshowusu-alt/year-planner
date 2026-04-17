export const PLANNER_PRINT_REQUEST_EVENT = 'stratum:planner-print-request'

export function requestPlannerPrintExport(): void {
  window.dispatchEvent(new Event(PLANNER_PRINT_REQUEST_EVENT))
}
