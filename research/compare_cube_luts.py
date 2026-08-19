import json
import sys
from pathlib import Path

import numpy as np


def load_cube(path: Path):
    title = ''
    size = 0
    rows = []
    for raw in path.read_text(errors='replace').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('TITLE'):
            title = line[5:].strip().strip('"')
            continue
        if line.startswith('LUT_3D_SIZE'):
            size = int(line.split()[-1])
            continue
        parts = line.split()
        if len(parts) >= 3:
            try:
                rows.append([float(parts[0]), float(parts[1]), float(parts[2])])
            except ValueError:
                pass
    data = np.asarray(rows, dtype=np.float64)
    expected = size ** 3
    if not size or len(data) != expected:
        raise ValueError(f'{path.name}: expected {expected or "known"} 3D rows, got {len(data)}')
    return {'path': str(path), 'title': title, 'size': size, 'data': data}


def index(size: int, r: int, g: int, b: int):
    return (r * size * size) + (g * size) + b


def sample(data: np.ndarray, size: int, rgb):
    coords = [round(value * (size - 1)) for value in rgb]
    return data[index(size, *coords)].tolist()


def main():
    if len(sys.argv) != 3:
        raise SystemExit('Usage: compare_cube_luts.py <original.cube> <replica.cube>')
    original = load_cube(Path(sys.argv[1]))
    replica = load_cube(Path(sys.argv[2]))
    if original['size'] != replica['size']:
        raise ValueError(f'grid mismatch: {original["size"]} vs {replica["size"]}')
    delta = replica['data'] - original['data']
    absolute = np.abs(delta)
    size = original['size']
    gray_inputs = [0.0, 0.1875, 0.375, 0.5, 0.75, 1.0]
    gray = []
    for value in gray_inputs:
        ref = sample(original['data'], size, (value, value, value))
        out = sample(replica['data'], size, (value, value, value))
        gray.append({'input': value, 'original': ref, 'replica': out, 'mae': float(np.mean(np.abs(np.asarray(out) - np.asarray(ref))))})
    patches = {'black': (0, 0, 0), 'white': (1, 1, 1), 'red': (1, 0, 0), 'green': (0, 1, 0), 'blue': (0, 0, 1), 'yellow': (1, 1, 0), 'warm_mid': (0.75, 0.35, 0.12), 'foliage': (0.25, 0.65, 0.35), 'sky': (0.4, 0.65, 0.95)}
    patch_report = {name: {'original': sample(original['data'], size, rgb), 'replica': sample(replica['data'], size, rgb)} for name, rgb in patches.items()}
    for item in patch_report.values():
        item['mae'] = float(np.mean(np.abs(np.asarray(item['replica']) - np.asarray(item['original']))) )
    report = {
        'original': {'path': original['path'], 'title': original['title'], 'grid': size},
        'replica': {'path': replica['path'], 'title': replica['title'], 'grid': size},
        'metrics': {
            'mae': float(np.mean(absolute)),
            'rmse': float(np.sqrt(np.mean(delta ** 2))),
            'median_absolute_error': float(np.median(absolute)),
            'p95_absolute_error': float(np.percentile(absolute, 95)),
            'max_absolute_error': float(np.max(absolute)),
            'signed_bias_rgb': np.mean(delta, axis=0).tolist(),
            'within_1_8bit_code': float(np.mean(absolute <= (1 / 255))),
            'within_5_8bit_codes': float(np.mean(absolute <= (5 / 255))),
        },
        'gray': gray,
        'patches': patch_report,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
