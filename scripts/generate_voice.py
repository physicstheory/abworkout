"""Pre-render every coaching line with the Kokoro neural voice model.

The app ships these recordings instead of using the phone's text-to-speech,
so the coach sounds like a person. Run this again after editing lines.json.

Setup (one time):
    python3 -m venv .tts && .tts/bin/pip install kokoro-onnx soundfile
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
    curl -LO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin

Usage:
    .tts/bin/python scripts/generate_voice.py --model kokoro-v1.0.onnx --voices voices-v1.0.bin
Requires ffmpeg on PATH (used to trim, loudness-normalise and encode MP3).
"""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
LINES = ROOT / "scripts" / "lines.json"
OUT = ROOT / "app" / "audio"


def encode(wav: Path, mp3: Path) -> None:
    # Trim leading/trailing silence, even out loudness, encode small mono MP3.
    filters = (
        "silenceremove=start_periods=1:start_threshold=-50dB,"
        "areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,"
        "apad=pad_dur=0.08,loudnorm=I=-14:TP=-1.5:LRA=7"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-af", filters,
         "-ar", "44100", "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "64k", str(mp3)],
        check=True,
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--voices", required=True)
    args = ap.parse_args()

    spec = json.loads(LINES.read_text())
    kokoro = Kokoro(args.model, args.voices)
    manifest = {"voices": {}, "clips": {}}

    for clip, variants in spec["clips"].items():
        manifest["clips"][clip] = len(variants)

    with tempfile.TemporaryDirectory() as tmp:
        for vid, voice in spec["voices"].items():
            manifest["voices"][vid] = voice["label"]
            (OUT / vid).mkdir(parents=True, exist_ok=True)
            for clip, variants in spec["clips"].items():
                for i, text in enumerate(variants):
                    samples, rate = kokoro.create(text, voice=voice["kokoro"], speed=voice["speed"], lang="en-us")
                    wav = Path(tmp) / "line.wav"
                    sf.write(wav, samples, rate)
                    encode(wav, OUT / vid / f"{clip}_{i}.mp3")
                    print(f"{vid}/{clip}_{i}: {text}")

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
