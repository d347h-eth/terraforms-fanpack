#!/usr/bin/env python3
import re
from math import log2
from functools import reduce
from operator import xor
from pathlib import Path
import argparse

SRC_PATH = Path('../../src/PerlinNoise.sol')


def extract_function_body(source_text: str, function_name: str) -> str:
	start = source_text.find(f'function {function_name}(')
	if start == -1:
		raise RuntimeError(f'Could not find function {function_name} in source')
	brace_start = source_text.find('{', start)
	if brace_start == -1:
		raise RuntimeError(f'Could not find body start for {function_name}')

	depth = 0
	i = brace_start
	end = None
	while i < len(source_text):
		c = source_text[i]
		if c == '{':
			depth += 1
		elif c == '}':
			depth -= 1
			if depth == 0:
				end = i
				break
		i += 1

	if end is None:
		raise RuntimeError(f'Could not find body end for {function_name}')

	return source_text[brace_start + 1:end]


def parse_returns(body: str) -> list[int]:
	# Collect all numeric constants returned in this function body
	return [int(m.group(1)) for m in re.finditer(r'return\s+(\d+);', body)]


def low_bits_counts(values: list[int], bits: int) -> list[int]:
	mask = (1 << bits) - 1
	counts = [0] * (1 << bits)
	for v in values:
		counts[v & mask] += 1
	return counts


def shannon_entropy(values: list[int], alphabet_size: int = 256) -> float:
	# Entropy in bits per symbol
	hist = [0] * alphabet_size
	for v in values:
		hist[v % alphabet_size] += 1
	n = len(values)
	ent = 0.0
	for c in hist:
		if c:
			p = c / n
			ent -= p * log2(p)
	return ent


def serial_correlation(values: list[int]) -> float:
	n = len(values)
	if n < 2:
		return 0.0
	s1 = sum(values)
	s2 = sum(v * v for v in values)
	s3 = sum(values[i] * values[(i + 1) % n] for i in range(n))
	num = n * s3 - s1 * s1
	den = n * s2 - s1 * s1
	return num / den if den != 0 else 0.0


def autocorrelation(values: list[int], max_lag: int = 8) -> list[float]:
	res = []
	n = len(values)
	if n < 2:
		return [0.0] * max_lag
	s1 = sum(values)
	s2 = sum(v * v for v in values)
	den = n * s2 - s1 * s1
	for k in range(1, max_lag + 1):
		sk = sum(values[i] * values[(i + k) % n] for i in range(n))
		num = n * sk - s1 * s1
		res.append(num / den if den != 0 else 0.0)
	return res


def xor_sum(values: list[int]) -> int:
	return reduce(xor, values, 0)


def bit_ones_counts(values: list[int], width: int = 8) -> list[int]:
	counts = [0] * width
	for v in values:
		for b in range(width):
			if (v >> b) & 1:
				counts[b] += 1
	return counts


def chi_square(counts: list[int], expected: float) -> float:
	return sum(((c - expected) ** 2) / expected for c in counts)


def permutation_cycles(mapping: list[int]) -> list[int]:
	"""Return cycle lengths of permutation i -> mapping[i]."""
	n = len(mapping)
	visited = [False] * n
	cycles = []
	for i in range(n):
		if not visited[i]:
			length = 0
			j = i
			while not visited[j]:
				visited[j] = True
				j = mapping[j]
				length += 1
			cycles.append(length)
	return cycles


