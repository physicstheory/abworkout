# AbWorkout

A sharp, single-purpose iPhone ab workout: **Workout #1**, ten moves, a natural-sounding voice coach, animated cartoon demos, and a work/cool-down timer that plays nicely with your own music.

**Moves:** Basic Crunch · Right Oblique Crunch · Left Oblique Crunch · Bicycle Crunch · Reverse Crunch · Long Arm Crunch · Crossover Crunch · Half Curl · Vertical Leg Crunch · Plank

## How a workout runs

1. **Get ready.** The coach says the first move's name while the animated coach demonstrates it.
2. **Beep, beep, beep, go.** Three countdown beeps, then a high beep starts the work timer (default 40 s).
3. **Switch.** When time's up, a low beep starts the cool-down (default 20 s) and the coach says the name of the next move, nothing else, while it plays on screen.
4. Repeat for all ten moves, then a finish chime and the summary screen.

Pause, skip and go back are on screen. Work, cool-down and get-ready lengths are in **Settings**. Tap any move on the home screen and choose **Hear coach** for a spoken form tip.

## The voice

The coach isn't your phone's text-to-speech. Every line was recorded ahead of time with **Kokoro**, an open-source neural voice model, and ships with the app as small MP3s. There are two coaches to choose from: **Heart** (default) and **Michael**. 
To change what the coach says, edit `scripts/lines.json` and run `scripts/generate_voice.py` (setup steps are at the top of that file).

## Get it on your iPhone (free)

This is a **web app you install to your Home Screen** (a PWA). That's how it stays free: no App Store, no $99/year Apple developer account, and no re-signing every 7 days like a sideloaded app.

### 1. Turn on hosting (one time, about 1 minute)

1. On GitHub, open this repo → **Settings → Pages**.
2. Under **Build and deployment → Source**, pick **GitHub Actions**.
3. Open **Actions → Deploy to GitHub Pages → Run workflow** (it also runs on every push).

Your app's address is **https://physicstheory.github.io/abworkout/**.

### 2. Install it

Open that link in **Safari**, tap **Share**, then **Add to Home Screen**. It gets its own icon and opens full screen with no browser bars.

### Opens instantly, every time

On first open, the app caches itself and every voice clip on the phone. After that it launches straight from storage, with no loading and no server wake-up, even in airplane mode. Home Screen apps are exempt from Safari's storage clean-up, so it stays fast weeks later. Updates download quietly in the background when you're online.

## Send it to friends

Tap the **Share** icon at the top of the home screen (or **Send the app to a friend** after a workout). That opens the iOS share sheet for Messages, AirDrop and so on, plus a **QR code** they can scan. They open the link in Safari and choose **Add to Home Screen**. That's all they need to do.

## Music and Bluetooth

- **Your music keeps playing.** Start Spotify, Apple Music or anything else, then open AbWorkout. The coach and beeps play on top of your music and never stop it.
- **Silent mode:** iPhone mutes app sounds that mix with music while Silent mode is on (the ring switch, or the Action button / Control Center on newer iPhones). If you can't hear the coach, turn Silent mode off.
- **Play on silent** (Settings): turn this on to hear the coach even in Silent mode. iPhone then pauses other music while the coach is active, so leave it off if you work out to music.
- **AirPods, headphones, car or Bluetooth speakers:** connect them in iPhone Settings → Bluetooth (or Control Center). The coach and your music both follow the phone's audio output automatically.

Note: iPhone doesn't let web apps talk directly to Bluetooth gadgets like heart-rate straps. That would need a native App Store app.

## Project layout

```
app/                 the web app (this folder is what gets hosted)
  index.html  css/  js/        UI, timer engine, animated coach
  audio/<voice>/*.mp3          pre-recorded coach lines
  sw.js                        offline cache
scripts/             voice script + generator
.github/workflows/   GitHub Pages deploy
```

To try it on a computer: `npx http-server app` and open the printed address.
