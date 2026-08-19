from pathlib import Path
import json
import math

FILES = {
    'official_input': Path('/home/ubuntu/lutcalc-redesign/test-fixtures/fujifilm/gfx-eterna-55/FLog_to_ETERNA_33grid_V.1.00.cube'),
    'original': Path('/home/ubuntu/lutcalc-redesign/test-fixtures/fujifilm/original-output/_LUT.cube'),
    'redesign': Path('/home/ubuntu/lutcalc-redesign/test-fixtures/fujifilm/app-output/_LUT.cube'),
}

def parse(path):
    headers = []
    values = []
    for raw in path.read_text(errors='replace').splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith('#') or line.startswith('TITLE') or line.startswith('LUT_') or line.startswith('DOMAIN_'):
            headers.append(line)
            continue
        parts = line.split()
        if len(parts) == 3:
            try:
                values.append(tuple(float(x) for x in parts))
            except ValueError:
                pass
    return headers, values

parsed = {name: parse(path) for name, path in FILES.items()}
report = {}
for name, (headers, values) in parsed.items():
    report[name] = {
        'path': str(FILES[name]),
        'bytes': FILES[name].stat().st_size,
        'headers': headers[:20],
        'value_count': len(values),
        'first_values': values[:3],
        'last_values': values[-3:],
    }

orig = parsed['original'][1]
redesign = parsed['redesign'][1]
if len(orig) == len(redesign) and orig:
    deltas = [abs(a - b) for x, y in zip(orig, redesign) for a, b in zip(x, y)]
    per_channel = []
    for c in range(3):
        cd = [abs(a[c] - b[c]) for a, b in zip(orig, redesign)]
        per_channel.append({'channel': c, 'max_abs': max(cd), 'mean_abs': sum(cd) / len(cd)})
    report['comparison'] = {
        'same_length': True,
        'exact_equal': orig == redesign,
        'max_abs_delta': max(deltas),
        'mean_abs_delta': sum(deltas) / len(deltas),
        'different_components': sum(1 for d in deltas if d != 0.0),
        'per_channel': per_channel,
        'sample_indices': {
            str(i): {'original': orig[i], 'redesign': redesign[i], 'delta': tuple(a-b for a,b in zip(orig[i], redesign[i]))}
            for i in [0, 1, len(orig)//2, len(orig)-2, len(orig)-1]
        },
    }
else:
    report['comparison'] = {'same_length': False, 'original_count': len(orig), 'redesign_count': len(redesign)}

print(json.dumps(report, ensure_ascii=False, indent=2))
