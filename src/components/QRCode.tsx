import { create } from 'qrcode/lib/core/qrcode';
import { useMemo } from 'react';
import { View } from 'react-native';
import { PALETTE } from '../lib/theme';

/**
 * QR code drawn with plain Views (no native modules, works in Expo Go and the browser).
 * Always black on white with a quiet zone so phone cameras read it in dark mode too.
 */
export default function QRCode({ value, size = 260 }: { value: string; size?: number }) {
  const rows = useMemo(() => {
    const q = create(value, { errorCorrectionLevel: 'M' });
    const n = q.modules.size;
    const out: { y: number; runs: [number, number][] }[] = [];
    for (let y = 0; y < n; y++) {
      const runs: [number, number][] = [];
      let start = -1;
      for (let x = 0; x <= n; x++) {
        const dark = x < n && !!q.modules.get(y, x);
        if (dark && start < 0) start = x;
        if (!dark && start >= 0) {
          runs.push([start, x - start]);
          start = -1;
        }
      }
      out.push({ y, runs });
    }
    return { n, out };
  }, [value]);

  const quiet = 4;
  const cell = size / (rows.n + quiet * 2);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={`QR code for ${value}`}
      style={{ width: size, height: size, backgroundColor: PALETTE.chalk, borderRadius: 8 }}
    >
      {rows.out.map((r) =>
        r.runs.map(([x, len]) => (
          <View
            key={`${r.y}-${x}`}
            style={{
              position: 'absolute',
              left: (x + quiet) * cell,
              top: (r.y + quiet) * cell,
              width: len * cell + 0.5,
              height: cell + 0.5,
              backgroundColor: PALETTE.carbon,
            }}
          />
        )),
      )}
    </View>
  );
}
