# Audits

One file per audit pass, named `YYYY-MM-DD-<auditor>-<subject>.md`.

Each records what was measured, the command that produced each number, what was
put in scope for a fix, and what was deliberately left alone and why. Audits are
kept after the work lands: the "out of scope" section is the part worth rereading
later, and a finding that was declined once should not be rediscovered from
scratch.

Written by whichever agent ran the pass — see the auditor in the filename.
