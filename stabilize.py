import cv2
import numpy as np
import sys

INPUT  = "calibration_trimmed.mp4"
OUTPUT = "calibration_stable.mp4"

cap = cv2.VideoCapture(INPUT)
if not cap.isOpened():
    sys.exit("Could not open " + INPUT)

fps    = cap.get(cv2.CAP_PROP_FPS)
width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

print(f"Video: {width}x{height} @ {fps:.1f}fps  {total} frames")

# ── Pass 1: accumulate per-frame transforms ────────────────────────────────
print("Pass 1: analysing motion...")

ok, prev = cap.read()
prev_gray = cv2.cvtColor(prev, cv2.COLOR_BGR2GRAY)

transforms = []   # list of (dx, dy, da) — translation + rotation

for i in range(1, total):
    ok, frame = cap.read()
    if not ok:
        break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Detect good features in previous frame and track them
    pts = cv2.goodFeaturesToTrack(prev_gray, maxCorners=300, qualityLevel=0.01,
                                  minDistance=20, blockSize=7)
    if pts is None or len(pts) < 10:
        transforms.append((0.0, 0.0, 0.0))
        prev_gray = gray
        continue

    pts2, status, _ = cv2.calcOpticalFlowPyrLK(prev_gray, gray, pts, None)
    good_prev = pts [status.ravel() == 1]
    good_next = pts2[status.ravel() == 1]

    if len(good_prev) < 5:
        transforms.append((0.0, 0.0, 0.0))
        prev_gray = gray
        continue

    m, _ = cv2.estimateAffinePartial2D(good_prev, good_next)
    if m is None:
        transforms.append((0.0, 0.0, 0.0))
    else:
        dx = m[0, 2]
        dy = m[1, 2]
        da = np.arctan2(m[1, 0], m[0, 0])
        transforms.append((dx, dy, da))

    prev_gray = gray
    if (i % 100) == 0:
        print(f"  {i}/{total}")

cap.release()

# ── Smooth transforms with a rolling average ──────────────────────────────
print("Smoothing...")

SMOOTH   = 200   # window radius — larger = smoother (was 30)
CROP_PCT = 0.05  # crop this fraction from each edge to hide warped borders

transforms = np.array(transforms, dtype=np.float64)
trajectory = np.cumsum(transforms, axis=0)   # running sum = cumulative motion

def moving_avg(x, r):
    k = 2 * r + 1
    pad = np.pad(x, (r, r), mode='edge')
    return np.convolve(pad, np.ones(k) / k, mode='valid')[:len(x)]

smooth_traj = np.stack([
    moving_avg(trajectory[:, 0], SMOOTH),
    moving_avg(trajectory[:, 1], SMOOTH),
    moving_avg(trajectory[:, 2], SMOOTH),
], axis=1)

correction = smooth_traj - trajectory   # what we need to add back each frame

# ── Pass 2: apply corrections and write output ─────────────────────────────
print("Pass 2: writing stabilised video...")

cx0 = int(width  * CROP_PCT)
cy0 = int(height * CROP_PCT)
out_w = width  - 2 * cx0
out_h = height - 2 * cy0

cap = cv2.VideoCapture(INPUT)
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out = cv2.VideoWriter(OUTPUT, fourcc, fps, (out_w, out_h))

for i in range(total):
    ok, frame = cap.read()
    if not ok:
        break

    if i < len(correction):
        dx, dy, da = correction[i]
    else:
        dx, dy, da = 0.0, 0.0, 0.0

    cx, cy = width / 2, height / 2
    M = np.array([
        [np.cos(da), -np.sin(da), (1 - np.cos(da)) * cx + np.sin(da) * cy + dx],
        [np.sin(da),  np.cos(da), (1 - np.cos(da)) * cy - np.sin(da) * cx + dy],
    ], dtype=np.float64)

    stabilised = cv2.warpAffine(frame, M, (width, height),
                                flags=cv2.INTER_LINEAR,
                                borderMode=cv2.BORDER_REPLICATE)
    cropped = stabilised[cy0:cy0+out_h, cx0:cx0+out_w]
    out.write(cropped)

    if (i % 100) == 0:
        print(f"  {i}/{total}")

cap.release()
out.release()
print("Done →", OUTPUT)
