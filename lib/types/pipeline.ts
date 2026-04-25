export type AssetStage =
  | 'uploaded'            // asset stored, nothing else done yet
  | 'reverse_searched'    // SerpAPI hits written as violations (stage='gated_pending')
  | 'gated'               // perceptual-filter gate applied to every violation
  | 'analyzing'           // Gemini classification in progress
  | 'complete'            // every violation terminal; asset is done
  | 'failed';             // asset-level unrecoverable error (rare)

export type ViolationStage =
  | 'gated_pending'       // created by reverse search, gate not yet run
  | 'gate_dropped'        // gate said DROPPED_LOW_SIM / DROPPED_NO_HASH; terminal
  | 'gate_passed'         // gate said forward=true; needs Jina + Gemini
  | 'scraped'             // Jina scrape complete; cached on the doc
  | 'classified'          // Gemini call complete; terminal
  | 'failed_retryable'    // transient failure; eligible for retry
  | 'failed_permanent';   // 4xx from Gemini / unreachable image after N attempts