def plot_diagnostics(out_dir: Path, p_hi: list[int], p_lo: list[int], f_hi: list[int], f_lo: list[int]) -> None:
	try:
		import matplotlib
		matplotlib.use('Agg')
		import matplotlib.pyplot as plt
		import numpy as np
	except Exception as exc:
		print('Plotting skipped: matplotlib/numpy not available ->', exc)
		return

	out_dir.mkdir(parents=True, exist_ok=True)

	# 1) Permutation scatter i vs p_hi[i]
	plt.figure(figsize=(7, 5))
	plt.scatter(range(len(p_hi)), p_hi, s=8, alpha=0.6)
	plt.title('Permutation scatter: i vs p[i]')
	plt.xlabel('i')
	plt.ylabel('p[i]')
	plt.tight_layout()
	plt.savefig(out_dir / 'permutation_scatter.png', dpi=160)
	plt.close()

	# 1b) Permutation matrix heatmap (binary)
	mat = np.zeros((256, 256), dtype=np.uint8)
	for i, v in enumerate(p_hi):
		mat[v, i] = 1
	plt.figure(figsize=(6, 6))
	plt.imshow(mat, cmap='Greys', aspect='equal', interpolation='nearest', origin='lower')
	plt.title('Permutation matrix (row=p[i], col=i)')
	plt.xlabel('i')
	plt.ylabel('p[i]')
	plt.tight_layout()
	plt.savefig(out_dir / 'permutation_matrix.png', dpi=160)
	plt.close()

	# 2) Low-4-bit histogram
	c4 = low_bits_counts(p_hi, 4)
	plt.figure(figsize=(7, 4))
	plt.bar(range(16), c4)
	plt.title('Low-4-bit counts of p[i]')
	plt.xlabel('low 4-bit value')
	plt.ylabel('count')
	plt.tight_layout()
	plt.savefig(out_dir / 'low4bit_hist.png', dpi=160)
	plt.close()

	# 3) Bit ones per position
	ones = bit_ones_counts(p_hi, 8)
	plt.figure(figsize=(7, 4))
	plt.bar(range(8), ones)
	plt.title('Bit ones per position (p[i])')
	plt.xlabel('bit index (0=LSB)')
	plt.ylabel('ones count')
	plt.tight_layout()
	plt.savefig(out_dir / 'bit_ones.png', dpi=160)
	plt.close()

	# 4) Autocorrelation up to 32 lags
	ac = autocorrelation(p_hi, 32)
	plt.figure(figsize=(8, 4))
	plt.bar(range(1, 33), ac)
	plt.title('Autocorrelation (lags 1..32)')
	plt.xlabel('lag')
	plt.ylabel('corr')
	plt.tight_layout()
	plt.savefig(out_dir / 'autocorr.png', dpi=160)
	plt.close()

	# 5) Cycle length distribution
	cycles = permutation_cycles(p_hi)
	from collections import Counter
	cnt = Counter(cycles)
	lens = sorted(cnt)
	vals = [cnt[l] for l in lens]
	plt.figure(figsize=(8, 4))
	plt.bar([str(l) for l in lens], vals)
	plt.title('Permutation cycle length distribution')
	plt.xlabel('cycle length')
	plt.ylabel('count')
	plt.tight_layout()
	plt.savefig(out_dir / 'cycle_lengths.png', dpi=160)
	plt.close()

	# 6) ftable curves
	plt.figure(figsize=(8, 4))
	plt.plot(f_hi, label='ftable hi (>>12)')
	plt.plot(f_lo, label='ftable lo (&0xfff)')
	plt.title('Fade table samples')
	plt.xlabel('index')
	plt.ylabel('value (0..4095)')
	plt.legend()
	plt.tight_layout()
	plt.savefig(out_dir / 'ftable_curves.png', dpi=160)
	plt.close()

	# 7) Displacement plots: d[i] = ((p[i] - i + 128) % 256) - 128
	d = [((v - i + 128) % 256) - 128 for i, v in enumerate(p_hi)]
	plt.figure(figsize=(8, 4))
	plt.plot(d)
	plt.title('Displacement d[i] = p[i] - i (wrapped to [-128,127])')
	plt.xlabel('i')
	plt.ylabel('d[i]')
	plt.tight_layout()
	plt.savefig(out_dir / 'displacement_line.png', dpi=160)
	plt.close()

	plt.figure(figsize=(7, 4))
	plt.hist(d, bins=33, range=(-132, 132))
	plt.title('Displacement histogram')
	plt.xlabel('d')
	plt.ylabel('count')
	plt.tight_layout()
	plt.savefig(out_dir / 'displacement_hist.png', dpi=160)
	plt.close()

	# 8) FFT spectra of p[i] and displacement
	p_arr = np.array(p_hi, dtype=float)
	p_arr -= p_arr.mean()
	D = np.array(d, dtype=float)
	D -= D.mean()
	P = np.fft.rfft(p_arr)
	F = np.fft.rfft(D)
	freqs = np.fft.rfftfreq(len(p_arr), d=1.0)
	plt.figure(figsize=(8, 4))
	plt.plot(freqs, np.abs(P))
	plt.title('FFT magnitude of p[i] (zero-mean)')
	plt.xlabel('frequency (cycles/sample)')
	plt.ylabel('|P(f)|')
	plt.tight_layout()
	plt.savefig(out_dir / 'fft_p.png', dpi=160)
	plt.close()

	plt.figure(figsize=(8, 4))
	plt.plot(freqs, np.abs(F))
	plt.title('FFT magnitude of displacement d[i] (zero-mean)')
	plt.xlabel('frequency (cycles/sample)')
	plt.ylabel('|D(f)|')
	plt.tight_layout()
	plt.savefig(out_dir / 'fft_disp.png', dpi=160)
	plt.close()


