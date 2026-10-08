# Interview / Portfolio Notes

## 30-second explanation

“I built GhostMode Sentinel because traditional OSINT tools can collect a lot of data but still leave the analyst with the hardest part: deciding what matters and proving where it came from. Sentinel normalizes public observations into an evidence ledger, correlates entities with provenance, scores exposure with an explainable heuristic, diffs snapshots over time, and exports STIX/JSON reports. It is passive-by-default and designed for authorized defensive research.”

## Why not just use a graph?

A graph is a visualization. Sentinel treats the underlying observation as the primary object. An edge without provenance is a hypothesis; an edge with supporting evidence can be reviewed.

## Why confidence?

Different sources have different reliability and freshness. Confidence allows the analyst to distinguish a direct public observation from a weaker inferred relationship.

## Why STIX?

It provides an interoperability path for downstream threat-intelligence workflows instead of trapping the investigation inside one UI.
