### Perlin Noise Tables Audit Report

#### Summary
- **No anomalies found**: `ptable` is a full 0–255 permutation; `ftable` is monotonic and well-formed.
- **Uniformity**: Low bits perfectly uniform; each bit has 128 ones. Entropy = 8.0 bits/symbol.
- **Structure tests**: Serial/autocorrelation are near 0; FFT shows no dominant tones; cycle lengths look typical.
- **Conclusion**: No evidence of steganographic or hidden data in the lookup tables.

#### Plots
- Can be generated with `--plots` flag: permutation scatter/matrix, low-bit hist, bit-ones, autocorr, cycle lengths, fade curves, displacement (line + hist), FFT of `p[i]` and displacement.

#### The script output
```
ptable: entries: 256
ptable: unique p_hi: 256
ptable: unique p_lo: 256
ptable: low-2bit counts (p_hi): [64, 64, 64, 64]
ptable: low-4bit counts (p_hi): [16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16]
ptable: chi-square low-2bit: 0.0
ptable: chi-square low-4bit: 0.0
ptable p_hi ASCII-ish preview:
...[Z...._`5.....$g.E..c%........x.K...>^...u#. 9.!X..8W..}...D.J.G..0..M...So.z<....i\)7..(.f.6A.?...PI.L...Y
......t..V.dm....@4...|{..&.v~.RU...;./.:....*....w...,..F..e..+....'..blnOq....ph..a.."..........Q3.....k1...
..j..T..sy2-.......].rC..H....NB.=..
ptable p_lo ASCII-ish preview:
..[Z...._`5.....$g.E..c%........x.K...>^...u#. 9.!X..8W..}...D.J.G..0..M...So.z<....i\)7..(.f.6A.?...PI.L...Y.
.....t..V.dm....@4...|{..&.v~.RU...;./.:....*....w...,..F..e..+....'..blnOq....ph..a.."..........Q3.....k1....
.j..T..sy2-.......].rC..H....NB.=...
ptable: entropy p_hi (bits/symbol): 8.0
ptable: entropy p_lo (bits/symbol): 8.0
ptable: serial correlation p_hi: 0.003212
ptable: serial correlation p_lo: 0.003212
ptable: autocorr lags 1..8 (p_hi): [0.0032, 0.0112, 0.0767, -0.1073, -0.0912, 0.0209, 0.0053, -0.0065]
ptable: xor p_hi: 0x0
ptable: xor p_lo: 0x0
ptable: bit ones per position (p_hi) [b0..b7]: [128, 128, 128, 128, 128, 128, 128, 128]
ptable: permutation cycles count: 9
ptable: top 10 cycle lengths: [121, 89, 15, 12, 6, 4, 4, 4, 1]
ptable: min/median/max cycle length: 1 6 121
ftable: entries: 256
ftable: hi monotonic: True
ftable: lo monotonic: True
ftable: first/last hi values: 0 4095
ftable: first/last lo values: 0 4095
Plots saved to .
```