def main():
	parser = argparse.ArgumentParser()
	parser.add_argument('--plots', action='store_true', help='Generate plots to output directory')
	parser.add_argument('--outdir', default=str(Path('.')), help='Output directory for plots')
	args = parser.parse_args()

	src = SRC_PATH.read_text()

	# Extract ptable
	ptable_body = extract_function_body(src, 'ptable')
	p_rets = parse_returns(ptable_body)
	if len(p_rets) != 256:
		raise AssertionError(f'ptable returns parsed != 256 (got {len(p_rets)})')

	p_hi = [(v >> 8) & 0xff for v in p_rets]  # p[i]
	p_lo = [v & 0xff for v in p_rets]         # p[i+1]

	print('ptable: entries:', len(p_rets))
	print('ptable: unique p_hi:', len(set(p_hi)))
	print('ptable: unique p_lo:', len(set(p_lo)))
	c2 = low_bits_counts(p_hi, 2)
	c4 = low_bits_counts(p_hi, 4)
	print('ptable: low-2bit counts (p_hi):', c2)
	print('ptable: low-4bit counts (p_hi):', c4)
	print('ptable: chi-square low-2bit:', round(chi_square(c2, expected=len(p_hi)/4), 4))
	print('ptable: chi-square low-4bit:', round(chi_square(c4, expected=len(p_hi)/16), 4))

	# Quick ASCII-ish scan for curiosity
	def ascii_map(bs):
		return ''.join(chr(b) if 32 <= b < 127 else '.' for b in bs)

	print('ptable p_hi ASCII-ish preview:')
	print(ascii_map(p_hi))
	print('ptable p_lo ASCII-ish preview:')
	print(ascii_map(p_lo))

	# Advanced stats
	print('ptable: entropy p_hi (bits/symbol):', round(shannon_entropy(p_hi), 6))
	print('ptable: entropy p_lo (bits/symbol):', round(shannon_entropy(p_lo), 6))
	print('ptable: serial correlation p_hi:', round(serial_correlation(p_hi), 6))
	print('ptable: serial correlation p_lo:', round(serial_correlation(p_lo), 6))
	print('ptable: autocorr lags 1..8 (p_hi):', [round(v, 4) for v in autocorrelation(p_hi, 8)])
	print('ptable: xor p_hi:', hex(xor_sum(p_hi)))
	print('ptable: xor p_lo:', hex(xor_sum(p_lo)))
	ones = bit_ones_counts(p_hi, 8)
	print('ptable: bit ones per position (p_hi) [b0..b7]:', ones)

	# Permutation cycles
	cycles = permutation_cycles(p_hi)
	cycles_sorted = sorted(cycles, reverse=True)
	print('ptable: permutation cycles count:', len(cycles))
	print('ptable: top 10 cycle lengths:', cycles_sorted[:10])
	print('ptable: min/median/max cycle length:', min(cycles_sorted), cycles_sorted[len(cycles_sorted)//2], max(cycles_sorted))

	# Extract ftable (monotonic samples of fade polynomial)
	ftable_body = extract_function_body(src, 'ftable')
	f_rets = parse_returns(ftable_body)
	if len(f_rets) != 256:
		raise AssertionError(f'ftable returns parsed != 256 (got {len(f_rets)})')

	f_hi = [(v >> 12) & 0xfff for v in f_rets]
	f_lo = [v & 0xfff for v in f_rets]

	# Monotonic checks (non-decreasing)
	def is_monotonic_non_decreasing(seq):
		return all(seq[i] <= seq[i+1] for i in range(len(seq)-1))

	print('ftable: entries:', len(f_rets))
	print('ftable: hi monotonic:', is_monotonic_non_decreasing(f_hi))
	print('ftable: lo monotonic:', is_monotonic_non_decreasing(f_lo))
	print('ftable: first/last hi values:', f_hi[0], f_hi[-1])
	print('ftable: first/last lo values:', f_lo[0], f_lo[-1])

	if args.plots:
		plot_diagnostics(Path(args.outdir), p_hi, p_lo, f_hi, f_lo)
		print('Plots saved to', args.outdir)


if __name__ == '__main__':
	main()
